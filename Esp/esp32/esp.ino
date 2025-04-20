#include <WiFi.h>
#include <HTTPClient.h>
#include <Arduino_JSON.h>

// === Pin Definitions for ESP32 ===
const int airQualityPin = 34;      // ADC1_6 — any ESP32 analog-capable pin
const int buzzerPin = 13;

const int relayPins[4] = {5, 18, 19, 21};  // Adjust as per your setup

// Track relay states (LOW = ON for active LOW relays)
bool relayState[4] = {false, false, false, false};
bool buzzerState = false;

// === WiFi & Supabase Configuration ===
const char* ssid = "PocoX6pro";       // Replace with your WiFi SSID
const char* password = "aaaaaaaa";  // Replace with your WiFi password

// Supabase credentials from supabase.js file
const char* supabaseUrl = "https://lmkrpifbfbmasljrxthk.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxta3JwaWZiZmJtYXNsanJ4dGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzODU3MTMsImV4cCI6MjA1OTk2MTcxM30.lTHwm4dUAmAQMbg7C2EmhP9DPvfVOCnYrU4XjXx9psQ";

// Polling configuration
unsigned long lastCheckTime = 0;
const unsigned long checkInterval = 2000;

// Function declarations
void connectToWifi();
void fetchRelayBuzzerData();

void setup() {
  Serial.begin(115200);
  
  // Set up relay pins
  for (int i = 0; i < 4; i++) {
    pinMode(relayPins[i], OUTPUT);
    digitalWrite(relayPins[i], HIGH);  // Default OFF
  }
  
  // Setup buzzer pin
  pinMode(buzzerPin, OUTPUT);
  digitalWrite(buzzerPin, LOW); // Buzzer off by default
  
  // Connect to WiFi
  connectToWifi();
  
  // Initial fetch of relay and buzzer states
  fetchRelayBuzzerData();
  
  Serial.println("ESP32 system ready.");
}

void loop() {
  // Read and print sensor values periodically
  int airValue = analogRead(airQualityPin);
  Serial.print("Air Quality: ");
  Serial.println(airValue);
  
  // Check for relay/buzzer updates periodically
  unsigned long currentMillis = millis();
  if (currentMillis - lastCheckTime >= checkInterval) {
    lastCheckTime = currentMillis;
    fetchRelayBuzzerData();
  }
  
  delay(100); // Short delay for stability
}

// Connect to WiFi
void connectToWifi() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect to WiFi. Please check credentials.");
  }
}

// Fetch relay and buzzer data from Supabase
void fetchRelayBuzzerData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Reconnecting...");
    connectToWifi();
    return;
  }
  
  HTTPClient http;
  
  // Create the URL for the relay_buzzer table
  String url = String(supabaseUrl) + "/rest/v1/relay_buzzer?id=eq.main";
  
  Serial.print("Fetching data from: ");
  Serial.println(url);
  
  // Begin HTTP connection
  http.begin(url);
  
  // Add required headers
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  http.addHeader("Content-Type", "application/json");
  
  // Send GET request
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Response: " + response);
    
    // Parse JSON response
    JSONVar responseObj = JSON.parse(response);
    
    // Check if parsing succeeded
    if (JSON.typeof(responseObj) == "undefined") {
      Serial.println("JSON parsing failed!");
      http.end();
      return;
    }
    
    // Make sure we have data in the array
    if (responseObj.length() > 0) {
      // Update relay states
      for (int i = 0; i < 4; i++) {
        String pinKey = "pin" + String(i + 1);
        bool newState = responseObj[0][pinKey];
        
        // Only update if state has changed
        if (relayState[i] != newState) {
          relayState[i] = newState;
          digitalWrite(relayPins[i], relayState[i] ? LOW : HIGH);
          Serial.print("Relay ");
          Serial.print(i + 1);
          Serial.print(" set to ");
          Serial.println(relayState[i] ? "ON" : "OFF");
        }
      }
      
      // Update buzzer state
      bool newBuzzerState = responseObj[0]["buzz"];
      if (buzzerState != newBuzzerState) {
        buzzerState = newBuzzerState;
        digitalWrite(buzzerPin, buzzerState ? LOW : HIGH);
        Serial.print("Buzzer set to ");
        Serial.println(buzzerState ? "ON" : "OFF");
      }
    }
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}