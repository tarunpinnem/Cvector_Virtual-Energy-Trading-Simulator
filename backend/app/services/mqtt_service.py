"""
MQTT Service for Real-time Market Data Streaming
Handles live market data feeds, bid updates, and position changes
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Callable, Optional
import paho.mqtt.client as mqtt
from asyncio_mqtt import Client
import os

logger = logging.getLogger(__name__)

class MQTTMarketDataService:
    """Service for handling real-time market data via MQTT."""
    
    def __init__(self, broker_host: str = "localhost", broker_port: int = 1883):
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.client: Optional[Client] = None
        self.subscribers: Dict[str, list] = {}
        self.is_connected = False
        
        # Topic structure for energy trading
        self.topics = {
            "market_prices": "energy/market/prices/caiso",
            "fuel_mix": "energy/market/fuel_mix/caiso", 
            "bid_updates": "energy/trading/bids/updates",
            "position_updates": "energy/trading/positions/updates",
            "trade_executions": "energy/trading/executions",
            "price_alerts": "energy/alerts/prices",
            "system_status": "energy/system/status"
        }
    
    async def connect(self):
        """Connect to MQTT broker."""
        try:
            self.client = Client(hostname=self.broker_host, port=self.broker_port)
            await self.client.__aenter__()
            self.is_connected = True
            logger.info(f"Connected to MQTT broker at {self.broker_host}:{self.broker_port}")
            
            # Start listening for messages
            asyncio.create_task(self._message_listener())
            
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            self.is_connected = False
    
    async def disconnect(self):
        """Disconnect from MQTT broker."""
        if self.client:
            await self.client.__aexit__(None, None, None)
            self.is_connected = False
            logger.info("Disconnected from MQTT broker")
    
    async def publish_market_data(self, market_data: Dict[str, Any]):
        """Publish real-time market data."""
        if not self.is_connected:
            await self.connect()
        
        topic = self.topics["market_prices"]
        payload = {
            "timestamp": datetime.utcnow().isoformat(),
            "source": "gridstatus_api",
            "region": "CAISO",
            **market_data
        }
        
        await self.client.publish(topic, json.dumps(payload))
        logger.debug(f"Published market data to {topic}")
    
    async def publish_fuel_mix(self, fuel_mix_data: Dict[str, Any]):
        """Publish real-time fuel mix data."""
        if not self.is_connected:
            await self.connect()
        
        topic = self.topics["fuel_mix"]
        payload = {
            "timestamp": datetime.utcnow().isoformat(),
            "source": "gridstatus_api",
            "region": "CAISO",
            **fuel_mix_data
        }
        
        await self.client.publish(topic, json.dumps(payload))
        logger.debug(f"Published fuel mix data to {topic}")
    
    async def publish_bid_update(self, bid_data: Dict[str, Any]):
        """Publish bid status updates."""
        if not self.is_connected:
            await self.connect()
        
        topic = self.topics["bid_updates"]
        payload = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "bid_update",
            **bid_data
        }
        
        await self.client.publish(topic, json.dumps(payload))
        logger.info(f"Published bid update: {bid_data.get('bid_id', 'unknown')}")
    
    async def publish_position_update(self, position_data: Dict[str, Any]):
        """Publish position updates (P&L changes, settlements)."""
        if not self.is_connected:
            await self.connect()
        
        topic = self.topics["position_updates"]
        payload = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "position_update",
            **position_data
        }
        
        await self.client.publish(topic, json.dumps(payload))
        logger.info(f"Published position update: {position_data.get('position_id', 'unknown')}")
    
    async def publish_trade_execution(self, trade_data: Dict[str, Any]):
        """Publish trade execution events."""
        if not self.is_connected:
            await self.connect()
        
        topic = self.topics["trade_executions"]
        payload = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "trade_execution",
            **trade_data
        }
        
        await self.client.publish(topic, json.dumps(payload))
        logger.info(f"Published trade execution: {trade_data.get('trade_id', 'unknown')}")
    
    async def publish_price_alert(self, alert_data: Dict[str, Any]):
        """Publish price alerts and notifications."""
        if not self.is_connected:
            await self.connect()
        
        topic = self.topics["price_alerts"]
        payload = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "price_alert",
            **alert_data
        }
        
        await self.client.publish(topic, json.dumps(payload))
        logger.warning(f"Published price alert: {alert_data.get('message', 'unknown')}")
    
    async def subscribe_to_topic(self, topic_key: str, callback: Callable[[Dict[str, Any]], None]):
        """Subscribe to a topic with a callback function."""
        if topic_key not in self.topics:
            raise ValueError(f"Unknown topic key: {topic_key}")
        
        topic = self.topics[topic_key]
        
        if topic not in self.subscribers:
            self.subscribers[topic] = []
        
        self.subscribers[topic].append(callback)
        
        if not self.is_connected:
            await self.connect()
        
        await self.client.subscribe(topic)
        logger.info(f"Subscribed to topic: {topic}")
    
    async def _message_listener(self):
        """Listen for incoming MQTT messages."""
        try:
            async with self.client.filtered_messages("energy/#") as messages:
                await self.client.subscribe("energy/#")
                async for message in messages:
                    try:
                        topic = message.topic
                        payload = json.loads(message.payload.decode())
                        
                        # Call all registered callbacks for this topic
                        if topic in self.subscribers:
                            for callback in self.subscribers[topic]:
                                try:
                                    if asyncio.iscoroutinefunction(callback):
                                        await callback(payload)
                                    else:
                                        callback(payload)
                                except Exception as e:
                                    logger.error(f"Error in callback for topic {topic}: {e}")
                    
                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON payload on topic {topic}")
                    except Exception as e:
                        logger.error(f"Error processing message on topic {topic}: {e}")
        
        except Exception as e:
            logger.error(f"Error in message listener: {e}")

# Global MQTT service instance
mqtt_service = MQTTMarketDataService()

# Real-time market data simulator (for demo purposes)
async def simulate_real_time_market_data():
    """Simulate real-time market data publishing."""
    import random
    
    while True:
        try:
            # Simulate CAISO market prices
            market_data = {
                "lmp_price": round(random.uniform(25.0, 55.0), 2),
                "load_mw": round(random.uniform(20000, 45000), 1),
                "demand_forecast": round(random.uniform(22000, 48000), 1),
                "congestion_price": round(random.uniform(-5.0, 15.0), 2)
            }
            
            await mqtt_service.publish_market_data(market_data)
            
            # Simulate fuel mix changes
            total_generation = random.uniform(35000, 50000)
            solar_pct = random.uniform(0.15, 0.35)
            wind_pct = random.uniform(0.08, 0.25)
            gas_pct = 1.0 - solar_pct - wind_pct - 0.15  # Leave room for other sources
            
            fuel_mix_data = {
                "total_generation_mw": round(total_generation, 1),
                "solar_mw": round(total_generation * solar_pct, 1),
                "wind_mw": round(total_generation * wind_pct, 1),
                "natural_gas_mw": round(total_generation * gas_pct, 1),
                "renewable_percentage": round((solar_pct + wind_pct) * 100, 1)
            }
            
            await mqtt_service.publish_fuel_mix(fuel_mix_data)
            
            # Wait 30 seconds before next update
            await asyncio.sleep(30)
            
        except Exception as e:
            logger.error(f"Error in market data simulation: {e}")
            await asyncio.sleep(5)
