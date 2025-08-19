"""
PostgreSQL Service for Virtual Energy Trading Platform
Regular PostgreSQL with time-series functionality (fallback from TimescaleDB)
"""

import asyncpg
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging
import os

class PostgresService:
    def __init__(self):
        self.pool = None
        self.db_url = os.getenv("DATABASE_URL", "postgresql://tarunpinnem@localhost:5432/energy_trading")
        self.is_connected = False
        
    async def initialize(self):
        """Initialize PostgreSQL connection and create tables."""
        try:
            # Create connection pool
            self.pool = await asyncpg.create_pool(
                self.db_url,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            
            # Create tables
            await self._create_tables()
            self.is_connected = True
            
            print("✅ PostgreSQL connected and initialized successfully")
            print("📝 Using regular PostgreSQL with time-series tables (TimescaleDB fallback)")
            return True
            
        except Exception as e:
            print(f"❌ PostgreSQL connection failed: {e}")
            print("📝 To set up PostgreSQL:")
            print("   1. Ensure PostgreSQL is running: brew services start postgresql")
            print("   2. Create database: createdb energy_trading")
            print("   3. Set DATABASE_URL environment variable if needed")
            self.is_connected = False
            return False
    
    async def _create_tables(self):
        """Create all required tables with time-series structure."""
        async with self.pool.acquire() as conn:
            # Market data table with time-series structure
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS market_data (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMPTZ NOT NULL,
                    price DECIMAL(10,4),
                    demand DECIMAL(12,2),
                    supply DECIMAL(12,2),
                    renewable_percentage DECIMAL(5,2),
                    solar_mw DECIMAL(10,2),
                    wind_mw DECIMAL(10,2),
                    data_source VARCHAR(50),
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            ''')
            
            # Create index for time-series queries
            await conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_market_data_timestamp 
                ON market_data (timestamp DESC);
            ''')
            
            # Day-ahead bids table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS day_ahead_bids (
                    id SERIAL PRIMARY KEY,
                    bid_id VARCHAR(50) UNIQUE NOT NULL,
                    user_id VARCHAR(50) NOT NULL,
                    hour INTEGER,
                    action VARCHAR(10),
                    price DECIMAL(10,4),
                    quantity DECIMAL(10,2),
                    status VARCHAR(20),
                    submitted_at TIMESTAMPTZ,
                    executed_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            ''')
            
            await conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_bids_user_time 
                ON day_ahead_bids (user_id, submitted_at DESC);
            ''')
            
            # Trading positions table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS trading_positions (
                    id SERIAL PRIMARY KEY,
                    position_id VARCHAR(50) UNIQUE NOT NULL,
                    user_id VARCHAR(50) NOT NULL,
                    hour INTEGER,
                    quantity DECIMAL(10,2),
                    day_ahead_price DECIMAL(10,4),
                    real_time_price DECIMAL(10,4),
                    pnl DECIMAL(12,2),
                    timestamp TIMESTAMPTZ,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            ''')
            
            await conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_positions_user_time 
                ON trading_positions (user_id, timestamp DESC);
            ''')
            
            # Real-time settlements table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS real_time_settlements (
                    id SERIAL PRIMARY KEY,
                    position_id VARCHAR(50) NOT NULL,
                    settlement_price DECIMAL(10,4),
                    interval_pnl DECIMAL(12,2),
                    cumulative_pnl DECIMAL(12,2),
                    timestamp TIMESTAMPTZ,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            ''')
            
            await conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_settlements_position_time 
                ON real_time_settlements (position_id, timestamp DESC);
            ''')
            
            # Portfolio snapshots table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS portfolio_snapshots (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(50) NOT NULL,
                    cash_balance DECIMAL(15,2),
                    total_pnl DECIMAL(12,2),
                    total_positions INTEGER,
                    active_bids INTEGER,
                    portfolio_value DECIMAL(15,2),
                    timestamp TIMESTAMPTZ,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            ''')
            
            await conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_portfolio_user_time 
                ON portfolio_snapshots (user_id, timestamp DESC);
            ''')
            
            print("📊 PostgreSQL tables and indexes created successfully")
    
    async def store_market_data(self, data: Dict[str, Any]):
        """Store real-time market data."""
        if not self.is_connected:
            return False
            
        try:
            async with self.pool.acquire() as conn:
                timestamp_str = data["timestamp"]
                if timestamp_str.endswith('Z'):
                    timestamp_str = timestamp_str[:-1] + '+00:00'
                timestamp = datetime.fromisoformat(timestamp_str)
                
                await conn.execute('''
                    INSERT INTO market_data (
                        timestamp, price, demand, supply, renewable_percentage,
                        solar_mw, wind_mw, data_source
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT DO NOTHING;
                ''', 
                    timestamp,
                    float(data.get("price", 0)),
                    float(data.get("demand", 0)),
                    float(data.get("supply", 0)),
                    float(data.get("renewable_percentage", 0)),
                    float(data.get("solar_mw", 0)),
                    float(data.get("wind_mw", 0)),
                    data.get("data_source", "unknown")
                )
                return True
        except Exception as e:
            logging.error(f"Failed to store market data: {e}")
            return False
    
    async def store_day_ahead_bid(self, bid: Dict[str, Any]):
        """Store day-ahead bid."""
        if not self.is_connected:
            return False
            
        try:
            async with self.pool.acquire() as conn:
                submitted_at_str = bid["submittedAt"]
                if submitted_at_str.endswith('Z'):
                    submitted_at_str = submitted_at_str[:-1] + '+00:00'
                submitted_at = datetime.fromisoformat(submitted_at_str)
                
                executed_at = None
                if bid.get("executedAt"):
                    executed_at_str = bid["executedAt"]
                    if executed_at_str.endswith('Z'):
                        executed_at_str = executed_at_str[:-1] + '+00:00'
                    executed_at = datetime.fromisoformat(executed_at_str)
                
                await conn.execute('''
                    INSERT INTO day_ahead_bids (
                        bid_id, user_id, hour, action, price, quantity,
                        status, submitted_at, executed_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (bid_id) DO UPDATE SET
                        status = EXCLUDED.status,
                        executed_at = EXCLUDED.executed_at;
                ''',
                    bid["id"],
                    bid.get("userId", "default_user"),
                    int(bid["hour"]),
                    bid["action"],
                    float(bid["price"]),
                    float(bid["quantity"]),
                    bid["status"],
                    submitted_at,
                    executed_at
                )
                return True
        except Exception as e:
            logging.error(f"Failed to store day-ahead bid: {e}")
            return False
    
    async def store_trading_position(self, position: Dict[str, Any]):
        """Store trading position."""
        if not self.is_connected:
            return False
            
        try:
            async with self.pool.acquire() as conn:
                timestamp_str = position["timestamp"]
                if timestamp_str.endswith('Z'):
                    timestamp_str = timestamp_str[:-1] + '+00:00'
                timestamp = datetime.fromisoformat(timestamp_str)
                
                await conn.execute('''
                    INSERT INTO trading_positions (
                        position_id, user_id, hour, quantity,
                        day_ahead_price, real_time_price, pnl, timestamp
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (position_id) DO UPDATE SET
                        real_time_price = EXCLUDED.real_time_price,
                        pnl = EXCLUDED.pnl,
                        updated_at = NOW();
                ''',
                    position["id"],
                    position.get("userId", "default_user"),
                    int(position["hour"]),
                    float(position["quantity"]),
                    float(position["dayAheadPrice"]),
                    float(position.get("realTimePrice", position["dayAheadPrice"])),
                    float(position.get("pnl", 0)),
                    timestamp
                )
                return True
        except Exception as e:
            logging.error(f"Failed to store trading position: {e}")
            return False
    
    async def store_portfolio_snapshot(self, portfolio: Dict[str, Any], user_id: str = "default_user"):
        """Store portfolio snapshot."""
        if not self.is_connected:
            return False
            
        try:
            async with self.pool.acquire() as conn:
                timestamp = datetime.now()
                
                await conn.execute('''
                    INSERT INTO portfolio_snapshots (
                        user_id, cash_balance, total_pnl, total_positions,
                        active_bids, portfolio_value, timestamp
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7);
                ''',
                    user_id,
                    float(portfolio.get("cashBalance", 0)),
                    float(portfolio.get("totalPnl", 0)),
                    len(portfolio.get("positions", [])),
                    len(portfolio.get("dayAheadBids", [])),
                    float(portfolio.get("portfolioValue", 0)),
                    timestamp
                )
                return True
        except Exception as e:
            logging.error(f"Failed to store portfolio snapshot: {e}")
            return False
    
    async def get_market_data_history(self, hours: int = 24) -> List[Dict]:
        """Get market data history."""
        if not self.is_connected:
            return []
            
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch('''
                    SELECT timestamp, price, demand, supply, renewable_percentage,
                           solar_mw, wind_mw, data_source
                    FROM market_data 
                    WHERE timestamp >= NOW() - INTERVAL '%s hours'
                    ORDER BY timestamp DESC
                    LIMIT 1000;
                ''' % hours)
                
                return [dict(row) for row in rows]
        except Exception as e:
            logging.error(f"Failed to get market data history: {e}")
            return []
    
    async def get_portfolio_analytics(self, user_id: str = "default_user", days: int = 7) -> Dict:
        """Get portfolio analytics from PostgreSQL."""
        if not self.is_connected:
            return {}
            
        try:
            async with self.pool.acquire() as conn:
                # Get portfolio performance metrics (simulated time buckets)
                pnl_data = await conn.fetch('''
                    SELECT 
                        DATE_TRUNC('hour', timestamp) as hour,
                        AVG(total_pnl) as avg_pnl,
                        MAX(total_pnl) as max_pnl,
                        MIN(total_pnl) as min_pnl
                    FROM portfolio_snapshots 
                    WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '%s days'
                    GROUP BY DATE_TRUNC('hour', timestamp)
                    ORDER BY hour;
                ''' % days, user_id)
                
                # Get trading statistics
                trading_stats = await conn.fetchrow('''
                    SELECT 
                        COUNT(*) as total_bids,
                        COUNT(CASE WHEN status = 'executed' THEN 1 END) as executed_bids,
                        AVG(price) as avg_bid_price,
                        SUM(quantity) as total_quantity
                    FROM day_ahead_bids 
                    WHERE user_id = $1 AND submitted_at >= NOW() - INTERVAL '%s days';
                ''' % days, user_id)
                
                return {
                    "pnl_history": [dict(row) for row in pnl_data],
                    "trading_stats": dict(trading_stats) if trading_stats else {},
                    "data_source": "PostgreSQL Analytics"
                }
        except Exception as e:
            logging.error(f"Failed to get portfolio analytics: {e}")
            return {}
    
    async def get_renewable_trends(self, hours: int = 48) -> List[Dict]:
        """Get renewable energy trends."""
        if not self.is_connected:
            return []
            
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch('''
                    SELECT 
                        DATE_TRUNC('hour', timestamp) as hour,
                        AVG(renewable_percentage) as avg_renewable_pct,
                        AVG(solar_mw) as avg_solar_mw,
                        AVG(wind_mw) as avg_wind_mw,
                        AVG(price) as avg_price
                    FROM market_data 
                    WHERE timestamp >= NOW() - INTERVAL '%s hours'
                    GROUP BY DATE_TRUNC('hour', timestamp)
                    ORDER BY hour;
                ''' % hours)
                
                return [dict(row) for row in rows]
        except Exception as e:
            logging.error(f"Failed to get renewable trends: {e}")
            return []
    
    async def close(self):
        """Close PostgreSQL connection."""
        if self.pool:
            await self.pool.close()
            self.is_connected = False
            print("🔌 PostgreSQL connection closed")

# Global PostgreSQL service instance
postgres_service = PostgresService()
