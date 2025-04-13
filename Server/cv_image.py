import cv2
import numpy as np
from supabase import create_client
import requests

# Supabase configuration
supabase_url = "https://lmkrpifbfbmasljrxthk.supabase.co"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxta3JwaWZiZmJtYXNsanJ4dGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzODU3MTMsImV4cCI6MjA1OTk2MTcxM30.lTHwm4dUAmAQMbg7C2EmhP9DPvfVOCnYrU4XjXx9psQ"
supabase = create_client(supabase_url, supabase_key)


def fetch_latest_image():
    response = supabase.storage.from_("images").list()
    if response:
        latest_image = sorted(response, key=lambda x: x["created_at"], reverse=True)[0][
            "name"
        ]
        image_url = f"{supabase_url}/storage/v1/object/public/images/{latest_image}"
        resp = requests.get(image_url)
        img_array = np.asarray(bytearray(resp.content), dtype=np.uint8)
        return cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    return None


def display_image():
    while True:
        img = fetch_latest_image()
        if img is not None:
            cv2.imshow("Supabase Image", img)
        if cv2.waitKey(1000) == ord("q"):
            break
    cv2.destroyAllWindows()


if __name__ == "__main__":
    print("started")
    display_image()
