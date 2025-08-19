import React from 'react'
import { Typography } from '@arco-design/web-react'

const { Title } = Typography

const Trading: React.FC = () => {
  return (
    <div>
      <Title heading={4} style={{ marginBottom: 24 }}>
        Trading Platform
      </Title>
      <div>
        <p>Trading interface coming soon...</p>
      </div>
    </div>
  )
}

export default Trading
