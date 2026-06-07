import sys
import os
import cv2
from ultralytics import YOLO

def debug_video(media_path):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cls_model_path = os.path.join(base_dir, "runs", "accident_classifier", "weights", "best.pt")
    model_cls = YOLO(cls_model_path)
    
    cap = cv2.VideoCapture(media_path)
    if not cap.isOpened():
        print("Failed to open media file")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_skip = max(1, int(fps / 2))
    
    frame_idx = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        if frame_idx % frame_skip == 0:
            results_cls = model_cls(frame, verbose=False)
            probs = results_cls[0].probs
            
            # Print raw probabilities
            names = results_cls[0].names
            prob_dict = {names[i]: float(probs.data[i]) for i in range(len(names))}
            
            top1_idx = probs.top1
            class_name = names[top1_idx]
            confidence = probs.top1conf.item()
            
            print(f"Frame {frame_idx}: Top1={class_name} ({confidence:.2f}) | Probs: {prob_dict}")

        frame_idx += 1
        
    cap.release()

if __name__ == "__main__":
    debug_video(sys.argv[1])
