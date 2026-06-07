import sys
import json
import os
import cv2
import numpy as np
from ultralytics import YOLO

def classify_weather_and_visibility(frame):
    """
    Estimates weather condition and visibility level from a single frame
    using brightness, contrast, saturation, and haze detection.
    Returns: (weather_condition, visibility_level)
    """
    try:
        # Convert to HSV for saturation/brightness analysis
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)

        mean_brightness = float(np.mean(v))      # 0-255
        mean_saturation = float(np.mean(s))      # 0-255

        # Grayscale contrast = std deviation of pixel values
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        contrast = float(np.std(gray))            # higher = more detail

        # Haze index: difference between max and mean brightness in V channel
        # Foggy images have high mean brightness but low contrast
        haze_index = mean_brightness / (contrast + 1e-5)

        # Blue channel dominance (rain/overcast tends to be bluish-gray)
        b, g, r = cv2.split(frame.astype(np.float32))
        blue_ratio = float(np.mean(b)) / (float(np.mean(r)) + 1e-5)

        # ── Weather Classification ──────────────────────────
        if haze_index > 6.0 and contrast < 30:
            weather = 'Foggy'
        elif mean_saturation < 40 and mean_brightness < 100:
            weather = 'Rainy'
        elif mean_saturation < 55 and blue_ratio > 1.05:
            weather = 'Cloudy'
        elif mean_brightness > 160 and mean_saturation > 50:
            weather = 'Sunny'
        elif mean_brightness > 130:
            weather = 'Sunny'
        else:
            weather = 'Cloudy'

        # ── Visibility Classification ───────────────────────
        if contrast < 25 or haze_index > 7.0:
            visibility = 'Low'
        elif contrast < 50:
            visibility = 'Medium'
        else:
            visibility = 'High'

        return weather, visibility

    except Exception:
        return 'Unknown', 'Medium'


def analyze_media(media_path):
    try:
        # Resolve paths
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        det_model_path = os.path.join(base_dir, "yolov8n.pt")
        model_det = YOLO(det_model_path)
        
        cls_model_path = os.path.join(base_dir, "ml", "runs", "accident_classifier", "weights", "best.pt")
        model_cls = YOLO(cls_model_path)
        
        max_vehicles_found = 0
        global_accident_detected = False
        max_accident_confidence = 0.0
        final_class_name = "Non Accident"
        
        # Detect if it's an image or video
        is_image = media_path.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.avif', '.webp'))
        
        frames_to_process = []
        if is_image:
            img = cv2.imread(media_path)
            if img is not None:
                frames_to_process.append(img)
            else:
                print(json.dumps({"error": "Failed to open image file using cv2.imread"}))
                sys.stdout.flush()
                os._exit(1)
        else:
            cap = cv2.VideoCapture(media_path)
            if not cap.isOpened():
                print(json.dumps({"error": "Failed to open video media file using cv2.VideoCapture"}))
                sys.stdout.flush()
                os._exit(1)

            fps = cap.get(cv2.CAP_PROP_FPS)
            if not fps or fps <= 0:
                fps = 1
            frame_skip = max(1, int(fps / 2))
            
            frame_idx = 0
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret: break
                if frame_idx % frame_skip == 0:
                    frames_to_process.append(frame)
                frame_idx += 1
            cap.release()

        if not frames_to_process:
            print(json.dumps({"error": "No frames extracted from media"}))
            sys.stdout.flush()
            os._exit(1)

        best_frame_annotated = None
        highest_frame_score = -1.0
        best_frame_for_weather = None
        
        detected_weather = 'Unknown'
        detected_visibility = 'Medium'
        
        annotated_video_frames = []

        # Process all extracted frames
        for frame in frames_to_process:
            # 1. Determine vehicle count using Object Detection
            results_det = model_det(frame, verbose=False)
            vehicle_classes = [2, 3, 5, 7] # car, motorcycle, bus, truck
            
            current_count = 0
            for r in results_det:
                for box in r.boxes:
                    if int(box.cls[0]) in vehicle_classes:
                        current_count += 1
            if current_count > max_vehicles_found:
                max_vehicles_found = current_count
            
            # 2. Determine accident using Image Classification
            results_cls = model_cls(frame, verbose=False)
            probs = results_cls[0].probs
            names = results_cls[0].names
            
            accident_idx = None
            for k, v in names.items():
                if 'non' not in v.lower() and 'accident' in v.lower():
                    accident_idx = k
                    break
                    
            if accident_idx is not None:
                accident_conf = float(probs.data[accident_idx])
            else:
                accident_conf = 0.0

            is_accident = accident_conf >= 0.28
            
            if is_accident:
                global_accident_detected = True
                final_class_name = "Accident"
                if accident_conf > max_accident_confidence:
                    max_accident_confidence = accident_conf
            else:
                if not global_accident_detected and accident_conf > max_accident_confidence:
                    max_accident_confidence = accident_conf

            # 3. Create annotated frame
            annotated = results_det[0].plot()
            label = f"{'ACCIDENT' if is_accident else 'NORMAL'} ({accident_conf:.2f})"
            color = (0, 0, 255) if is_accident else (0, 255, 0)
            cv2.putText(annotated, label, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)
            cv2.putText(annotated, f"Vehicles Detected: {current_count}", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 200, 0), 2)
            
            if not is_image:
                annotated_video_frames.append(annotated)

            frame_score = (accident_conf * 0.7) + (current_count * 0.1)
            if frame_score > highest_frame_score:
                highest_frame_score = frame_score
                best_frame_annotated = annotated
                best_frame_for_weather = frame

        # Save annotated image
        # Save annotated image or video
        annotated_filename = "annot_" + os.path.basename(media_path)
        
        if is_image:
           annotated_filename = annotated_filename.replace(os.path.splitext(annotated_filename)[1], ".jpg")
           output_path = os.path.join(os.path.dirname(media_path), annotated_filename)
           if best_frame_annotated is not None:
               cv2.imwrite(output_path, best_frame_annotated)
        else:
           annotated_filename = os.path.splitext(annotated_filename)[0] + ".webm"
           output_path = os.path.join(os.path.dirname(media_path), annotated_filename)
           if annotated_video_frames:
               height, width = annotated_video_frames[0].shape[:2]
               fourcc = cv2.VideoWriter_fourcc(*'vp80')
               out_fps = max(1.0, float(fps) / float(frame_skip))
               video_writer = cv2.VideoWriter(output_path, fourcc, out_fps, (width, height))
               for f in annotated_video_frames:
                   video_writer.write(f)
               video_writer.release()

        # 3b. Detect weather and visibility from the best frame
        if best_frame_for_weather is not None:
            detected_weather, detected_visibility = classify_weather_and_visibility(best_frame_for_weather)

        # 4. Calculate severity score globally
        if not global_accident_detected:
            severity_score = (max_vehicles_found * 0.05) 
        else:
            # If an accident is detected, score uses confidence
            severity_score = 0.5 + (max_accident_confidence * 0.3) + (max_vehicles_found * 0.05)
        
        severity_score = min(max(severity_score, 0), 1.0)
        
        output = {
            "vehicle_count": max_vehicles_found,
            "accident_detected": global_accident_detected,
            "severity_score": round(severity_score, 2),
            "confidence": round(float(max_accident_confidence), 2),
            "class_name": final_class_name,
            "annotated_filename": annotated_filename if best_frame_annotated is not None else None,
            "weather_condition": detected_weather,
            "visibility_level": detected_visibility
        }
        
        print(json.dumps(output))
        sys.stdout.flush()
        os._exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.stdout.flush()
        os._exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.stdout.flush()
        os._exit(1)
    else:
        analyze_media(sys.argv[1])
