"""Real camera + YOLO gateway. No generated frames or example detections.
Run behind HTTPS, configure explicit site origins and a bearer token.
"""
import os
import secrets
import threading
import time
from datetime import datetime, timezone

import cv2
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from ultralytics import YOLO

TOKEN = os.environ.get("YOLO_GATEWAY_TOKEN", "")
ORIGINS = [s.strip() for s in os.environ.get("SITE_ORIGINS", "").split(",") if s.strip()]
MODEL_PATH = os.environ.get("YOLO_MODEL", "")
SOURCE = os.environ.get("CAMERA_SOURCE", "0")
if len(TOKEN) < 32 or not ORIGINS or not MODEL_PATH or not os.path.isfile(MODEL_PATH):
    raise RuntimeError("Configure YOLO_GATEWAY_TOKEN (32+ chars), SITE_ORIGINS and an existing YOLO_MODEL file")
model = YOLO(MODEL_PATH)
lock = threading.Lock()
state = {"jpeg": None, "frame": None, "id": 0}
model_lock = threading.Lock()
app = FastAPI(title="RiverPulse YOLO Gateway")
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])

def authorize(request):
    value = request.headers.get("authorization", "").removeprefix("Bearer ")
    # A stream ticket allows an <img> to use a token without putting the long-lived secret in a URL.
    if not secrets.compare_digest(value, TOKEN):
        raise HTTPException(401, "Invalid gateway token")

def infer(image):
    with model_lock:
        result = model.predict(image, verbose=False)[0]
    h, w = image.shape[:2]
    boxes = []
    for box in result.boxes:
        x1, y1, x2, y2 = box.xyxy[0].cpu().tolist()
        x1, x2 = max(0, min(w, x1)), max(0, min(w, x2))
        y1, y2 = max(0, min(h, y1)), max(0, min(h, y2))
        boxes.append({"label": result.names[int(box.cls[0])], "confidence": float(box.conf[0]), "x": x1/w, "y": y1/h, "width": (x2-x1)/w, "height": (y2-y1)/h})
    with lock:
        state["id"] += 1
        frame_id = state["id"]
    frame = {"robotId": "rc-01", "frameId": frame_id, "capturedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "boxes": boxes[:100]}
    return result.plot(), frame

def capture():
    camera = cv2.VideoCapture(int(SOURCE) if SOURCE.isdigit() else SOURCE)
    try:
        while True:
            ok, image = camera.read()
            if not ok:
                with lock:
                    state["jpeg"] = None
                    state["frame"] = None
                time.sleep(1)
                camera.release()
                camera = cv2.VideoCapture(int(SOURCE) if SOURCE.isdigit() else SOURCE)
                continue
            annotated, frame = infer(image)
            ok, jpeg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
            if ok:
                with lock:
                    state["jpeg"], state["frame"] = jpeg.tobytes(), frame
    finally:
        camera.release()

@app.on_event("startup")
def start():
    threading.Thread(target=capture, daemon=True).start()

@app.get("/detections")
def detections(request: Request):
    authorize(request)
    with lock:
        frame = state["frame"]
    if frame is None:
        raise HTTPException(503, "Camera has not produced a frame")
    return frame

@app.post("/detect")
async def detect(request: Request, image: UploadFile = File(...)):
    authorize(request)
    data = await image.read(4_000_001)
    if len(data) > 4_000_000:
        raise HTTPException(413, "Frame too large")
    import numpy as np
    pixels = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if pixels is None:
        raise HTTPException(400, "Invalid image")
    _, frame = infer(pixels)
    return frame

# Ticket authorization is short-lived. Tokens are never placed in the stream URL.
tickets = {}
@app.post("/stream-ticket")
def stream_ticket(request: Request):
    authorize(request)
    now = time.time()
    for old in list(tickets):
        if tickets[old] < now:
            tickets.pop(old, None)
    ticket = secrets.token_urlsafe(24)
    tickets[ticket] = now + 60
    return {"ticket": ticket}

@app.get("/video")
def video(ticket: str = ""):
    if tickets.pop(ticket, 0) < time.time():
        raise HTTPException(401, "Get a valid stream ticket first")
    def frames():
        last = -1
        while True:
            with lock:
                jpeg, frame = state["jpeg"], state["frame"]
            if jpeg and frame and frame["frameId"] != last:
                last = frame["frameId"]
                yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
            time.sleep(.05)
    return StreamingResponse(frames(), media_type="multipart/x-mixed-replace; boundary=frame", headers={"Cache-Control":"no-store"})
