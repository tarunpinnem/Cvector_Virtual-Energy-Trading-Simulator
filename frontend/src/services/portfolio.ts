import api from './api'
import type { Portfolio, DashboardSummary, PerformanceMetrics, RiskMetrics } from '../types/trading'

export const portfolioService = {
  // Get portfolio information
  async getPortfolio(): Promise<Portfolio> {
    const response = await api.get('/api/v1/portfolio/')
    return response.data
  },

  // Get dashboard summary
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await api.get('/api/v1/portfolio/dashboard')
    return response.data
  },

  // Get performance metrics
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const response = await api.get('/api/v1/portfolio/performance')
    return response.data
  },

  // Get risk metrics
  async getRiskMetrics(): Promise<RiskMetrics> {
    const response = await api.get('/api/v1/portfolio/risk-metrics')
    return response.data
  }
}
