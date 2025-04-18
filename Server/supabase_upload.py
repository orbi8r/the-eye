import json
from supabase import create_client
from datetime import datetime

supabase_url = "https://lmkrpifbfbmasljrxthk.supabase.co"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxta3JwaWZiZmJtYXNsanJ4dGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzODU3MTMsImV4cCI6MjA1OTk2MTcxM30.lTHwm4dUAmAQMbg7C2EmhP9DPvfVOCnYrU4XjXx9psQ"
supabase = create_client(supabase_url, supabase_key)


def send_uv_to_supabase(image_name, uv_coords):
    """
    Legacy function - use send_uv_data instead
    """
    data = {
        "image_name": image_name,
        "uv_coords": json.dumps(uv_coords),
    }
    supabase.table("people_uv").insert(data).execute()


def send_uv_data(uv_data, image_name=None):
    """
    Send UV data to the uv_data table that the website is monitoring

    Args:
        uv_data: Dictionary containing UV measurements and related data
        image_name: Optional reference to related image
    """
    # Create the data structure that matches what the website expects
    timestamp = datetime.now().isoformat()

    data = {
        "timestamp": timestamp,
        "image_name": image_name,
        **uv_data,  # Include all UV data fields
    }

    # Insert into the uv_data table (which the website is subscribed to)
    response = supabase.table("uv_data").insert(data).execute()

    print(f"Data uploaded to uv_data table at {timestamp}")
    return response
