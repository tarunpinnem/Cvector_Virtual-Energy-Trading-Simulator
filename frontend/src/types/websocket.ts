export interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
}

export interface RealTimePriceUpdate {
  price: number
  timestamp: string
  region: string
  change_24h?: number
  volume?: number
}

export interface TradeUpdate {
  trade_id: number
  user_id: number
  type: 'executed' | 'cancelled'
  details: any
}

export interface PortfolioUpdate {
  user_id: number
  portfolio: any
  positions?: any[]
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  duration?: number
}
