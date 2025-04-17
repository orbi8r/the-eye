def boxes_to_uv(boxes, img_shape):
    h, w = img_shape[:2]
    uv_coords = []
    for x1, y1, x2, y2 in boxes:
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        u = cx / w
        v = cy / h
        uv_coords.append({"u": u, "v": v})
    return uv_coords
