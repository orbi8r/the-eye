from fetch_data import fetch_latest_image
from yolo import detect_humans
from uv_conversion import boxes_to_uv
from supabase_upload import send_uv_to_supabase
import time
import argparse
import threading
from sound import record_and_send_sound


def image_processing_loop():
    """Original image processing functionality"""
    last_image_name = None
    print("Image processing started. Waiting for new images...")
    while True:
        img, image_name = fetch_latest_image()
        if img is None or image_name == last_image_name:
            time.sleep(2)  # Wait before checking again
            continue
        boxes = detect_humans(img)
        uv_coords = boxes_to_uv(boxes, img.shape)
        send_uv_to_supabase(image_name, uv_coords)
        print(f"Processed {image_name}: {uv_coords}")
        last_image_name = image_name
        time.sleep(1)  # Optional: throttle processing if needed


def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description="The Eye Server - Monitor images and sound"
    )
    parser.add_argument("--image", action="store_true", help="Run image processing")
    parser.add_argument("--sound", action="store_true", help="Run sound monitoring")
    parser.add_argument(
        "--interval",
        type=int,
        default=5,
        help="Sound recording interval in seconds (default: 5)",
    )

    args = parser.parse_args()

    # Default to image processing if no arguments given
    if not args.image and not args.sound:
        args.image = True

    # Create threads for each active function
    threads = []

    if args.image:
        image_thread = threading.Thread(target=image_processing_loop, daemon=True)
        threads.append(image_thread)
        print("Image processing enabled")

    if args.sound:
        sound_thread = threading.Thread(
            target=record_and_send_sound, args=(args.interval,), daemon=True
        )
        threads.append(sound_thread)
        print(f"Sound monitoring enabled with {args.interval} second interval")

    # Start all threads
    for thread in threads:
        thread.start()

    # Keep the main thread running
    try:
        while any(t.is_alive() for t in threads):
            time.sleep(1)
    except KeyboardInterrupt:
        print("Service stopping...")

    print("All services stopped")


if __name__ == "__main__":
    main()
