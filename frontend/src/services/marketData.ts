import api from './api'
import type { MarketData, MarketSummary, PriceAnalytics, DayAheadPrice, LoadForecastResponse } from '../types/market'

export const marketDataService = {
  // Get real-time market data
  async getRealTimeData(region: string = 'CAISO'): Promise<MarketData> {
    const response = await api.get(`/api/v1/market-data/real-time?region=${region}`)
    return response.data
  },

  // Get day-ahead prices
  async getDayAheadPrices(date: string, region: string = 'CAISO'): Promise<{ date: string; region: string; hourly_prices: DayAheadPrice[] }> {
    const response = await api.get(`/api/v1/market-data/day-ahead/${date}?region=${region}`)
    return response.data
  },

  // Get historical data
  async getHistoricalData(
    startDate: string,
    endDate: string,
    marketType: 'real_time' | 'day_ahead' = 'real_time',
    region: string = 'CAISO'
  ): Promise<{
    start_date: string
    end_date: string
    market_type: string
    region: string
    data_points: number
    data: MarketData[]
  }> {
    const response = await api.get('/api/v1/market-data/historical', {
      params: {
        start_date: startDate,
        end_date: endDate,
        market_type: marketType,
        region
      }
    })
    return response.data
  },

  // Get market summary
  async getMarketSummary(region: string = 'CAISO'): Promise<MarketSummary> {
    const response = await api.get(`/api/v1/market-data/summary?region=${region}`)
    return response.data
  },

  // Get price analytics
  async getPriceAnalytics(region: string = 'CAISO'): Promise<PriceAnalytics> {
    const response = await api.get(`/api/v1/market-data/analytics/price?region=${region}`)
    return response.data
  },

  // Get load forecast
  async getLoadForecast(region: string = 'CAISO', hoursAhead: number = 24): Promise<LoadForecastResponse> {
    const response = await api.get(`/api/v1/market-data/load-forecast?region=${region}&hours_ahead=${hoursAhead}`)
    return response.data
  }
}
