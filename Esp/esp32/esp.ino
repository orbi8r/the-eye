#include <WiFi.h>
#include <HTTPClient.h>
#include <Arduino_JSON.h>
#include <Servo.h>

// === Pin Definitions for ESP32 ===
const int airQualityPin = 34;      // ADC1_6 — any ESP32 analog-capable pin
const int buzzerPin = 13;
const int servoPin = 22; // Define the servo pin

const int relayPins[4] = {5, 18, 19, 21};  // Adjust as per your setup

// Track relay states (LOW = ON for active LOW relays)
bool relayState[4] = {false, false, false, false};
bool buzzerState = false;
bool isServoOpen = false; // Track servo state (false = closed/0 deg, true = open/90 deg)

// Create Servo object
Servo myServo;

// === WiFi & Supabase Configuration ===
const char* ssid = "PocoX6pro";       // Replace with your WiFi SSID
const char* password = "aaaaaaaa";  // Replace with your WiFi password

// Supabase credentials from supabase.js file
const char* supabaseUrl = "https://lmkrpifbfbmasljrxthk.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxta3JwaWZiZmJtYXNsanJ4dGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzODU3MTMsImV4cCI6MjA1OTk2MTcxM30.lTHwm4dUAmAQMbg7C2EmhP9DPvfVOCnYrU4XjXx9psQ";

// Polling configuration
unsigned long lastCheckTime = 0;
const unsigned long checkInterval = 2000;

// Air quality monitoring configuration
unsigned long lastAirQualityTime = 0;
const unsigned long airQualityInterval = 30000; // 30 seconds

// Function declarations
void connectToWifi();
void fetchRelayBuzzerData();
void sendAirQualityData(int airQualityValue);

void setup() {
  Serial.begin(115200);
  
  // Set up relay pins
  for (int i = 0; i < 4; i++) {
    pinMode(relayPins[i], OUTPUT);
    digitalWrite(relayPins[i], HIGH);  // Default OFF for active-LOW relays
  }
  
  // Setup buzzer pin
  pinMode(buzzerPin, OUTPUT);
  digitalWrite(buzzerPin, HIGH); // Buzzer OFF for active-LOW
  
  // Attach servo motor
  myServo.attach(servoPin);
  myServo.write(0); // Initialize servo to closed position (0 degrees)
  Serial.println("Servo initialized to 0 degrees.");
  
  // Connect to WiFi
  connectToWifi();
  
  // Initial fetch of relay and buzzer states
  fetchRelayBuzzerData();
  
  Serial.println("ESP32 system ready.");
}

void loop() {
  unsigned long currentMillis = millis();
  
  // Check for relay/buzzer updates periodically
  if (currentMillis - lastCheckTime >= checkInterval) {
    lastCheckTime = currentMillis;
    fetchRelayBuzzerData();
  }
  
  // Monitor and send air quality data every 30 seconds
  if (currentMillis - lastAirQualityTime >= airQualityInterval) {
    lastAirQualityTime = currentMillis;
    
    // Read air quality data
    int airValue = analogRead(airQualityPin);
    Serial.print("Air Quality: ");
    Serial.println(airValue);
    
    // Send to Supabase
    sendAirQualityData(airValue);
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
    Serial.println("Raw Response: " + response); // Print raw response
    
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
      Serial.print("Received buzzer state from Supabase: ");
      Serial.println(newBuzzerState ? "true" : "false");
      Serial.print("Current local buzzer state: ");
      Serial.println(buzzerState ? "true" : "false");

      if (buzzerState != newBuzzerState) {
        buzzerState = newBuzzerState;
        int pinValue = buzzerState ? LOW : HIGH; // Active-LOW logic
        Serial.print("State changed. Writing to buzzerPin (");
        Serial.print(buzzerPin);
        Serial.print("): ");
        Serial.println(pinValue == LOW ? "LOW (ON)" : "HIGH (OFF)");
        digitalWrite(buzzerPin, pinValue);
        Serial.print("Buzzer state updated to: ");
        Serial.println(buzzerState ? "ON" : "OFF");
      } else {
        Serial.println("Buzzer state unchanged.");
      }

      // Update servo state
      bool newServoState = responseObj[0]["servo"]; // Read the 'servo' boolean value
      Serial.print("Received servo state from Supabase: ");
      Serial.println(newServoState ? "true (Open)" : "false (Closed)");
      Serial.print("Current local servo state: ");
      Serial.println(isServoOpen ? "true (Open)" : "false (Closed)");

      if (isServoOpen != newServoState) { // Check if the state has actually changed
        isServoOpen = newServoState; // Update the tracked state
        int angle = isServoOpen ? 90 : 0; // Determine target angle
        Serial.print("Servo state changed. Moving servo to ");
        Serial.print(angle);
        Serial.println(" degrees.");
        myServo.write(angle); // Move the servo
        Serial.print("Servo state updated to: ");
        Serial.println(isServoOpen ? "Open" : "Closed");
      } else {
        Serial.println("Servo state unchanged.");
      }
    }
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

// Send air quality data to Supabase
void sendAirQualityData(int airQualityValue) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Reconnecting...");
    connectToWifi();
    return;
  }
  
  HTTPClient http;
  
  // Create the URL for the air_quality table
  String url = String(supabaseUrl) + "/rest/v1/air_quality";
  
  Serial.print("Sending air quality data to: ");
  Serial.println(url);
  
  // Begin HTTP connection
  http.begin(url);
  
  // Add required headers
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal"); // Don't need the response body
  
  // Create JSON payload - use 'data' field as seen in supabase.js
  String jsonPayload = "{\"data\":" + String(airQualityValue) + "}";
  
  // Send POST request
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    Serial.print("Air quality data sent successfully, response code: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("Error sending air quality data, error code: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}