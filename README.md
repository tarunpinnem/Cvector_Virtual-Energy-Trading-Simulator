# ⚡ Virtual Energy Trading Platform

A full-stack platform for real-time energy market analytics, AI-powered bid suggestions, and portfolio management, integrating with [GridStatus.io](https://gridstatus.io/) for live electricity market data.

---

## Features

- **Live Market Data**: Real-time prices, demand, supply, and renewable mix from GridStatus.io.
- **AI Bid Suggestions**: Smart, ML-powered trading recommendations with confidence scoring.
- **Analytics Dashboard**: Performance metrics, price forecasts, and trend analysis.
- **Portfolio Management**: Track cash balance, P&L, active positions, and bids.
- **Modern UI**: Responsive React frontend with professional dashboards and visualizations.
- **Backend API**: FastAPI backend with Kafka and TimescaleDB integration for streaming and storage.

---

## Project Structure

```
.
├── backend/
│   ├── enhanced_main.py         # FastAPI backend with enhanced endpoints
│   ├── kafka_main.py            # Kafka consumer/producer logic
│   ├── kafka_streaming_service.py
│   ├── postgres_service.py      # Postgres/TimescaleDB integration
│   ├── timescale_service.py
│   ├── setup_timescale.sh
│   ├── requirements.txt
│   └── app/
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main React app
│   │   ├── BidSuggestions.jsx   # AI bid suggestions component
│   │   ├── Analytics.jsx        # Analytics dashboard
│   │   ├── AdvancedBidEngine.js # Advanced AI/ML logic
│   │   ├── QuickMLBidEngine.js  # ML model integration
│   │   └── ...                  # Other components and pages
│   ├── INTEGRATION_GUIDE.md     # Frontend integration instructions
│   ├── index.html
│   ├── package.json
│   └── ...
├── grid_io_integration_demo.ipynb # Jupyter notebook for GridStatus.io API demo
├── .env
└── README.md
```

---

## Getting Started

### 1. Clone the Repository

```sh
git clone https://github.com/tarunpinnem/Cvector_Virtual-Energy-Trading-Simulator
cd virtual-energy-trading-platform
```

### 2. Backend Setup

- **Install dependencies**:
  ```sh
  cd backend
  pip install -r requirements.txt
  ```
- **Configure environment**:  
  Copy `.env` and set your `DATABASE_URL` and `GRIDSTATUS_API_KEY`.

- **Start backend server**:
  cd backend
  python kafka_main.py

### 3. Frontend Setup

- **Install dependencies**:
  ```sh
  cd frontend
  npm install
  ```
- **Configure environment**:  
  Edit `frontend/.env` for API URLs and GridStatus.io keys.

- **Start frontend**:
  ```sh
  npm run dev
  ```

- Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## Integration with GridStatus.io

- Uses [GridStatus.io](https://gridstatus.io/) for real-time ISO/RTO data.
- See [grid_io_integration_demo.ipynb](grid_io_integration_demo.ipynb) for API usage examples.

---

## AI & Analytics

- **Bid Suggestions**:  
  See [`frontend/src/BidSuggestions.jsx`](frontend/src/BidSuggestions.jsx) and [`frontend/src/QuickMLBidEngine.js`](frontend/src/QuickMLBidEngine.js).
- **Analytics Dashboard**:  
  See [`frontend/src/Analytics.jsx`](frontend/src/Analytics.jsx).

---

## Customization

- See [frontend/INTEGRATION_GUIDE.md](frontend/INTEGRATION_GUIDE.md) for instructions on customizing analytics, bid logic, and UI.

---

## License

MIT License

---

## Acknowledgements

- [GridStatus.io](https://gridstatus.io/) for market data API
- [React](https://react.dev/), [FastAPI](https://fastapi.tiangolo.com/), [TimescaleDB](https://www.timescale.com/), [Kafka](https://kafka.apache.org/)

---

## Screenshots

> Add screenshots of the dashboard, bid suggestions,
