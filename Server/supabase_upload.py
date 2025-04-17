import json
from supabase import create_client

supabase_url = "https://lmkrpifbfbmasljrxthk.supabase.co"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxta3JwaWZiZmJtYXNsanJ4dGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzODU3MTMsImV4cCI6MjA1OTk2MTcxM30.lTHwm4dUAmAQMbg7C2EmhP9DPvfVOCnYrU4XjXx9psQ"
supabase = create_client(supabase_url, supabase_key)


def send_uv_to_supabase(image_name, uv_coords):
    data = {
        "image_name": image_name,
        "uv_coords": json.dumps(uv_coords),
    }
    supabase.table("people_uv").insert(data).execute()
