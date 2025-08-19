import React from 'react'
import { Card, Typography, Space } from '@arco-design/web-react'

const { Title, Text } = Typography

const SimpleDashboard: React.FC = () => {
  return (
    <div>
      <Title heading={4} style={{ marginBottom: 24 }}>
        Virtual Energy Trading Platform
      </Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Welcome Card */}
        <Card title="Welcome to Energy Trading" bordered={false}>
          <Space direction="vertical">
            <Text>
              🚀 Your comprehensive energy trading simulation platform is ready!
            </Text>
            <Text type="secondary">
              This platform includes day-ahead market trading, real-time price monitoring, 
              portfolio management, and advanced analytics.
            </Text>
          </Space>
        </Card>

        {/* Market Overview */}
        <Card title="Market Overview" bordered={false}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                $45.67
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Current Price ($/MWh)
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                +$2.34
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                24h Change
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                $48.21
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                24h High
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                $43.15
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                24h Low
              </div>
            </div>
          </div>
        </Card>

        {/* Portfolio Overview */}
        <Card title="Portfolio Overview" bordered={false}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                $100,000.00
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Cash Balance
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                $0.00
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Total P&L
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                $0.00
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Daily P&L
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                0.0%
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Win Rate
              </div>
            </div>
          </div>
        </Card>

        {/* Trading Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <Card title="Active Positions" bordered={false}>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                0
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Open Positions
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                  $0.00
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Unrealized P&L
                </div>
              </div>
            </div>
          </Card>

          <Card title="Trading Activity" bordered={false}>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                0
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Pending Bids
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1' }}>
                  0
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Total Trades
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Features Info */}
        <Card title="Platform Features" bordered={false}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div>
              <Text style={{ fontWeight: 'bold' }}>📊 Day-Ahead Trading</Text>
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  Submit up to 10 bids per hour before 11 AM cutoff
                </Text>
              </div>
            </div>
            <div>
              <Text style={{ fontWeight: 'bold' }}>⚡ Real-time Market</Text>
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  5-minute interval pricing and automatic position updates
                </Text>
              </div>
            </div>
            <div>
              <Text style={{ fontWeight: 'bold' }}>💼 Portfolio Management</Text>
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  Track P&L, risk metrics, and performance analytics
                </Text>
              </div>
            </div>
            <div>
              <Text style={{ fontWeight: 'bold' }}>📈 Advanced Analytics</Text>
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  Market indicators, backtesting, and trend analysis
                </Text>
              </div>
            </div>
          </div>
        </Card>
      </Space>
    </div>
  )
}

export default SimpleDashboard
