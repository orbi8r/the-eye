# the-eye

Deployed: https://orbi8r.github.io/the-eye/

## Project Progress Checklist

### Part 1: ESPCam & ESP32 Data Collection
- [x] Set up ESPCam to capture video/images
- [x] Store up to 100 images at a time (cycling old data)
- [ ] Integrate audio data collection on ESP32
- [x] Integrate air quality sensor data on ESP32
- [x] Store audio and air quality data in Supabase bucket

### Part 2: Python Server & Data Processing
- [x] Fetch new image data from Supabase
- [x] Continuously poll for new images and process only new uploads
- [x] Run YOLO v8 on images to detect humans
- [x] Identify center coordinates of all visible humans
- [ ] Calibrate camera for top-down coordinate transformation
- [x] Convert coordinates to UV (0-1 float) format
- [x] Send processed coordinates to Supabase table as JSON

### Part 3: Interactive Website
- [x] Design clean, cozy UI with good animations for normal users
- [x] Display location hotspots, people count, room fullness, sound level, air quality
- [x] Add chart view for data over time (separate tab)
- [x] Implement Supabase authentication via Login in website for admin mode
- [x] Admin dashboard for full data access and control
- [x] Admin controls for 4-channel relay (light circuits) by talking back to esp32

---
- **Legend:**
  - [x] = Done
  - [ ] = To Do

Update this checklist as you complete tasks to keep track of progress!

