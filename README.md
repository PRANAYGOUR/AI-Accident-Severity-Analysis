<div align="center">
  <img src="./assets/banner.png" alt="AI Accident Severity Analysis Banner" width="100%">
  
  <h1>🚗 AI Accident Severity Analysis 🚦</h1>
  <p><strong>A futuristic, end-to-end full-stack platform for detecting, classifying, and analyzing road accident severity using advanced Computer Vision models (YOLOv8).</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue?style=for-the-badge&logo=react" alt="Frontend" />
    <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green?style=for-the-badge&logo=nodedotjs" alt="Backend" />
    <img src="https://img.shields.io/badge/Machine%20Learning-YOLOv8-yellow?style=for-the-badge&logo=pytorch" alt="Machine Learning" />
    <img src="https://img.shields.io/badge/Database-SQL-lightblue?style=for-the-badge&logo=mysql" alt="Database" />
  </p>
</div>

<hr>

## 🌟 Overview

The **AI Accident Severity Analysis** platform automatically evaluates video footage of road accidents, detects the vehicles involved, and categorizes the severity of the accident in real-time. By leveraging a high-performance **YOLOv8-based Machine Learning architecture**, seamless **Node.js backend**, and an ultra-fast **React+Vite frontend**, it provides actionable insights to emergency responders, law enforcement, and insurance agencies.

### 🚀 Key Features

- **Real-Time Video Analysis**: Upload dashcam or CCTV footage for instant analysis.
- **Precision Detection (YOLOv8)**: Detects specific vehicles and impacts with state-of-the-art computer vision.
- **Severity Classification**: Automatically assigns a severity score (Minor, Moderate, Severe, Fatal).
- **Interactive Dashboard**: Sleek and modern user interface for managing footage and analyzing results.
- **Robust Database Integration**: Secure storage for historical analyses and footage metadata.

---

## 📂 Project Structure

This repository is organized into distinct functional modules:

```text
📦 AI Accident Severity Analysis
 ┣ 📂 assets/              # Project images, banners, and media
 ┣ 📂 backend/             # Node.js + Express Backend API
 ┃ ┣ 📂 uploads/           # Storage for uploaded video footage
 ┃ ┣ 📜 server.js          # Main Express server entry point
 ┃ ┣ 📜 db.js              # Database connection and queries
 ┃ ┣ 📜 yolov8n.pt         # Pre-trained ML model for backend inference
 ┃ ┗ 📜 package.json       # Backend dependencies
 ┣ 📂 frontend/            # React + Vite Frontend App
 ┃ ┣ 📂 public/            # Public static assets
 ┃ ┣ 📂 src/               # React components, pages, and styles
 ┃ ┣ 📜 index.html         # HTML entry point
 ┃ ┣ 📜 vite.config.js     # Vite configuration
 ┃ ┗ 📜 package.json       # Frontend dependencies
 ┣ 📂 ml/                  # Machine Learning & Computer Vision pipeline
 ┃ ┣ 📂 runs/              # Training logs and outputs
 ┃ ┣ 📜 analyze.py         # Main script for severity analysis
 ┃ ┣ 📜 train_classifier.py# Model training script
 ┃ ┣ 📜 ML_ARCHITECTURE.md # Deep dive into the ML design
 ┃ ┗ 📜 yolov8n-cls.pt     # Classification weights
 ┣ 📂 database/            # Database schemas and dumps
 ┃ ┗ 📜 Dump20260414.sql   # Initial SQL dump for database setup
 ┣ 📂 dataset/             # Raw datasets and labels for ML training
 ┣ 📜 clip_01.mp4          # Sample testing video footage
 ┗ 📜 README.md            # Project documentation (You are here!)
```

---

## 🛠️ Tech Stack

### Frontend 🎨
- **Framework**: React.js
- **Build Tool**: Vite
- **Styling**: Tailwind CSS / Vanilla CSS (Custom modern aesthetics)

### Backend ⚙️
- **Runtime**: Node.js
- **Framework**: Express.js
- **Integration**: Python Shell integration for ML inference

### Machine Learning 🧠
- **Model**: YOLOv8 (Ultralytics)
- **Language**: Python
- **Frameworks**: PyTorch, OpenCV

---

## ⚙️ Quick Start

Follow these instructions to run the application locally.

### 1. Database Setup
Import the SQL dump to your local SQL instance.
```bash
mysql -u root -p database_name < database/Dump20260414.sql
```

### 2. Backend Setup
Navigate to the `backend` directory, install dependencies, and start the server.
```bash
cd backend
npm install
npm run start  # Or node server.js
```
*(Make sure to configure your `.env` file with the correct database credentials!)*

### 3. Frontend Setup
Navigate to the `frontend` directory, install dependencies, and start the development server.
```bash
cd frontend
npm install
npm run dev
```

### 4. Machine Learning Scripts
Ensure you have the required Python dependencies installed (PyTorch, Ultralytics, OpenCV).
```bash
cd ml
pip install -r requirements.txt # (if available) or pip install ultralytics opencv-python
python analyze.py --video ../clip_01.mp4
```

---

## 🔮 Future Enhancements
- [ ] Integration with live CCTV feeds
- [ ] Mobile application for on-the-go reporting
- [ ] Cloud deployment (AWS / GCP) and containerization with Docker

---

<div align="center">
  <p><i>Made with ❤️ by the AI Accident Severity Analysis Team</i></p>
</div>