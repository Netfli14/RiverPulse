import { BLE_COMMAND, BLE_SERVICE, BLE_TELEMETRY, TelemetryDecoder, type Telemetry } from "./robot-protocol";

export interface GattCharacteristic extends EventTarget {
  value?: DataView; properties:{read?:boolean};
  startNotifications():Promise<GattCharacteristic>; stopNotifications():Promise<GattCharacteristic>;
  readValue():Promise<DataView>; writeValueWithResponse(value:Uint8Array):Promise<void>;
}
export interface BleDevice extends EventTarget {
  name?:string; gatt?:{connected:boolean;connect():Promise<{getPrimaryService(id:string):Promise<{getCharacteristic(id:string):Promise<GattCharacteristic>}>}>;disconnect():void};
}
export interface BluetoothAdapter { requestDevice(options:unknown):Promise<BleDevice> }
export class RobotBluetoothClient {
  private device:BleDevice|null=null;
  private characteristic:GattCharacteristic|null=null;
  private command:GattCharacteristic|null=null;
  private decoder=new TelemetryDecoder();
  private onDisconnected=()=>{this.cleanup();this.disconnected()};
  private onValue=(event:Event)=>{
    const value=(event.target as GattCharacteristic).value;
    if(!value)return;
    try{this.decoder.push(value).forEach(packet=>this.receive(packet))}
    catch{this.error("invalid_packet")}
  };
  constructor(private receive:(packet:Telemetry)=>void,private disconnected:()=>void,private error:(code:string)=>void){}
  async connect(adapter:BluetoothAdapter) {
    this.disconnect();
    this.device=await adapter.requestDevice({filters:[{services:[BLE_SERVICE]},{namePrefix:"RiverPulse"}],optionalServices:[BLE_SERVICE]});
    this.device.addEventListener("gattserverdisconnected",this.onDisconnected);
    try {
      if(!this.device.gatt)throw new Error("gatt_unavailable");
      const server=await this.device.gatt.connect();
      const service=await server.getPrimaryService(BLE_SERVICE);
      this.characteristic=await service.getCharacteristic(BLE_TELEMETRY);
      this.command=await service.getCharacteristic(BLE_COMMAND);
      this.characteristic.addEventListener("characteristicvaluechanged",this.onValue);
      await this.characteristic.startNotifications();
      return this.device.name??"RiverPulse RC-01";
    } catch(error) { this.disconnect(); throw error; }
  }
  async stop(id:string) {
    if(!this.device?.gatt?.connected||!this.command)throw new Error("not_connected");
    // Fits the default 20-byte BLE payload. Firmware replies with matching ack.id.
    await this.command.writeValueWithResponse(new TextEncoder().encode("STOP:"+id));
    return id;
  }
  private cleanup() {
    this.characteristic?.removeEventListener("characteristicvaluechanged",this.onValue);
    this.device?.removeEventListener("gattserverdisconnected",this.onDisconnected);
    this.characteristic=null;this.command=null;this.decoder.reset();
  }
  disconnect() { this.cleanup();this.device?.gatt?.disconnect();this.device=null; }
}
