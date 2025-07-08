# Orthodontic PAR Index AI Prototype

**Candidate:** Yann Klees  
**Supervisor:** Shekoufeh Gorgi Zadeh  
**Internship:** 24.06.2025 — 24.07.2025

---

## Project Overview

This project explores state-of-the-art deep learning models for automatic calculation of the **PAR (Peer Assessment Rating) index** on intra-oral images in orthodontics.  
It includes both backend ML model training and a modern user interface prototype for clinical decision support.

---

## Objectives

- Evaluate and compare SOTA object detection models (YOLO, Faster R-CNN) for PAR calculation
- Modify models for orthodontic domain and add regression (PAR score) heads
- Build a prototype UI for clinical PAR assessment & decision support
- Experience the **full ML pipeline**: data loading, model training, inference API, and frontend

---

## Features

- **Multi-view Intraoral Image Upload:** Accepts 5 standardized images (up, down, left, right, center)
- **Mosaic Generation:** Automatically stitches input images into a dental mosaic
- **AI Analysis:** Performs detection & PAR index scoring using trained models (YOLO, Faster R-CNN)
- **Interactive UI:**  
  - Patient lookup, visit history, and report management  
  - Edit detected bounding boxes or PAR component scores  
  - Visualize and compare pre/post treatment
  - Find similar patients based on PAR features
  - Bulk processing mode for batch analysis
- **Modular Codebase:** Easily extendable with new models, datasets, and UI features

---

## Tech Stack

| Layer          | Technology                               |
| -------------- | ---------------------------------------- |
| Frontend       | React 18, TypeScript, Vite, TailwindCSS, Radix UI, Lucide Icons |
| Backend API    | Express.js (development), FastAPI (ML), serverless-ready        |
| ML/AI          | PyTorch, torchvision, Ultralytics YOLO, custom Python scripts   |
| Data           | DENTEX challenge dataset, COCO-128, Hugging Face datasets      |
| Testing        | Vitest (frontend), Pytest (Python), dry-run integration tests   |

---

## Setup Instructions

### **1. Clone the Repository**

```bash
git clone https://your.repo.url.git
cd orthodontic
```

### **2. Python Environment (ML Backend)**

**Recommended:** Python 3.11+

Create and activate virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**Additional ML dependencies:** 
torch, torchvision, ultralytics, opencv-python, pillow, pyyaml, huggingface_hub, datasets

### **3. Frontend (React + Vite)**

```bash
cd GUI
npm install
npm run dev       # Starts the frontend (localhost:8080)
```

### **4. Model Training (YOLO/Faster R-CNN)**

```bash
# Example: Train YOLO baseline
python -m src.yrcnn.training.train --dataset dentex --model yolo11n.pt --epochs 5 --batch 4

# Example: Train Faster R-CNN baseline
python -m src.yrcnn.training.train --dataset dentex --model rcnn --epochs 5 --batch 2

# Use the TUI for interactive training
python -m src.yrcnn.yrcnn_tui (this one might be laggy or not working it uses wandb)
```

Checkpoints and logs will appear in the `runs/` folder.

### **5. Backend API**

**Development:** Run the Express server for API proxy and static hosting:

```bash
npm run dev
```

**For ML inference:** Start FastAPI server:

```bash
uvicorn yrcnn.ui.api:app --reload --port 8000
```

---

## Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/infer` | POST | Run AI inference on uploaded images (5-view mosaic), returns detected boxes and PAR scores |
| `GET /api/ping` | GET | Health check |
| `POST /api/patient` | POST | Create new patient |
| `GET /api/patient` | GET | List all patients |
| `GET /api/patient/{id}` | GET | Get patient details |
| `POST /api/patient/{id}/upload` | POST | Upload images for patient |
| `POST /api/similar` | POST | Find similar patients |
| `GET /api/cluster` | GET | Get patient clusters |

---

## Demo Data

The code auto-downloads and splits DENTEX/COCO sample datasets:

```bash
# Visualize dataset samples
python -m yrcnn.utils.viz --data dentex --n 5

# Test data loading
python -m yrcnn.cli viz dentex --n 3
```

To test without internet: Use the demo dataset fallback (see Python comments in `data/manager.py`).

---

## Usage Examples

### **Training Models**

```bash
# Interactive TUI
yrcnn tui

# Command line training
yrcnn train dentex --model yolo11n.pt --epochs 10 --batch 8
yrcnn train dentex --model rcnn --epochs 5 --batch 4

# Resume training
yrcnn train dentex --model yolo --resume runs/dentex/yolo/weights/last.pt --epochs 5
```

### **Running Inference**

```bash
# Run inference on images
python -m yrcnn.training.inference --weights best.pt --source images/ --device cpu
```

### **Patient Management**

```python
from yrcnn.ui.patient import create_patient, upload_image
from yrcnn.ui.similar import most_similar

# Create patient
patient = create_patient("John Doe", age=25, condition="Class II malocclusion")

# Find similar patients
similar = most_similar(patient.id, k=5)
```

---

## Project Structure

```
orthodontic/
├── src/yrcnn/                    # Main Python package
│   ├── data/                     # Dataset management
│   ├── models/                   # YOLO & Faster R-CNN wrappers
│   ├── training/                 # Training scripts
│   ├── ui/                       # FastAPI backend
│   └── utils/                    # Visualization & helpers
├── GUI/                          # React frontend
├── runs/                         # Training outputs
├── data/                         # Datasets & patient data
├── requirements.txt              # Python dependencies
└── pyproject.toml               # Package configuration
```

---

## Customization

### **Add New Model**

Register it in `src/yrcnn/models/factory.py`:

```python
_BUILDERS["your_model"] = _build_your_model
```

### **Change UI**

Edit React components in `GUI/src/components/`

### **Connect UI to Backend**

Wire up UI upload and inference components to `POST /api/infer` (see `DentalImageUpload.tsx`)

### **Extend Patient Management**

Add API endpoints in `src/yrcnn/ui/api.py` and database models in `src/yrcnn/ui/patient.py`

---

## Features in Detail

### **Mosaic Generation**

The `intra_oral_mosaic.py` module automatically stitches 5 intraoral views into a standardized 3×2 grid:

- **Row 1:** Right, Center, Left views
- **Row 2:** Upper, Lower views

### **PAR Index Calculation**

PAR components tracked:
- Upper/Lower Crowding
- Upper/Lower Spacing  
- Overjet, Overbite
- Crossbite, Centerline

### **Patient Similarity Search**

Uses FAISS-powered k-NN search with multimodal embeddings:
- **Image features:** CLIP embeddings
- **PAR scores:** Normalized component vectors
- **Demographics:** Age, sex encoding
- **Clinical tags:** Malocclusion class, condition hashing

---

## TODO / Limitations

- [ ] Add regression (PAR score) output head & loss to models
- [ ] Fully connect UI to backend AI inference (currently mocked)
- [ ] Implement persistent patient/visit storage and real similarity search
- [ ] Improve bulk processing and uncertainty-guided exploration
- [ ] Add comprehensive documentation and user guide
- [ ] Add model evaluation metrics and validation pipeline
- [ ] Implement data augmentation for training
- [ ] Add export functionality for reports

---

## Testing

```bash
# Run Python tests
pytest src/tests/

# Run frontend tests
cd GUI && npm test

# Dry-run training
python -m yrcnn.training.train --dataset dentex --model yolo11n.pt --epochs 1 --dry-run
```

---

## References

- **DENTEX Challenge Dataset:** [https://huggingface.co/datasets/ibrahimhamamci/DENTEX](https://huggingface.co/datasets/ibrahimhamamci/DENTEX)
- **YOLO (Ultralytics):** [https://github.com/ultralytics/ultralytics](https://github.com/ultralytics/ultralytics)
- **Faster R-CNN (torchvision):** [https://pytorch.org/vision/stable/models/generated/torchvision.models.detection.fasterrcnn_resnet50_fpn.html](https://pytorch.org/vision/stable/models/generated/torchvision.models.detection.fasterrcnn_resnet50_fpn.html)
- **Peer Assessment Rating (PAR) Index:** [https://en.wikipedia.org/wiki/Peer_Assessment_Rating](https://en.wikipedia.org/wiki/Peer_Assessment_Rating)

---

## License

This project is developed as part of an academic internship. Please contact the supervisor for usage permissions.