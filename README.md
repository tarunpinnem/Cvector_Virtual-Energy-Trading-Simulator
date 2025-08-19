# Virtual Energy Trading Platform

A comprehensive simulation platform for virtual energy trading with real-time market data integration, advanced analytics, and portfolio management.

## 🚀 Features

### Core Trading Functionality
- **Day-Ahead Market Trading**: Submit up to 10 bids per hour timeslot before 11am
- **Real-Time Market Monitoring**: 5-minute interval price tracking
- **Portfolio Management**: Contract tracking and position management
- **P&L Calculation**: Real-time profit/loss tracking with detailed analytics

### Advanced Features
- **Live Market Data**: Integration with gridstatus.io API for real market data
- **Interactive Visualizations**: Advanced charts for price analysis and market trends
- **Risk Management**: Position limits, exposure tracking, and risk metrics
- **Historical Analysis**: Backtesting capabilities and performance analytics
- **Real-time Updates**: WebSocket connections for live data streaming

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Arco Design** for UI components
- **Recharts** for advanced data visualizations
- **React Query** for data fetching and caching
- **Zustand** for state management

### Backend
- **FastAPI** with Python 3.11+
- **SQLAlchemy** for database ORM
- **WebSockets** for real-time communication
- **Pydantic** for data validation
- **httpx** for external API integration

### Database & Tools
- **SQLite** for development (PostgreSQL ready)
- **Alembic** for database migrations
- **pytest** for testing
- **Black** & **isort** for code formatting

## 📁 Project Structure

```
cvector/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── stores/         # State management
│   │   ├── types/          # TypeScript definitions
│   │   └── utils/          # Utility functions
│   ├── package.json
│   └── vite.config.ts
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core functionality
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── requirements.txt
│   └── main.py
├── shared/                  # Shared types and utilities
└── docs/                   # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- pip or poetry

### Installation

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd cvector
   ```

2. **Backend setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend setup:**
   ```bash
   cd frontend
   npm install
   ```

### Development

1. **Start backend server:**
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

2. **Start frontend development server:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 🔧 Configuration

### Environment Variables

Create `.env` files in both frontend and backend directories:

**Backend (.env):**
```
DATABASE_URL=sqlite:///./energy_trading.db
GRIDSTATUS_API_KEY=your_api_key_here
CORS_ORIGINS=http://localhost:5173
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:8000
```

## 📊 API Integration

The platform integrates with gridstatus.io for real-time energy market data:
- Real-time pricing data
- Load forecasts
- Market statistics
- Historical data analysis

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 📈 Trading Features

### Day-Ahead Market
- Submit bids with price and quantity
- Deadline enforcement (11am cutoff)
- Automatic settlement at clearing price
- Bid history and analytics

### Real-Time Market
- 5-minute interval pricing
- Automatic contract offsetting
- Real-time P&L updates
- Market volatility tracking

### Portfolio Management
- Position tracking
- Risk metrics calculation
- Performance analytics
- Historical trade analysis

## 🚀 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### Manual Deployment
Detailed deployment instructions for production environments.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Developed with ❤️ for efficient energy trading simulation**
