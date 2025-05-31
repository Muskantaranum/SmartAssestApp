#include <BluetoothSerial.h>
#include "HX711.h"

BluetoothSerial SerialBT;  // Bluetooth Serial object

// HX711 Pins and Calibration
#define DOUT 2
#define SCK 4
#define CALIBRATION_FACTOR 240.64

// IR Sensor Pin
#define IR_SENSOR 15

// Objects
HX711 scale;

// Function to read sensors and format data
String getSensorData() {
  float weight = scale.get_units(10);
  int presence = digitalRead(IR_SENSOR);
  
  // IR Sensor Logic:
  // LOW (0) = Object Detected (IR beam blocked)
  // HIGH (1) = No Object (IR beam not blocked)
  String presenceStatus = (presence == LOW) ? "Object Detected" : "No Object";
  
  // Format the data string
  String data = "Weight: " + String(weight, 2) + " g, Object: " + presenceStatus;
  return data;
}

void setup() {
  // Initialize Serial communication
  Serial.begin(115200);
  Serial.println("🚀 Starting Smart Scale...");

  // Initialize Bluetooth
  if(!SerialBT.begin("ESP32_Scale_BT")) {
    Serial.println("❌ Bluetooth initialization failed!");
    while(1);
  }
  Serial.println("✅ Bluetooth started");
  Serial.println("📱 Pair with device: ESP32_Scale_BT");

  // Initialize sensors
  Serial.println("Initializing sensors...");
  scale.begin(DOUT, SCK);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare();
  Serial.println("✅ Scale calibrated");

  pinMode(IR_SENSOR, INPUT);
  Serial.println("✅ IR sensor initialized");
  
  Serial.println("System ready! 📊");
}

void loop() {
  // Get sensor data
  String data = getSensorData();
  
  // Print to Serial Monitor
  Serial.println(data);
  
  // Send data over Bluetooth if connected
  if (SerialBT.connected()) {
    SerialBT.println(data);
  }

  delay(1000);  // Update every 1 second
} 