import React, { useEffect } from 'react'
import { Card, Space, Typography, Spin, Alert } from '@arco-design/web-react'
import { useQuery } from '@tanstack/react-query'
import { portfolioService, marketDataService, wsService } from '../services'
import { useMarketStore, useTradingStore, useNotificationStore } from '../stores'

const { Title } = Typography

const Dashboard: React.FC = () => {
  const { realTimeData, setRealTimeData, marketSummary, setMarketSummary } = useMarketStore()
  const { dashboardSummary, setDashboardSummary } = useTradingStore()
  const { addNotification } = useNotificationStore()

  // Fetch dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: portfolioService.getDashboardSummary,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // Disable retries for demo
  })

  const { data: marketData, isLoading: isMarketLoading } = useQuery({
    queryKey: ['marketSummary'],
    queryFn: () => marketDataService.getMarketSummary(),
    refetchInterval: 60000, // Refetch every minute
    retry: false, // Disable retries for demo
  })

  // Set up WebSocket listeners
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await wsService.connect()
        
        // Listen for real-time market data
        wsService.onMarketData((data) => {
          setRealTimeData({
            ...data,
            market_type: 'real_time'
          })
        })

        // Listen for notifications
        wsService.onNotification((notification) => {
          addNotification(notification)
        })

      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        addNotification({
          type: 'error',
          title: 'Connection Error',
          message: 'Failed to establish real-time connection'
        })
      }
    }

    connectWebSocket()

    return () => {
      wsService.off('market_data')
      wsService.off('notification')
    }
  }, [setRealTimeData, addNotification])

  // Update stores when data changes
  useEffect(() => {
    if (dashboardData) {
      setDashboardSummary(dashboardData)
    }
  }, [dashboardData, setDashboardSummary])

  useEffect(() => {
    if (marketData) {
      setMarketSummary(marketData)
    }
  }, [marketData, setMarketSummary])

  if (dashboardError) {
    return (
      <Alert
        type="error"
        title="Error Loading Dashboard"
        content={`Error: ${dashboardError instanceof Error ? dashboardError.message : 'Unknown error'}`}
        showIcon
      />
    )
  }

  const isLoading = isDashboardLoading || isMarketLoading

  return (
    <div>
      <Title heading={4} style={{ marginBottom: 24 }}>
        Trading Dashboard
      </Title>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size={40} />
        </div>
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Market Overview */}
          <Card title="Market Overview" bordered={false}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                  ${realTimeData?.price?.toFixed(2) || marketSummary?.current_price?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Current Price ($/MWh)</div>
              </div>
              <div>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold',
                  color: (marketSummary?.price_change_24h || 0) >= 0 ? '#52c41a' : '#ff4d4f'
                }}>
                  ${marketSummary?.price_change_24h?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>24h Change ($/MWh)</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  ${marketSummary?.high_24h?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>24h High ($/MWh)</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  ${marketSummary?.low_24h?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>24h Low ($/MWh)</div>
              </div>
            </div>
          </Card>

          {/* Portfolio Overview */}
          <Card title="Portfolio Overview" bordered={false}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                  ${dashboardSummary?.portfolio?.cash_balance?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Cash Balance</div>
              </div>
              <div>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold',
                  color: (dashboardSummary?.portfolio?.total_pnl || 0) >= 0 ? '#52c41a' : '#ff4d4f'
                }}>
                  ${dashboardSummary?.portfolio?.total_pnl?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Total P&L</div>
              </div>
              <div>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold',
                  color: (dashboardSummary?.portfolio?.daily_pnl || 0) >= 0 ? '#52c41a' : '#ff4d4f'
                }}>
                  ${dashboardSummary?.portfolio?.daily_pnl?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Daily P&L</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                  {dashboardSummary?.portfolio?.win_rate?.toFixed(1) || '0.0'}%
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Win Rate</div>
              </div>
            </div>
          </Card>

          {/* Trading Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <Card title="Active Positions" bordered={false}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                  {dashboardSummary?.active_positions?.length || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Open Positions</div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ 
                  fontSize: '20px', 
                  fontWeight: 'bold',
                  color: (dashboardSummary?.portfolio?.unrealized_pnl || 0) >= 0 ? '#52c41a' : '#ff4d4f'
                }}>
                  ${dashboardSummary?.portfolio?.unrealized_pnl?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Unrealized P&L</div>
              </div>
            </Card>
            <Card title="Trading Activity" bordered={false}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                  {dashboardSummary?.pending_bids?.length || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Pending Bids</div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1' }}>
                  {dashboardSummary?.portfolio?.total_trades || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Trades</div>
              </div>
            </Card>
          </div>
        </Space>
      )}
    </div>
  )
}

export default Dashboard
