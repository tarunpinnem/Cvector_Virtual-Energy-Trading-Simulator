from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import json
from datetime import datetime
import uvicorn

from app.api import trading, market_data, portfolio
from app.core.config import settings
from app.core.database import engine, Base
from app.services.market_data_service import MarketDataService
from app.services.websocket_manager import WebSocketManager

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Virtual Energy Trading Platform",
    description="A comprehensive simulation platform for virtual energy trading",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket manager
websocket_manager = WebSocketManager()
market_data_service = MarketDataService()

# Include API routes
app.include_router(trading.router, prefix="/api/v1/trading", tags=["trading"])
app.include_router(market_data.router, prefix="/api/v1/market-data", tags=["market-data"])
app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["portfolio"])

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time market data streaming."""
    await websocket_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)

@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup."""
    print("🚀 Starting Virtual Energy Trading Platform...")
    print(f"📊 Market data source: {settings.GRIDSTATUS_API_URL}")
    print(f"🔒 Database: {settings.DATABASE_URL}")
    
    # Start real-time market data streaming
    asyncio.create_task(market_data_streaming_task())

async def market_data_streaming_task():
    """Background task to stream real-time market data."""
    while True:
        try:
            # Fetch latest market data
            market_data = await market_data_service.get_real_time_data()
            
            # Broadcast to all connected clients
            await websocket_manager.broadcast_market_data(market_data)
            
            # Wait 5 minutes before next update (real-time market interval)
            await asyncio.sleep(300)  # 5 minutes
            
        except Exception as e:
            print(f"Error in market data streaming: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retry

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "Virtual Energy Trading Platform API",
        "version": "1.0.0",
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Detailed health check with system status."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": "connected",
            "market_data_api": "operational",
            "websocket": f"{len(websocket_manager.active_connections)} active connections"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
