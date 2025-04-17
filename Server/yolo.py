from ultralytics import YOLO


def detect_humans(img):
    model = YOLO("yolov8n.pt")  # Make sure yolov8n.pt is available or change path
    results = model(img)
    boxes = []
    for r in results:
        for box in r.boxes:
            if int(box.cls[0]) == 0:  # Class 0 is 'person' in COCO
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                boxes.append((x1, y1, x2, y2))
    return boxes
