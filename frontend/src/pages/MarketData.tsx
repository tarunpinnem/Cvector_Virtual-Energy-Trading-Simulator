import React from 'react'
import { Typography } from '@arco-design/web-react'

const { Title } = Typography

const MarketData: React.FC = () => {
  return (
    <div>
      <Title heading={4} style={{ marginBottom: 24 }}>
        Market Data & Analysis
      </Title>
      <div>
        <p>Market data interface coming soon...</p>
      </div>
    </div>
  )
}

export default MarketData
