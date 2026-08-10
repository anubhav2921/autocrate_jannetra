# JanNetra Project Architecture

This document provides a detailed overview of the structural and systemic architecture of **JanNetra**, an Advanced Governance Monitoring & Analysis Dashboard.

## 1. High-Level Overview

JanNetra operates on a decoupled client-server architecture:
- **Backend (`/backend`)**: A highly concurrent Python/FastAPI service responsible for data ingestion, AI-driven natural language processing (NLP), fake news detection, and API provisioning. It uses asynchronous MongoDB (Motor) for data persistence.
- **Frontend (`/frontend`)**: A React Single Page Application (SPA) built with Vite, offering real-time dashboards, risk heatmaps, and signal monitoring interfaces.

---

## 2. Full Project Directory Structure

```text
jannetra/
├── backend/                  # Core Python FastAPI Application
│   ├── app/
│   │   ├── routes/           # API Endpoints (Controllers)
│   │   ├── scrapers/         # Data Ingestion Modules
│   │   ├── services/         # Core Business & AI Logic
│   │   ├── main.py           # FastAPI Application Entrypoint
│   │   ├── models.py         # Pydantic & MongoDB Schemas
│   │   ├── mongodb.py        # Database Connection Management
│   │   ├── firebase_admin_config.py # Auth Configuration
│   │   └── utils.py          # Shared Helper Functions
│   ├── scripts/              # Utility scripts (e.g., db checks, api tests)
│   ├── requirements.txt      # Python Dependencies
│   └── run_backend.ps1       # Startup Script
│
├── frontend/                 # React UI Application (Vite)
│   ├── src/
│   │   ├── assets/           # Static Assets (Images, Icons)
│   │   ├── components/       # Reusable UI Components
│   │   ├── config/           # App Configurations
│   │   ├── context/          # React Contexts (State Management)
│   │   ├── pages/            # Application Views (Routable)
│   │   ├── services/         # API Clients & Auth Logic
│   │   ├── utils/            # Frontend Helper Functions
│   │   ├── App.jsx           # Main App Component & Router
│   │   └── main.jsx          # React DOM Entrypoint
│   ├── package.json          # Node Dependencies & Scripts
│   └── vite.config.js        # Vite Build Configuration
│
└── README.md                 # Primary Project Documentation
```

---

## 3. Backend Architecture Detail

The backend follows a layered architecture pattern:

### A. Scrapers (Data Ingestion Layer)
Located in `backend/app/scrapers/`, this layer harvests unstructured data:
- `gov_portal_scraper.py`: Monitors official government portals (e.g., PIB).
- `news_scraper.py`: Gathers articles from verified news outlets.
- `reddit_scraper.py`: Ingests community sentiment from subreddits.
- `rss_scraper.py`: Reads syndication feeds from various sources.

### B. Services (Business & AI Layer)
Located in `backend/app/services/`, containing the heavy lifting:
- **`ai_service.py` & `nlp_service.py`**: Executes sentiment analysis, entity extraction, and anger dynamics using DistilBERT/Transformers.
- **`fake_news_detector.py`**: Validates content credibility using clickbait analysis and source verification heuristics.
- **`data_pipeline.py`**: Orchestrates the 30-minute automated cycle (Ingest -> Analyze -> Cluster -> Store).
- **`alert_service.py` & `sms_service.py`**: Handles priority alerts and notifications.
- **`gri_service.py`**: Calculates the composite Governance Risk Index.

### C. Routes (API Layer)
Located in `backend/app/routes/`, exposing RESTful endpoints:
- **Dashboards & Analytics**: `dashboard.py`, `analytics.py`, `leaderboard.py`
- **Data Entities**: `articles.py`, `citizen_reports.py`, `complaints.py`
- **System & Monitoring**: `system_monitoring.py`, `scanner.py`, `chatbot.py`
- **Core Governance**: `signal_problems.py`, `alerts.py`, `resolutions.py`

---

## 4. Frontend Architecture Detail

The frontend is a component-driven React application designed for high-density data visualization.

### A. Pages (Views)
Located in `frontend/src/pages/`, mapping to routes:
- **Command & Dashboards**: `Dashboard.jsx`, `PulseDashboard.jsx`, `Analytics.jsx`
- **Data Monitoring**: `SignalMonitor.jsx`, `MapView.jsx`, `SystemMonitoring.jsx`
- **Issues & Actions**: `ProblemDetail.jsx`, `WorkingProblems.jsx`, `Resolutions.jsx`
- **Auth & Access**: `Login.jsx`, `Signup.jsx`, `PhoneAuth.jsx`, `LandingPage.jsx`

### B. Components (UI Modules)
Located in `frontend/src/components/`, isolating UI logic:
- `Navbar.jsx` / `Sidebar.jsx`: Global navigation.
- `RiskHeatmapMap.jsx`: Geospatial visualization of governance risks.
- `ExportReportModal.jsx` / `LocationFilter.jsx`: Utility components.
- Subdirectories like `ui/`, `Landing/`, `Ballpit/` for specific thematic elements.

### C. Services (Client-Side API)
Located in `frontend/src/services/`:
- `apiClient.js` / `api.js`: Axios instances configured with interceptors for JWT token injection and backend communication.
- `authService.js`: Integrates with Firebase for identity management.

---

## 5. Data Flow & Execution Pipeline

1. **Scheduled Ingestion**: `APScheduler` triggers the scrapers every 30 minutes.
2. **Harvest**: Scrapers pull raw JSON/HTML data and normalize it into internal memory.
3. **AI Evaluation**: The pipeline passes normalized text to PyTorch/Transformers to extract sentiment, anger score, and detect potential fake news.
4. **Clustering & Scoring**: Individual reports are semantically grouped into `SignalProblem` clusters. A Priority Score and Governance Risk Score are assigned.
5. **Persistence**: The async `Motor` client commits the clusters, raw articles, and metrics to MongoDB.
6. **Consumption**: The React frontend polls or fetches (via standard HTTP requests to FastAPI routes) these clusters and metrics to render the Mood Dashboard, Risk Map, and Signal Monitor.

---

## 6. Technology Stack Summary

- **Core Backend**: Python 3.11+, FastAPI, Uvicorn
- **AI/ML**: PyTorch, HuggingFace Transformers (DistilBERT), custom heuristic engines.
- **Database**: MongoDB (via Motor driver)
- **Authentication**: Firebase Auth (integrated on both React client and FastAPI via middleware).
- **Core Frontend**: React.js, Vite, TailwindCSS (inferred via standard Vite setups).
