import pyaudio
import numpy as np
import time
from datetime import datetime
from supabase import create_client

# Supabase configuration - using the same credentials as in supabase_upload.py
supabase_url = "https://lmkrpifbfbmasljrxthk.supabase.co"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxta3JwaWZiZmJtYXNsanJ4dGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzODU3MTMsImV4cCI6MjA1OTk2MTcxM30.lTHwm4dUAmAQMbg7C2EmhP9DPvfVOCnYrU4XjXx9psQ"

# Sound recording parameters
CHUNK = 1024  # Record in chunks of 1024 samples
FORMAT = pyaudio.paInt16  # 16-bit resolution
CHANNELS = 1  # 1 channel (mono)
RATE = 44100  # 44.1kHz sampling rate
RECORD_SECONDS = 1  # Record 1 second at a time
DEBUG = True  # Set to True to see detailed debug information

# Sound level scaling parameters
# Based on observed RMS values from your microphone
MIN_EXPECTED_RMS = 0.1  # Minimum expected RMS value (near silence)
MAX_EXPECTED_RMS = 5.0  # Maximum expected RMS value (very loud)


def list_microphones():
    """List all available microphone devices and their IDs"""
    p = pyaudio.PyAudio()
    info = []

    for i in range(p.get_device_count()):
        device_info = p.get_device_info_by_index(i)
        if device_info.get("maxInputChannels") > 0:  # Input devices only
            info.append(
                {
                    "index": i,
                    "name": device_info.get("name"),
                    "channels": device_info.get("maxInputChannels"),
                }
            )

    p.terminate()
    return info


def select_microphone():
    """Select a working microphone device"""
    devices = list_microphones()

    if not devices:
        print("No microphone devices found!")
        return None

    print("Available microphone devices:")
    for i, device in enumerate(devices):
        print(
            f"{i}: {device['name']} (Device ID: {device['index']}, Channels: {device['channels']})"
        )

    # By default, we'll use the first microphone
    device_id = devices[0]["index"]
    print(f"Using default microphone: {devices[0]['name']} (ID: {device_id})")

    return device_id


def initialize_audio(device_id=None):
    """Initialize PyAudio and open a stream with the specified device if provided"""
    try:
        p = pyaudio.PyAudio()

        # If no device specified, try to select a working one
        if device_id is None:
            device_id = select_microphone()
            if device_id is None:
                return None, None

        kwargs = {
            "format": FORMAT,
            "channels": CHANNELS,
            "rate": RATE,
            "input": True,
            "frames_per_buffer": CHUNK,
        }

        # Add device index if one was selected
        if device_id is not None:
            kwargs["input_device_index"] = device_id

        stream = p.open(**kwargs)

        # Test the microphone to make sure it's working
        test_audio_data = test_microphone(stream)
        if test_audio_data is None:
            print("Microphone test failed! No audio data received.")
            return None, None

        print(f"Audio stream initialized successfully with device ID: {device_id}")
        return p, stream
    except Exception as e:
        print(f"Error initializing audio stream: {e}")
        return None, None


def test_microphone(stream):
    """Test the microphone by recording a short sample and validating the data"""
    print("Testing microphone...")
    try:
        # Record a short sample
        frames = []
        for i in range(0, int(RATE / CHUNK * 0.2)):  # 0.2 seconds
            data = stream.read(CHUNK, exception_on_overflow=False)
            frames.append(data)

        # Check if we got any data
        if not frames:
            print("No frames recorded during test!")
            return None

        audio_data = b"".join(frames)
        audio_array = np.frombuffer(audio_data, dtype=np.int16)

        # Check if the array has any non-zero values
        if np.any(audio_array != 0):
            print("Microphone test successful - audio data detected!")
            # Print some stats about the audio
            rms = np.sqrt(np.mean(np.square(audio_array)))
            print(f"Audio RMS: {rms}")
            return audio_data
        else:
            print("Microphone test failed - no audio data detected!")
            return None

    except Exception as e:
        print(f"Error testing microphone: {e}")
        return None


def calculate_sound_level(audio_data):
    """
    Calculate a raw sound level value from audio data
    Returns a value scaled from 0-100
    """
    # Convert to numpy array
    audio_array = np.frombuffer(audio_data, dtype=np.int16)

    # Calculate RMS (root mean square) as measure of amplitude
    rms = np.sqrt(np.mean(np.square(audio_array)))

    # Simple linear scaling from RMS to 0-100 scale
    # Using the min and max expected RMS values for your microphone
    normalized = (rms - MIN_EXPECTED_RMS) / (MAX_EXPECTED_RMS - MIN_EXPECTED_RMS) * 100

    # Cap at 0-100 range
    normalized = max(0, min(100, normalized))

    if DEBUG:
        print(f"DEBUG: Raw RMS: {rms}, Scaled to 0-100: {normalized:.2f}")

    return normalized


def record_and_send_sound(interval=5):
    """
    Continuously record sound, calculate level, and send to Supabase
    Args:
        interval: Time in seconds between recordings
    """
    # Try to find a working microphone
    device_id = select_microphone()
    p, stream = initialize_audio(device_id)

    if not p or not stream:
        print("Failed to initialize audio. Exiting.")
        return

    print(f"Starting sound monitoring. Sending raw data every {interval} seconds.")

    try:
        supabase = create_client(supabase_url, supabase_key)

        while True:
            try:
                # Record audio for RECORD_SECONDS seconds
                frames = []
                for i in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
                    data = stream.read(CHUNK, exception_on_overflow=False)
                    frames.append(data)

                # Calculate sound level
                audio_data = b"".join(frames)
                sound_level = calculate_sound_level(audio_data)

                # Send to Supabase
                timestamp = datetime.now().isoformat()
                data = {"created_at": timestamp, "data": sound_level}

                supabase.table("sound").insert(data).execute()
                print(f"Sound level: {sound_level:.2f} - Data sent at {timestamp}")

                # Wait for the next interval
                time.sleep(interval)

            except KeyboardInterrupt:
                print("Recording stopped by user")
                break
            except Exception as e:
                print(f"Error during recording: {e}")
                time.sleep(1)  # Short delay before retrying

    finally:
        # Clean up
        if stream:
            stream.stop_stream()
            stream.close()
        if p:
            p.terminate()
        print("Audio recording terminated")


if __name__ == "__main__":
    # If run directly, start recording and sending data
    record_and_send_sound(interval=5)
