from fastapi import WebSocket
from typing import List, Dict
import json
from datetime import datetime

class WebSocketManager:
    """Manages WebSocket connections for real-time data streaming."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"📡 New WebSocket connection. Active connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"📡 WebSocket disconnected. Active connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_text(message)
        except Exception as e:
            print(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: str):
        """Broadcast a message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error broadcasting to connection: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)
    
    async def broadcast_market_data(self, market_data: Dict):
        """Broadcast market data to all connected clients."""
        message = {
            "type": "market_data",
            "data": market_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast(json.dumps(message))
    
    async def broadcast_trade_update(self, trade_data: Dict):
        """Broadcast trade updates to all connected clients."""
        message = {
            "type": "trade_update",
            "data": trade_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast(json.dumps(message))
    
    async def broadcast_portfolio_update(self, portfolio_data: Dict):
        """Broadcast portfolio updates to all connected clients."""
        message = {
            "type": "portfolio_update",
            "data": portfolio_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast(json.dumps(message))
    
    async def send_notification(self, notification: Dict, user_id: int = None):
        """Send notification to specific user or all users."""
        message = {
            "type": "notification",
            "data": notification,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if user_id:
            # In a real application, you'd track user-specific connections
            # For now, broadcast to all
            await self.broadcast(json.dumps(message))
        else:
            await self.broadcast(json.dumps(message))
