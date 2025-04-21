import time
from fetch_data import supabase


def fetch_quadrant_data():
    resp = (
        supabase.table("quadrant")
        .select("x1,x2,y1,y2,active")
        .eq("id", "main")
        .single()
        .execute()
    )
    if resp and resp.data:
        q = resp.data
        return (
            float(q["x1"]),
            float(q["x2"]),
            float(q["y1"]),
            float(q["y2"]),
            bool(q.get("active", False)),
        )
    return 0.33, 0.66, 0.33, 0.66, False  # defaults


def fetch_latest_uv_coords():
    resp = (
        supabase.table("people_uv")
        .select("uv_coords,image_name")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if resp and resp.data and resp.data[0].get("uv_coords"):
        import json

        uv_coords = resp.data[0]["uv_coords"]
        if isinstance(uv_coords, str):
            uv_coords = json.loads(uv_coords)
        return uv_coords, resp.data[0]["image_name"]
    return [], None


def point_in_quadrant(u, v, x1, x2, y1, y2):
    # Line1: (x1,0)-(x2,1): y = ((v)-(0))/(1-0) = (v), x = x1 + (x2-x1)*v
    # Line2: (0,y1)-(1,y2): x = ((u)-(0))/(1-0) = (u), y = y1 + (y2-y1)*u
    # Quadrants:
    #  1 | 2
    # ---+---
    #  3 | 4
    #
    # Above both lines: Q1
    # Above line1, below line2: Q2
    # Below line1, above line2: Q3
    # Below both lines: Q4
    x_line1 = x1 + (x2 - x1) * v
    y_line2 = y1 + (y2 - y1) * u
    above_line1 = u < x_line1
    above_line2 = v < y_line2
    if above_line1 and above_line2:
        return 1
    elif above_line1 and not above_line2:
        return 2
    elif not above_line1 and above_line2:
        return 3
    else:
        return 4


def relay_loop():
    last_image = None
    while True:
        x1, x2, y1, y2, active = fetch_quadrant_data()
        if not active:
            # If not active, turn all relays off and sleep
            relay_state = {
                "id": "main",
                "pin1": False,
                "pin2": False,
                "pin3": False,
                "pin4": False,
            }
            supabase.table("relay_buzzer").upsert(
                relay_state, on_conflict="id"
            ).execute()
            time.sleep(2)
            continue
        uv_coords, image_name = fetch_latest_uv_coords()
        if image_name == last_image or not image_name:
            time.sleep(2)
            continue
        # Check which quadrants have people
        people_in_quadrant = {1: False, 2: False, 3: False, 4: False}
        for p in uv_coords:
            u, v = p["u"], p["v"]
            q = point_in_quadrant(u, v, x1, x2, y1, y2)
            people_in_quadrant[q] = True
        relay_state = {
            "id": "main",
            "pin1": people_in_quadrant[1],
            "pin2": people_in_quadrant[2],
            "pin3": people_in_quadrant[3],
            "pin4": people_in_quadrant[4],
        }
        supabase.table("relay_buzzer").upsert(relay_state, on_conflict="id").execute()
        last_image = image_name
        time.sleep(1)
