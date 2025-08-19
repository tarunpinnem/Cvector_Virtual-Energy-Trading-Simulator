export type BidType = 'buy' | 'sell'
export type BidStatus = 'pending' | 'executed' | 'rejected' | 'cancelled'

export interface Bid {
  id: number
  user_id: number
  bid_type: BidType
  quantity: number
  price: number
  hour_slot: number
  trading_date: string
  status: BidStatus
  clearing_price?: number
  executed_quantity: number
  created_at: string
  updated_at?: string
}

export interface BidCreate {
  bid_type: BidType
  quantity: number
  price: number
  hour_slot: number
  trading_date: string
}

export interface BidUpdate {
  quantity?: number
  price?: number
  status?: BidStatus
}

export interface BidValidation {
  is_valid: boolean
  errors: string[]
  warnings: string[]
  estimated_cost?: number
}

export interface Position {
  id: number
  user_id: number
  bid_id: number
  quantity: number
  entry_price: number
  current_price?: number
  unrealized_pnl: number
  realized_pnl: number
  is_closed: boolean
  trading_date: string
  hour_slot: number
  created_at: string
  updated_at?: string
}

export interface Trade {
  id: number
  user_id: number
  bid_id: number
  quantity: number
  price: number
  total_value: number
  pnl: number
  trade_type: BidType
  trading_date: string
  hour_slot: number
  executed_at: string
}

export interface Portfolio {
  id: number
  user_id: number
  cash_balance: number
  total_pnl: number
  daily_pnl: number
  unrealized_pnl: number
  realized_pnl: number
  max_drawdown: number
  total_trades: number
  winning_trades: number
  win_rate?: number
  total_position_value?: number
  created_at: string
  updated_at?: string
}

export interface DashboardSummary {
  portfolio: Portfolio
  active_positions: Position[]
  recent_trades: Trade[]
  pending_bids: Bid[]
  market_summary: any
}

export interface PerformanceMetrics {
  total_return: number
  annual_return: number
  sharpe_ratio: number
  max_drawdown: number
  win_rate: number
  profit_factor: number
  total_trades: number
  average_trade_duration: number
  largest_win: number
  largest_loss: number
  average_win: number
  average_loss: number
  gross_profit: number
  gross_loss: number
}

export interface RiskMetrics {
  total_exposure: number
  max_position_size_mwh: number
  max_position_value: number
  concentration_ratio: number
  var_1_percent: number
  leverage_ratio: number
  margin_utilization: number
  open_positions: number
  risk_limit_status: {
    position_size_ok: boolean
    daily_loss_ok: boolean
    concentration_ok: boolean
  }
}
