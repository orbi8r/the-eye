#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// Replace with your network credentials
const char* ssid     = "PocoX6pro";
const char* password = "aaaaaaaa";

// Supabase configuration
const char* supabase_url = "https://lmkrpifbfbmasljrxthk.supabase.co/storage/v1/object/images/";
const char* supabase_anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxta3JwaWZiZmJtYXNsanJ4dGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzODU3MTMsImV4cCI6MjA1OTk2MTcxM30.lTHwm4dUAmAQMbg7C2EmhP9DPvfVOCnYrU4XjXx9psQ";

// Camera configuration (for AI Thinker ESP32-CAM)
#define PWDN_GPIO_NUM    32
#define RESET_GPIO_NUM   -1
#define XCLK_GPIO_NUM     0
#define SIOD_GPIO_NUM    26
#define SIOC_GPIO_NUM    27

#define Y9_GPIO_NUM      35
#define Y8_GPIO_NUM      34
#define Y7_GPIO_NUM      39
#define Y6_GPIO_NUM      36
#define Y5_GPIO_NUM      21
#define Y4_GPIO_NUM      19
#define Y3_GPIO_NUM      18
#define Y2_GPIO_NUM       5
#define VSYNC_GPIO_NUM   25
#define HREF_GPIO_NUM    23
#define PCLK_GPIO_NUM    22

void startCameraServer();

// Modified the code to upload an image every 200ms and cycle through 3 images in the Supabase bucket
int imageIndex = 0;
const int maxImages = 3;

// Function to delete a specific image from Supabase storage
void deleteImage(int idx) {
  HTTPClient http;
  String fileName = "image_" + String(idx) + ".jpg";
  String url = String(supabase_url) + fileName;
  http.begin(url.c_str());
  // Add Content-Type header and empty JSON body
  http.addHeader("Content-Type", "application/json"); 
  http.addHeader("Authorization", String("Bearer ") + supabase_anon_key);
  http.addHeader("apikey", supabase_anon_key);
  
  // Send DELETE request with an empty JSON body
  int httpResponseCode = http.sendRequest("DELETE", "{}");

  // Check if the deletion was successful (usually 200 or 204 No Content)
  if (httpResponseCode == 200 || httpResponseCode == 204) {
    Serial.printf("Successfully deleted %s\n", fileName.c_str());
  } else {
    Serial.printf("Failed to delete %s. HTTP Response Code: %d\n", fileName.c_str(), httpResponseCode);
    // Optionally print response body if available for more details
    String responseBody = http.getString(); 
    Serial.printf("Response Body: %s\n", responseBody.c_str());
  }
  
  http.end();
}

// Function to clear the bucket of all images at startup
void clearBucket() {
  for (int i = 0; i < maxImages; i++) {
    deleteImage(i);
  }
}

void uploadImageToSupabase(camera_fb_t *fb) {
  if (WiFi.status() == WL_CONNECTED) {
    // Delete the next image to clear slot for new upload
    deleteImage((imageIndex + 1) % maxImages);
    HTTPClient http;
    String fileName = "image_" + String(imageIndex) + ".jpg";
    // add upsert to overwrite existing objects and prevent 409
    String url = String(supabase_url) + fileName + "?upsert=true";

    http.begin(url.c_str());
    http.addHeader("Content-Type", "image/jpeg");
    // Use anon key for Authorization and apikey
    http.addHeader("Authorization", String("Bearer ") + supabase_anon_key);
    http.addHeader("apikey", supabase_anon_key);

    int httpResponseCode = http.POST(fb->buf, fb->len);

    if (httpResponseCode > 0) {
      Serial.printf("HTTP Response Code: %d\n", httpResponseCode);
      String responseBody = http.getString();
      Serial.printf("HTTP Response Body: %s\n", responseBody.c_str());
    } else {
      Serial.printf("Error uploading image: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();

    // Increment the image index and cycle back to 0 after reaching maxImages
    imageIndex = (imageIndex + 1) % maxImages;
  } else {
    Serial.println("WiFi not connected");
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.print("Camera Stream Ready! Go to: http://");
  Serial.println(WiFi.localIP());

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_SVGA;
  config.jpeg_quality = 3; // Adjusted quality slightly (lower is better quality, higher is smaller size)
  config.fb_count     = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }

  clearBucket();
  startCameraServer();
}

void loop() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }

  uploadImageToSupabase(fb);
  esp_camera_fb_return(fb);

  delay(200);
}

#include <WebServer.h>

WebServer server(80);

void handle_jpg_stream() {
  WiFiClient client = server.client();

  String response = "HTTP/1.1 200 OK\r\n";
  response += "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n";
  server.sendContent(response);

  while (true) {
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      return;
    }

    response = "--frame\r\n";
    response += "Content-Type: image/jpeg\r\n\r\n";
    server.sendContent(response);

    server.sendContent((const char *)fb->buf, fb->len);
    server.sendContent("\r\n");

    esp_camera_fb_return(fb);

    if (!client.connected()) break;
  }
}

void startCameraServer() {
  server.on("/", []() {
    server.send(200, "text/html", 
      "<html><body><h1>ESP32-CAM Stream</h1><img src=\"/stream\" /></body></html>");
  });

  server.on("/stream", HTTP_GET, handle_jpg_stream);

  server.begin();
}
