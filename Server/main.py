from Server.fetch_data import fetch_latest_image
from Server.yolo import detect_humans
from Server.uv_conversion import boxes_to_uv
from Server.supabase_upload import send_uv_to_supabase
import time


def main():
    last_image_name = None
    print("Server started. Waiting for new images...")
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


if __name__ == "__main__":
    main()
