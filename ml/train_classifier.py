import os
from ultralytics import YOLO

def main():
    # Define absolute path to the dataset's 'data' directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, "dataset", "data")
    
    print(f"Starting training on dataset located at: {data_dir}")
    
    # Load a pretrained YOLO model for classification
    # This will automatically download yolov8n-cls.pt if not present
    model = YOLO("yolov8n-cls.pt")
    
    # Train the model
    # We run for 10 epochs as a default starting point.
    results = model.train(
        data=data_dir,
        epochs=10,           # Adjust this based on training results
        imgsz=224,           # Standard resolution for classification
        project=os.path.join(base_dir, "ml", "runs"),
        name="accident_classifier"
    )
    
    print("Training complete! The best model is saved at ml/runs/accident_classifier/weights/best.pt")

if __name__ == "__main__":
    main()
