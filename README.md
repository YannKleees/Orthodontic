```markdown
# Orthodontic PAR‑AI – End‑to‑End Prototype

**Automatic PAR‑index calculation & clinical decision‑support UI**

**Candidate:** Yann Klees  
**Supervisor:** Dr Shekoufeh Gorgi Zadeh  
**Internship:** 24 Jun 2025 – 24 Jul 2025 (4 weeks)

---

## Table of Contents

1. [Project Objectives & Learning Outcomes](#0-project-objectives--learning-outcomes)  
2. [Repository Layout](#1-repository-layout)  
3. [Quick‑Start (development)](#2-quick-start-development)  
4. [Data & Model Placement](#3-data--model-placement)  
5. [Feature Overview (current prototype)](#4-feature-overview-current-prototype)  
6. [Back‑end API Snapshot](#5-back-end-api-snapshot)  
7. [Python Requirements](#6-python-requirements)  
8. [NPM Scripts (monorepo root)](#7-npm-scripts-monorepo-root)  
9. [Integrating Your Own Detection Model](#8-integrating-your-own-detection-model)  
10. [Running the Similarity Demo](#9-running-the-similarity-demo)  
11. [Tests & Quality](#10-tests--quality)  
12. [Deployment](#11-deployment)  
13. [Troubleshooting](#12-troubleshooting)  
14. [Licence & Acknowledgements](#13-licence--acknowledgements)  

---

## 0. Project Objectives & Learning Outcomes

| Week | Goal                                                                 | Key Deliverables                         |
|------|----------------------------------------------------------------------|------------------------------------------|
| 1    | • Understand the Peer Assessment Rating (PAR) index <br>• Survey SOTA detection models & prior PAR‑automation papers | Annotated bibliography                   |
| 2    | • Train YOLO‑v8 & Faster R‑CNN on public dataset <br>• Implement data‑loader for orthodontic archive | Baseline notebooks, loss curves          |
| 3    | • Add auxiliary PAR‑regression loss (MSE) <br>• Build interactive web UI: <br>   1. Upload 5 images → mosaic → AI analysis <br>   2. Browse patients & PAR severity <br>   3. Retrieve similar cases | Running full‑stack prototype             |
| 4    | • Code clean‑up, documentation, delivery                             | This README, user manual, slide deck     |

---

## 1. Repository Layout

```

.
├── backend/              ← Express + TypeScript API
│   ├── server.js         ← entry (port 8000)
│   ├── routes/           ← REST endpoints (patients, visits, reports …)
│   ├── utils/            ← small helpers (fileStore, PAR weights …)
│   └── data/             ← **all runtime data & static files live here**
│        ├── patients/
│        ├── reports/
│        └── temp/
├── client/               ← React + Vite front‑end
│   ├── hooks/            ← React‑Query wrappers
│   ├── components/       ← UI building blocks (sidebar, mosaic viewer …)
│   ├── pages/            ← Index.tsx, 404 etc.
│   └── lib/              ← util fns (apiClient, Tailwind helpers)
├── src/                  ← Research code
│   ├── knn/              ← Similar‑patient ranking (vector cache, k‑NN)
│   └── yrcnn/            ← intra\_oral\_mosaic.py (optional Python builder)
├── models/               ← \*\*trained *.pt / *.pth weights here** ★
├── sample-data/          ← 10 demo patients & 50 JPGs for quick test
├── requirements.txt      ← Python deps (see § 6)
└── README.md             ← this file

````

---

## 2. Quick‑Start (development)

### Prerequisites

| Tool      | Version         | Notes                                |
|-----------|-----------------|--------------------------------------|
| Node.js   | ≥ 20 LTS        | use nvm                             |
| pnpm      | ≥ 9             | `npm i -g pnpm`                     |
| Python    | ≥ 3.10          | with venv / conda                   |
| Git LFS    | optional        | if you store large weight files      |
| CUDA      | 11 +            | optional, for GPU inference/training |

### 1. Clone & install

```bash
git clone https://github.com/<org>/orthodontic-par-ai.git
cd orthodontic-par-ai

# Install Node dependencies (frontend + backend)
pnpm install

# Setup Python environment
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
````

### 2. Start services (two terminals)

```bash
# Terminal 1 – backend + static file‑server
pnpm --filter backend dev
# → http://localhost:8000/api/ping returns {"message":"pong"}

# Terminal 2 – front‑end (Vite + React)
pnpm --filter client dev
# → http://localhost:8080 (auto‑opens browser)
```

The Vite dev server proxies `/api/` and `/static/` to port 8000 for seamless UI integration.

---

## 3. Data & Model Placement

```
backend/
└── data/
    ├── patients/
    │   └── PAT-123.../
    │        ├── patient.json
    │        └── visits/
    │             └── <visit-id>/
    │                  ├── raw/              ← original 5 JPGs
    │                  ├── mosaic.png         ← 1200×800 thumbnail
    │                  ├── mosaic_full.png    ← full resolution
    │                  └── meta.json          ← visit metadata
    └── reports/
         └── PAT-123.../
              └── PAT-123-<timestamp>.pdf
```

* **Trained detection weights:** place your `best.pt` (YOLO‑v8) or PyTorch checkpoint under `/models`.
* **Sample data:** copy `sample-data/` into `backend/data/patients/` for immediate demo.

---

## 4. Feature Overview (current prototype)

| Area                  | Capability                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **Upload ⚙**          | Drag‑&‑drop five intra‑oral views → server stitches mosaic (Python or Sharp) → stub boxes |
| **Patient Dashboard** | • Latest PAR‑score & urgency badge<br>• Timeline of visits<br>• Similar‑patients list     |
| **Mosaic Viewer**     | • Full‑screen, zoomable<br>• Hover PAR components (Richmond eight classes)                |
| **Editor**            | Add / edit / delete PAR boxes, scores, confidence (optimistic UI updates)                 |
| **Bulk processing**   | Upload folder → queue processing → UI shows uncertainty‑sorted grid                       |
| **Reports**           | 1‑click PDF generation (`/api/reports/:pid/generate`) using pdfkit                        |
| **Similarity search** | Weighted‑cosine k-NN over vectorized records (live cache rebuild)                         |

---

## 5. Back‑end API Snapshot

```http
GET    /api/patients                       → list/search
POST   /api/patients                       → create
GET    /api/patients/:pid                  → detail
PUT    /api/patients/:pid                  → partial update
DELETE /api/patients/:pid                  → remove

GET    /api/visits/:pid                    → list (filters: status,type,limit)
GET    /api/visits/visit/:vid              → single
POST   /api/visits/:pid                    → create
PUT    /api/visits/:pid/:vid               → update
DELETE /api/visits/:pid/:vid               → delete

POST   /api/upload/:pid                    → 5‑file multipart upload
GET    /static/patients/...                → mosaics & raw images

GET    /api/par-components/:pid/:vid       → list boxes
POST   /api/par-components/:pid/:vid       → add
PUT    /api/par-components/:pid/:vid/:cid  → update
DELETE /api/par-components/:pid/:vid/:cid  → remove

POST   /api/reports/:pid/generate          → create PDF & metadata
GET    /static/reports/:pid/:file.pdf      → download

GET    /api/similar-patients/:pid?k=10     → top‑k neighbours
```

> Full contract is defined and validated via Zod in `client/hooks/api.ts` and backend routers.

---

## 6. Python Requirements

requirements.txt

---

## 7. NPM Scripts (monorepo root)

| Script                      | Description                                  |
| --------------------------- | -------------------------------------------- |
| `pnpm dev`                  | Starts both backend (8000) & frontend (8080) |
| `pnpm --filter backend dev` | Backend only (ts-node + nodemon)             |
| `pnpm --filter client dev`  | Front‑end only (Vite)                        |
| `pnpm test`                 | Runs Vitest unit tests (client)              |
| `pnpm build`                | Builds production SPA (`dist/spa/`)          |
| `pnpm lint`                 | Runs ESLint + Prettier                       |

---

## 8. Integrating Your Own Detection Model

1. **Train** your YOLO‑v8 or Faster R‑CNN on the five‑view dataset.

2. **Save** checkpoint to `models/par_yolov8.pt` (or another path).

3. **Write** an inference wrapper in `backend/src/ai/predict-par.ts`:

   ```typescript
   //example
   import { load } from "ultralytics";
   const model = await load("models/par_yolov8.pt");

   export async function detectPAR(fullMosaicPng: string) {
     const preds = await model.predict(fullMosaicPng, { conf: 0.25 });
     return preds as PARComponent[];  // adapt to your shape
   }
   ```

4. **Hook** it in `routes/uploads.ts` right after the mosaic is written:

   * Replace `STUB_BOXES` logic with real predictions.
   * Compute weighted total via `calcPAR()` from `utils/weights.js`.

5. **Restart** the backend; the front‑end will render bounding‑boxes automatically.

---

## 9. Deployment Example

| Target              | Command                                | Notes                                                   |
| ------------------- | -------------------------------------- | ------------------------------------------------------- |
| **Docker (prod)**   | `docker compose up --build`            | sample `docker-compose.yml` included                    |
| **Render / Heroku** | `set PORT=8000 && NODE_ENV=production` | ensure `backend/data/` is persistent                    |
| **Static hosting**  | `pnpm build` → upload `dist/spa/`      | keep backend reachable at `/api`; update `VITE_API_URL` |

---

---

## 13. Licence & Acknowledgements

* Code released under the **MIT License** (see `LICENSE`).
* Uses open‑source libraries:

  * React, Tailwind, React‑Query
  * Express, Ultralytics YOLO‑v8, pdfkit, Sharp
  * OpenCV, NumPy, Matplotlib, scikit-image
