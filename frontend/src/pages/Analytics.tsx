import React from 'react'
import { Typography } from '@arco-design/web-react'

const { Title } = Typography

const Analytics: React.FC = () => {
  return (
    <div>
      <Title heading={4} style={{ marginBottom: 24 }}>
        Analytics & Performance
      </Title>
      <div>
        <p>Analytics interface coming soon...</p>
      </div>
    </div>
  )
}

export default Analytics
