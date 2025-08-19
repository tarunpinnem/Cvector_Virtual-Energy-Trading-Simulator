import React, { ReactNode } from 'react'
import { Layout, Typography } from '@arco-design/web-react'

const { Header, Content } = Layout
const { Title } = Typography

interface SimpleLayoutProps {
  children: ReactNode
}

const SimpleLayout: React.FC<SimpleLayoutProps> = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#1890ff', 
        color: 'white', 
        display: 'flex', 
        alignItems: 'center',
        padding: '0 24px'
      }}>
        <Title heading={4} style={{ color: 'white', margin: 0 }}>
          ⚡ Virtual Energy Trading Platform
        </Title>
      </Header>
      <Content style={{ padding: '24px' }}>
        {children}
      </Content>
    </Layout>
  )
}

export default SimpleLayout
