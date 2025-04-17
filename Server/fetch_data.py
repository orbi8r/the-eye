import cv2
import numpy as np
from supabase import create_client
import requests

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
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        return img, latest_image
    return None, None
