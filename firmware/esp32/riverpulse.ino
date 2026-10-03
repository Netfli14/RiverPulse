#include <Arduino.h>
#include <NimBLEDevice.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>
#include "config.h"

const char* SERVICE="7cba0001-6f4b-4a6b-8c22-f75a8af4b321";
const char* TELEMETRY="7cba0002-6f4b-4a6b-8c22-f75a8af4b321";
const char* COMMAND="7cba0003-6f4b-4a6b-8c22-f75a8af4b321";
NimBLECharacteristic* telemetry;
NimBLEServer* server;
uint32_t sequence=0,lastSample=0,lastUpload=0;
String bootId,ackId;
volatile bool stopRequested=false;
bool stopped=false,ackOk=false;

// Wire your actual sensors here. Never insert example or random readings.
// Omitted JSON fields stay blank on the website.
void readSensors(JsonDocument& packet) {
  packet["temperature"]=temperatureRead(); // Actual ESP32 internal temperature, not water temperature.
  // Add calibrated drivers for ph, waterTemperature, turbidity, oxygen,
  // conductivity, battery, container, collectedKg and gps {lat,lng}.
}

bool stopMotors() {
  if(MOTOR_ENABLE_PIN<0)return false; // Do not claim success when the actuator is not wired.
  digitalWrite(MOTOR_ENABLE_PIN,MOTOR_DISABLED_LEVEL);
  return digitalRead(MOTOR_ENABLE_PIN)==MOTOR_DISABLED_LEVEL;
}
class ServerCallbacks:public NimBLEServerCallbacks {
  void onDisconnect(NimBLEServer*,NimBLEConnInfo&,int) override {
    stopRequested=true; // Link-loss fail-safe when motors are attached.
    NimBLEDevice::startAdvertising();
  }
};
class CommandCallbacks:public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* chr,NimBLEConnInfo&) override {
    const auto incoming=chr->getValue();String command(incoming.c_str());
    if(command.startsWith("STOP:")&&command.length()==13){ackId=command.substring(5);stopRequested=true;}
  }
};
void notifyJson(const String& text) {
  if(!server->getConnectedCount())return;
  const String framed=text+"\n";
  // 20-byte chunks work even before the browser negotiates a larger MTU.
  for(size_t pos=0;pos<framed.length();pos+=20){
    size_t count=min((size_t)20,framed.length()-pos);
    telemetry->setValue((const uint8_t*)framed.c_str()+pos,count);
    if(!telemetry->notify())break;
    delay(12);
  }
}
void upload(const String& packet){
  if(!strlen(SITE_URL)||!strlen(INGEST_TOKEN)||!strlen(ROOT_CA)||WiFi.status()!=WL_CONNECTED)return;
  WiFiClientSecure tls;tls.setCACert(ROOT_CA); // Certificate validation is required; no setInsecure().
  HTTPClient http;http.setTimeout(4000);
  if(http.begin(tls,String(SITE_URL)+"/api/robots/rc-01/telemetry")){
    http.addHeader("Content-Type","application/json");http.addHeader("Authorization",String("Bearer ")+INGEST_TOKEN);
    int result=http.POST(packet);Serial.printf("Telemetry upload HTTP %d\n",result);http.end();
  }
}
void setup(){
  Serial.begin(115200);bootId=String(esp_random(),HEX);
  if(MOTOR_ENABLE_PIN>=0){pinMode(MOTOR_ENABLE_PIN,OUTPUT);digitalWrite(MOTOR_ENABLE_PIN,MOTOR_DISABLED_LEVEL);}
  NimBLEDevice::init("RiverPulse-RC-01");NimBLEDevice::setMTU(185);
  server=NimBLEDevice::createServer();server->setCallbacks(new ServerCallbacks());
  auto service=server->createService(SERVICE);
  telemetry=service->createCharacteristic(TELEMETRY,NIMBLE_PROPERTY::NOTIFY);
  auto command=service->createCharacteristic(COMMAND,NIMBLE_PROPERTY::WRITE);
  command->setCallbacks(new CommandCallbacks());service->start();
  auto advertising=NimBLEDevice::getAdvertising();advertising->addServiceUUID(SERVICE);advertising->setName("RiverPulse-RC-01");advertising->start();
  if(strlen(WIFI_SSID)){WiFi.begin(WIFI_SSID,WIFI_PASSWORD);WiFi.setAutoReconnect(true);configTime(0,0,"pool.ntp.org","time.google.com");}
}
void loop(){
  if(stopRequested){stopRequested=false;ackOk=stopMotors();if(ackOk)stopped=true;}
  uint32_t now=millis();if(now-lastSample>=1000){
    lastSample=now;JsonDocument packet;packet["robotId"]="rc-01";packet["bootId"]=bootId;packet["seq"]=sequence++;
    packet["status"]=stopped?"stopped":"idle";readSensors(packet);
    time_t utc=time(nullptr);if(utc>1700000000){struct tm tm;gmtime_r(&utc,&tm);char stamp[25];strftime(stamp,sizeof(stamp),"%Y-%m-%dT%H:%M:%SZ",&tm);packet["measuredAt"]=stamp;}
    if(ackId.length()){packet["ack"]["id"]=ackId;packet["ack"]["command"]="stop";packet["ack"]["ok"]=ackOk;}
    String json;serializeJson(packet,json);notifyJson(json);Serial.println(json);
    if(now-lastUpload>=5000){lastUpload=now;upload(json);}
    ackId="";
  }
  delay(5);
}
