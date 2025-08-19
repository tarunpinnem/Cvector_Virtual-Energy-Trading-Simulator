import React from 'react'
import { Typography } from '@arco-design/web-react'

const { Title } = Typography

const Portfolio: React.FC = () => {
  return (
    <div>
      <Title heading={4} style={{ marginBottom: 24 }}>
        Portfolio Management
      </Title>
      <div>
        <p>Portfolio management interface coming soon...</p>
      </div>
    </div>
  )
}

export default Portfolio
