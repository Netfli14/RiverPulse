#pragma once
// Copy to config.h locally. This file contains no credentials.
const char* WIFI_SSID="";
const char* WIFI_PASSWORD="";
const char* SITE_URL=""; // HTTPS site origin, no trailing slash.
const char* INGEST_TOKEN=""; // Same value as server ROBOT_INGEST_TOKEN, 32+ characters.
const char* ROOT_CA=""; // PEM root CA for the actual HTTPS deployment certificate chain.
// Wire the motor driver's enable pin. Keep -1 until actual wiring is confirmed.
const int MOTOR_ENABLE_PIN=-1;
const int MOTOR_DISABLED_LEVEL=LOW;
