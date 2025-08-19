"""
Kafka Streaming Service for Energy Trading Platform
Handles market data ingestion and order events streaming
"""

import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError
import asyncio
import threading

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnergyTradingKafkaService:
    """Kafka service for energy trading market data and order events."""
    
    def __init__(self, bootstrap_servers: str = "localhost:9092"):
        self.bootstrap_servers = bootstrap_servers
        self.producer = None
        self.consumers = {}
        self.is_connected = False
        
        # Topic definitions
        self.topics = {
            "market_data": "energy.market.prices",
            "bid_submissions": "energy.trading.bids.submitted", 
            "trade_executions": "energy.trading.trades.executed",
            "portfolio_updates": "energy.portfolio.updates",
            "alerts": "energy.alerts"
        }
        
    def connect(self):
        """Initialize Kafka producer."""
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v, default=str).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                acks='all',  # Wait for all replicas
                retries=3,
                batch_size=16384,
                linger_ms=10,  # Small delay for batching
                compression_type='snappy'
            )
            self.is_connected = True
            logger.info("✅ Kafka producer connected successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to connect Kafka producer: {e}")
            self.is_connected = False
            return False
    
    def disconnect(self):
        """Close Kafka connections."""
        if self.producer:
            self.producer.close()
        for consumer in self.consumers.values():
            consumer.close()
        self.is_connected = False
        logger.info("🔌 Kafka connections closed")
    
    # Market Data Streaming
    def publish_market_data(self, market_data: Dict[str, Any]) -> bool:
        """Publish real-time market data to Kafka."""
        try:
            if not self.is_connected:
                self.connect()
                
            message = {
                "timestamp": datetime.now().isoformat(),
                "current_price": market_data.get("current_price"),
                "change_24h": market_data.get("change_24h"),
                "high_24h": market_data.get("high_24h"),
                "low_24h": market_data.get("low_24h"),
                "volume": market_data.get("volume"),
                "renewable_percentage": market_data.get("fuel_mix", {}).get("renewable_percentage", 0),
                "solar_mw": market_data.get("fuel_mix", {}).get("solar_mw", 0),
                "wind_mw": market_data.get("fuel_mix", {}).get("wind_mw", 0),
                "source": "real_time_market_feed"
            }
            
            future = self.producer.send(
                self.topics["market_data"],
                key="market_update",
                value=message
            )
            
            # Non-blocking send with callback
            future.add_callback(lambda metadata: logger.info(f"📊 Market data sent to partition {metadata.partition}"))
            future.add_errback(lambda exc: logger.error(f"❌ Market data send failed: {exc}"))
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to publish market data: {e}")
            return False
    
    # Order Events Streaming  
    def publish_bid_submitted(self, bid_data: Dict[str, Any]) -> bool:
        """Publish bid submission event to Kafka."""
        try:
            if not self.is_connected:
                self.connect()
                
            message = {
                "event_type": "bid_submitted",
                "timestamp": datetime.now().isoformat(),
                "bid_id": bid_data.get("id"),
                "user_id": bid_data.get("userId", "default_user"),
                "hour": bid_data.get("hour"),
                "action": bid_data.get("action"),
                "price": bid_data.get("price"),
                "quantity": bid_data.get("quantity"),
                "total_value": bid_data.get("price", 0) * bid_data.get("quantity", 0),
                "status": "submitted"
            }
            
            future = self.producer.send(
                self.topics["bid_submissions"],
                key=f"bid_{bid_data.get('id')}",
                value=message
            )
            
            future.add_callback(lambda metadata: logger.info(f"📋 Bid submitted event sent to partition {metadata.partition}"))
            future.add_errback(lambda exc: logger.error(f"❌ Bid submission send failed: {exc}"))
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to publish bid submission: {e}")
            return False
    
    def publish_trade_executed(self, trade_data: Dict[str, Any]) -> bool:
        """Publish trade execution event to Kafka."""
        try:
            if not self.is_connected:
                self.connect()
                
            message = {
                "event_type": "trade_executed",
                "timestamp": datetime.now().isoformat(),
                "trade_id": f"trade_{datetime.now().timestamp()}",
                "bid_id": trade_data.get("bid_id"),
                "user_id": trade_data.get("user_id", "default_user"),
                "execution_price": trade_data.get("execution_price"),
                "quantity": trade_data.get("quantity"),
                "total_value": trade_data.get("total"),
                "market": "day_ahead",
                "settlement_time": trade_data.get("settlement_time")
            }
            
            future = self.producer.send(
                self.topics["trade_executions"],
                key=f"trade_{trade_data.get('bid_id')}",
                value=message
            )
            
            future.add_callback(lambda metadata: logger.info(f"⚡ Trade execution sent to partition {metadata.partition}"))
            future.add_errback(lambda exc: logger.error(f"❌ Trade execution send failed: {exc}"))
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to publish trade execution: {e}")
            return False
    
    def publish_portfolio_update(self, portfolio_data: Dict[str, Any]) -> bool:
        """Publish portfolio update event to Kafka."""
        try:
            if not self.is_connected:
                self.connect()
                
            message = {
                "event_type": "portfolio_update",
                "timestamp": datetime.now().isoformat(),
                "user_id": portfolio_data.get("user_id", "default_user"),
                "cash_balance": portfolio_data.get("cash_balance"),
                "total_pnl": portfolio_data.get("total_pnl", 0),
                "active_positions": len(portfolio_data.get("positions", [])),
                "day_ahead_bids": len(portfolio_data.get("day_ahead_bids", [])),
                "portfolio_value": portfolio_data.get("cash_balance", 0) + portfolio_data.get("total_pnl", 0)
            }
            
            future = self.producer.send(
                self.topics["portfolio_updates"],
                key=f"portfolio_{portfolio_data.get('user_id', 'default_user')}",
                value=message
            )
            
            future.add_callback(lambda metadata: logger.info(f"💼 Portfolio update sent to partition {metadata.partition}"))
            future.add_errback(lambda exc: logger.error(f"❌ Portfolio update send failed: {exc}"))
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to publish portfolio update: {e}")
            return False
    
    def publish_alert(self, alert_data: Dict[str, Any]) -> bool:
        """Publish alert event to Kafka."""
        try:
            if not self.is_connected:
                self.connect()
                
            message = {
                "event_type": "alert",
                "timestamp": datetime.now().isoformat(),
                "alert_type": alert_data.get("type", "info"),
                "message": alert_data.get("message"),
                "priority": alert_data.get("priority", "medium"),
                "user_id": alert_data.get("user_id", "default_user")
            }
            
            future = self.producer.send(
                self.topics["alerts"],
                key=f"alert_{datetime.now().timestamp()}",
                value=message
            )
            
            future.add_callback(lambda metadata: logger.info(f"🚨 Alert sent to partition {metadata.partition}"))
            future.add_errback(lambda exc: logger.error(f"❌ Alert send failed: {exc}"))
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to publish alert: {e}")
            return False
    
    def create_consumer(self, topics: List[str], group_id: str = "energy_trading_app") -> KafkaConsumer:
        """Create a Kafka consumer for specific topics."""
        try:
            consumer = KafkaConsumer(
                *topics,
                bootstrap_servers=self.bootstrap_servers,
                group_id=group_id,
                auto_offset_reset='latest',
                enable_auto_commit=True,
                value_deserializer=lambda x: json.loads(x.decode('utf-8')) if x else None,
                key_deserializer=lambda x: x.decode('utf-8') if x else None
            )
            
            self.consumers[group_id] = consumer
            logger.info(f"✅ Kafka consumer created for topics: {topics}")
            return consumer
            
        except Exception as e:
            logger.error(f"❌ Failed to create Kafka consumer: {e}")
            return None
    
    def get_service_status(self) -> Dict[str, Any]:
        """Get current service status."""
        return {
            "kafka_connected": self.is_connected,
            "bootstrap_servers": self.bootstrap_servers,
            "topics": self.topics,
            "active_consumers": len(self.consumers),
            "timestamp": datetime.now().isoformat()
        }

# Global Kafka service instance
kafka_service = EnergyTradingKafkaService()

# Auto-connect on import
if kafka_service.connect():
    logger.info("🚀 Energy Trading Kafka Service initialized successfully")
else:
    logger.warning("⚠️ Kafka service initialization failed - will retry on first use")
