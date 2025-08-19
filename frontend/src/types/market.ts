export interface MarketData {
  price: number
  load?: number
  timestamp: string
  region: string
  market_type: 'real_time' | 'day_ahead'
  change_24h?: number
  volume?: number
}

export interface DayAheadPrice {
  hour: number
  price: number
  date: string
  timestamp: string
  market_type: 'day_ahead'
  region: string
}

export interface MarketSummary {
  current_price: number
  price_change_24h: number
  price_change_percent: number
  high_24h: number
  low_24h: number
  average_price_24h: number
  volume_24h: number
  volatility_24h?: number
  last_updated: string
  region: string
}

export interface PriceAnalytics {
  current_price: number
  moving_average_24h: number
  volatility_24h: number
  price_trend: 'up' | 'down' | 'sideways'
  support_level: number
  resistance_level: number
  rsi: number
  region: string
  last_updated: string
}

export interface LoadForecast {
  timestamp: string
  forecasted_load_mw: number
  confidence: number
}

export interface LoadForecastResponse {
  region: string
  forecast_horizon_hours: number
  generated_at: string
  forecast: LoadForecast[]
}
