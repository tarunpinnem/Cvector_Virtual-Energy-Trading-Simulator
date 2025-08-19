from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    """Application configuration settings."""
    
    # API Configuration
    PROJECT_NAME: str = "Virtual Energy Trading Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database Configuration
    DATABASE_URL: str = "sqlite:///./energy_trading.db"
    
    # External API Configuration
    GRIDSTATUS_API_URL: str = "https://api.gridstatus.io/v1"
    GRIDSTATUS_API_KEY: str = ""
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Security Configuration
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Trading Configuration
    MAX_BIDS_PER_HOUR: int = 10
    DAY_AHEAD_CUTOFF_HOUR: int = 11  # 11 AM cutoff
    REAL_TIME_INTERVAL_MINUTES: int = 5
    
    # Risk Management
    MAX_POSITION_SIZE: float = 1000.0  # MWh
    MAX_DAILY_LOSS: float = 50000.0  # $
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()
