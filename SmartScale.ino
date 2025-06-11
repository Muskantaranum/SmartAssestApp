#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include "HX711.h"

// Pins
#define DOUT 2
#define SCK 4
#define IR_SENSOR 15
#define CALIBRATION_FACTOR 233

// BLE Service and Characteristic UUIDs
#define SERVICE_UUID "91bad492-b950-4226-aa2b-4ede9fa42f59"
#define CHARACTERISTIC_UUID "cba1d466-344c-4be3-ab3f-189f80dd7518"

// Constants
#define RECONNECTION_DELAY 5000  // 5 seconds
#define SENSOR_READ_TIMEOUT 1000  // 1 second
#define MAX_RETRIES 3

HX711 scale;
BLECharacteristic* pCharacteristic;
bool deviceConnected = false;
unsigned long lastReconnectionAttempt = 0;
unsigned long lastSensorRead = 0;

// BLE Callbacks
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("📱 Device connected!");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("📱 Device disconnected!");
    // Start advertising again
    BLEDevice::startAdvertising();
  }
};

// Function to read sensors and format data with error handling
String getSensorData() {
  static int retryCount = 0;
  float weight = 0;
  
  // Read weight with timeout
  if (scale.wait_ready_timeout(1000)) {
    weight = scale.get_units(10);
    retryCount = 0;  // Reset retry count on successful read
  } else {
    Serial.println("⚠️ Load cell not ready!");
    retryCount++;
    if (retryCount >= MAX_RETRIES) {
      Serial.println("❌ Load cell error after multiple retries");
      weight = -999.99;  // Error value
    }
  }

  int presence = digitalRead(IR_SENSOR);
  String presenceStatus = (presence == LOW) ? "Object Detected" : "No Object";
  
  return "Weight: " + String(weight, 2) + " g, Object: " + presenceStatus;
}

void setup() {
  Serial.begin(115200);
  Serial.println("🚀 Starting Smart BLE Scale...");

  // Load cell setup with error checking
  if (!scale.begin(DOUT, SCK)) {
    Serial.println("❌ Load cell initialization failed!");
    while(1);  // Halt if load cell fails
  }
  
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare();
  pinMode(IR_SENSOR, INPUT);
  Serial.println("✅ Sensors initialized");

  // BLE Setup
  BLEDevice::init("ESP32_Scale_BLE");
  BLEServer* pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902());

  pService->start();
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->start();

  Serial.println("✅ BLE ready. Connect to ESP32_Scale_BLE");
}

void loop() {
  unsigned long currentMillis = millis();

  // Read sensors only every SENSOR_READ_TIMEOUT milliseconds
  if (currentMillis - lastSensorRead >= SENSOR_READ_TIMEOUT) {
    String data = getSensorData();
    Serial.println(data);

    if (deviceConnected) {
      pCharacteristic->setValue(data.c_str());
      pCharacteristic->notify();
    }
    lastSensorRead = currentMillis;
  }

  // Handle BLE reconnection
  if (!deviceConnected && (currentMillis - lastReconnectionAttempt >= RECONNECTION_DELAY)) {
    BLEDevice::startAdvertising();
    lastReconnectionAttempt = currentMillis;
    Serial.println("🔄 Attempting to reconnect...");
  }

  // Power management - could add deep sleep here if needed
  // esp_deep_sleep_start();
} 