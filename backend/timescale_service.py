"""
TimescaleDB Service for Virtual Energy Trading Platform
Handles time-series data storage and retrieval
"""

import asyncpg
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging
import os

class TimescaleService:
    def __init__(self):
        self.pool = None
        self.db_url = os.getenv("TIMESCALE_URL", "postgresql://postgres:password@localhost:5432/energy_trading")
        self.is_connected = False
        
    async def initialize(self):
        """Initialize TimescaleDB connection and create tables."""
        try:
            # Create connection pool
            self.pool = await asyncpg.create_pool(
                self.db_url,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            
            # Create tables and hypertables
            await self._create_tables()
            self.is_connected = True
            
            print("✅ TimescaleDB connected and initialized successfully")
            return True
            
        except Exception as e:
            print(f"❌ TimescaleDB connection failed: {e}")
            print("📝 To set up TimescaleDB:")
            print("   1. Install PostgreSQL with TimescaleDB extension")
            print("   2. Create database: createdb energy_trading")
            print("   3. Enable extension: psql -d energy_trading -c 'CREATE EXTENSION IF NOT EXISTS timescaledb;'")
            print("   4. Set TIMESCALE_URL environment variable if needed")
            self.is_connected = False
            return False
    
    async def _create_tables(self):
        """Create all required tables and hypertables."""
        async with self.pool.acquire() as conn:
            # Market data table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS market_data (
                    time TIMESTAMPTZ NOT NULL,
                    price DECIMAL(10,4),
                    demand DECIMAL(12,2),
                    supply DECIMAL(12,2),
                    renewable_percentage DECIMAL(5,2),
                    solar_mw DECIMAL(10,2),
                    wind_mw DECIMAL(10,2),
                    data_source VARCHAR(50),
                    PRIMARY KEY (time)
                );
            ''')
            
            # Create hypertable for market data
            await conn.execute('''
                SELECT create_hypertable('market_data', 'time', if_not_exists => TRUE);
            ''')
            
            # Day-ahead bids table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS day_ahead_bids (
                    time TIMESTAMPTZ NOT NULL,
                    bid_id VARCHAR(50) NOT NULL,
                    user_id VARCHAR(50) NOT NULL,
                    hour INTEGER,
                    action VARCHAR(10),
                    price DECIMAL(10,4),
                    quantity DECIMAL(10,2),
                    status VARCHAR(20),
                    submitted_at TIMESTAMPTZ,
                    executed_at TIMESTAMPTZ,
                    PRIMARY KEY (time, bid_id)
                );
            ''')
            
            await conn.execute('''
                SELECT create_hypertable('day_ahead_bids', 'time', if_not_exists => TRUE);
            ''')
            
            # Trading positions table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS trading_positions (
                    time TIMESTAMPTZ NOT NULL,
                    position_id VARCHAR(50) NOT NULL,
                    user_id VARCHAR(50) NOT NULL,
                    hour INTEGER,
                    quantity DECIMAL(10,2),
                    day_ahead_price DECIMAL(10,4),
                    real_time_price DECIMAL(10,4),
                    pnl DECIMAL(12,2),
                    PRIMARY KEY (time, position_id)
                );
            ''')
            
            await conn.execute('''
                SELECT create_hypertable('trading_positions', 'time', if_not_exists => TRUE);
            ''')
            
            # Real-time settlements table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS real_time_settlements (
                    time TIMESTAMPTZ NOT NULL,
                    position_id VARCHAR(50) NOT NULL,
                    settlement_price DECIMAL(10,4),
                    interval_pnl DECIMAL(12,2),
                    cumulative_pnl DECIMAL(12,2),
                    PRIMARY KEY (time, position_id)
                );
            ''')
            
            await conn.execute('''
                SELECT create_hypertable('real_time_settlements', 'time', if_not_exists => TRUE);
            ''')
            
            # Portfolio snapshots table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS portfolio_snapshots (
                    time TIMESTAMPTZ NOT NULL,
                    user_id VARCHAR(50) NOT NULL,
                    cash_balance DECIMAL(15,2),
                    total_pnl DECIMAL(12,2),
                    total_positions INTEGER,
                    active_bids INTEGER,
                    portfolio_value DECIMAL(15,2),
                    PRIMARY KEY (time, user_id)
                );
            ''')
            
            await conn.execute('''
                SELECT create_hypertable('portfolio_snapshots', 'time', if_not_exists => TRUE);
            ''')
            
            print("📊 TimescaleDB tables and hypertables created successfully")
    
    async def store_market_data(self, data: Dict[str, Any]):
        """Store real-time market data."""
        if not self.is_connected:
            return False
            
        try:
            async with self.pool.acquire() as conn:
                await conn.execute('''
                    INSERT INTO market_data (
                        time, price, demand, supply, renewable_percentage,
                        solar_mw, wind_mw, data_source
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (time) DO UPDATE SET
                        price = EXCLUDED.price,
                        demand = EXCLUDED.demand,
                        supply = EXCLUDED.supply,
                        renewable_percentage = EXCLUDED.renewable_percentage,
                        solar_mw = EXCLUDED.solar_mw,
                        wind_mw = EXCLUDED.wind_mw,
                        data_source = EXCLUDED.data_source;
                ''', 
                    datetime.fromisoformat(data["timestamp"].replace('Z', '+00:00')),
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
                submitted_at = datetime.fromisoformat(bid["submittedAt"].replace('Z', '+00:00'))
                executed_at = None
                if bid.get("executedAt"):
                    executed_at = datetime.fromisoformat(bid["executedAt"].replace('Z', '+00:00'))
                
                await conn.execute('''
                    INSERT INTO day_ahead_bids (
                        time, bid_id, user_id, hour, action, price, quantity,
                        status, submitted_at, executed_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (time, bid_id) DO UPDATE SET
                        status = EXCLUDED.status,
                        executed_at = EXCLUDED.executed_at;
                ''',
                    submitted_at,
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
                timestamp = datetime.fromisoformat(position["timestamp"].replace('Z', '+00:00'))
                
                await conn.execute('''
                    INSERT INTO trading_positions (
                        time, position_id, user_id, hour, quantity,
                        day_ahead_price, real_time_price, pnl
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (time, position_id) DO UPDATE SET
                        real_time_price = EXCLUDED.real_time_price,
                        pnl = EXCLUDED.pnl;
                ''',
                    timestamp,
                    position["id"],
                    position.get("userId", "default_user"),
                    int(position["hour"]),
                    float(position["quantity"]),
                    float(position["dayAheadPrice"]),
                    float(position.get("realTimePrice", position["dayAheadPrice"])),
                    float(position.get("pnl", 0))
                )
                return True
        except Exception as e:
            logging.error(f"Failed to store trading position: {e}")
            return False
    
    async def store_real_time_settlement(self, settlement: Dict[str, Any]):
        """Store real-time settlement data."""
        if not self.is_connected:
            return False
            
        try:
            async with self.pool.acquire() as conn:
                timestamp = datetime.fromisoformat(settlement["timestamp"].replace('Z', '+00:00'))
                
                await conn.execute('''
                    INSERT INTO real_time_settlements (
                        time, position_id, settlement_price, interval_pnl, cumulative_pnl
                    ) VALUES ($1, $2, $3, $4, $5);
                ''',
                    timestamp,
                    settlement["position_id"],
                    float(settlement["settlement_price"]),
                    float(settlement["interval_pnl"]),
                    float(settlement["cumulative_pnl"])
                )
                return True
        except Exception as e:
            logging.error(f"Failed to store real-time settlement: {e}")
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
                        time, user_id, cash_balance, total_pnl, total_positions,
                        active_bids, portfolio_value
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7);
                ''',
                    timestamp,
                    user_id,
                    float(portfolio.get("cashBalance", 0)),
                    float(portfolio.get("totalPnl", 0)),
                    len(portfolio.get("positions", [])),
                    len(portfolio.get("dayAheadBids", [])),
                    float(portfolio.get("portfolioValue", 0))
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
                    SELECT time, price, demand, supply, renewable_percentage,
                           solar_mw, wind_mw, data_source
                    FROM market_data 
                    WHERE time >= NOW() - INTERVAL '%s hours'
                    ORDER BY time DESC;
                ''', hours)
                
                return [dict(row) for row in rows]
        except Exception as e:
            logging.error(f"Failed to get market data history: {e}")
            return []
    
    async def get_portfolio_analytics(self, user_id: str = "default_user", days: int = 7) -> Dict:
        """Get portfolio analytics from TimescaleDB."""
        if not self.is_connected:
            return {}
            
        try:
            async with self.pool.acquire() as conn:
                # Get portfolio performance metrics
                pnl_data = await conn.fetch('''
                    SELECT 
                        time_bucket('1 hour', time) as hour,
                        AVG(total_pnl) as avg_pnl,
                        MAX(total_pnl) as max_pnl,
                        MIN(total_pnl) as min_pnl
                    FROM portfolio_snapshots 
                    WHERE user_id = $1 AND time >= NOW() - INTERVAL '%s days'
                    GROUP BY hour
                    ORDER BY hour;
                ''', user_id, days)
                
                # Get trading statistics
                trading_stats = await conn.fetchrow('''
                    SELECT 
                        COUNT(*) as total_bids,
                        COUNT(CASE WHEN status = 'executed' THEN 1 END) as executed_bids,
                        AVG(price) as avg_bid_price,
                        SUM(quantity) as total_quantity
                    FROM day_ahead_bids 
                    WHERE user_id = $1 AND time >= NOW() - INTERVAL '%s days';
                ''', user_id, days)
                
                return {
                    "pnl_history": [dict(row) for row in pnl_data],
                    "trading_stats": dict(trading_stats) if trading_stats else {},
                    "data_source": "TimescaleDB Analytics"
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
                        time_bucket('1 hour', time) as hour,
                        AVG(renewable_percentage) as avg_renewable_pct,
                        AVG(solar_mw) as avg_solar_mw,
                        AVG(wind_mw) as avg_wind_mw,
                        AVG(price) as avg_price
                    FROM market_data 
                    WHERE time >= NOW() - INTERVAL '%s hours'
                    GROUP BY hour
                    ORDER BY hour;
                ''', hours)
                
                return [dict(row) for row in rows]
        except Exception as e:
            logging.error(f"Failed to get renewable trends: {e}")
            return []
    
    async def close(self):
        """Close TimescaleDB connection."""
        if self.pool:
            await self.pool.close()
            self.is_connected = False
            print("🔌 TimescaleDB connection closed")

# Global TimescaleDB service instance
timescale_service = TimescaleService()
