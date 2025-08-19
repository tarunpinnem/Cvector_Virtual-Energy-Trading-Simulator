import React, { useState, useEffect, ReactNode } from 'react'
import { Layout, Menu, Avatar, Badge, Button, Space, Typography } from '@arco-design/web-react'
import { 
  IconDashboard, 
  IconUser, 
  IconDesktop,
  IconNotification,
  IconSettings,
  IconPoweroff,
  IconThunderbolt
} from '@arco-design/web-react/icon'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMarketStore, useNotificationStore } from '../../stores'
import { wsService } from '../../services'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

interface AppLayoutProps {
  children: ReactNode
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { isConnected, realTimeData } = useMarketStore()
  const { notifications } = useNotificationStore()

  // Get current route for menu selection
  const getSelectedKey = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard':
        return 'dashboard'
      case '/trading':
        return 'trading'
      case '/portfolio':
        return 'portfolio'
      case '/market-data':
        return 'market-data'
      case '/analytics':
        return 'analytics'
      default:
        return 'dashboard'
    }
  }

  // Initialize WebSocket connection
  useEffect(() => {
    wsService.connect().catch(console.error)
    
    return () => {
      wsService.disconnect()
    }
  }, [])

  const menuItems = [
    {
      key: 'dashboard',
      icon: <IconDashboard />,
      title: 'Dashboard',
    },
    {
      key: 'trading',
      icon: <IconDesktop />,
      title: 'Trading',
    },
    {
      key: 'portfolio',
      icon: <IconUser />,
      title: 'Portfolio',
    },
    {
      key: 'market-data',
      icon: <IconNotification />,
      title: 'Market Data',
    },
    {
      key: 'analytics',
      icon: <IconSettings />,
      title: 'Analytics',
    },
  ]

  const handleMenuClick = (key: string) => {
    const routeMap: Record<string, string> = {
      dashboard: '/dashboard',
      trading: '/trading',
      portfolio: '/portfolio',
      'market-data': '/market-data',
      analytics: '/analytics',
    }
    navigate(routeMap[key] || '/dashboard')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        collapsible
        trigger={null}
        width={250}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 20px',
            borderBottom: '1px solid #e5e6eb',
          }}
        >
          <IconThunderbolt style={{ fontSize: 24, color: '#1890ff', marginRight: collapsed ? 0 : 8 }} />
          {!collapsed && (
            <Title heading={6} style={{ margin: 0, color: '#1890ff' }}>
              Energy Trading
            </Title>
          )}
        </div>

        <Menu
          selectedKeys={[getSelectedKey()]}
          style={{ border: 'none', marginTop: 16 }}
          onClickMenuItem={handleMenuClick}
        >
          {menuItems.map((item) => (
            <Menu.Item key={item.key} style={{ height: 50, lineHeight: '50px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {item.icon}
                {!collapsed && <span style={{ marginLeft: 12 }}>{item.title}</span>}
              </div>
            </Menu.Item>
          ))}
        </Menu>
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={<IconThunderbolt />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ marginRight: 16 }}
            />
            
            {/* Real-time price display */}
            {realTimeData && (
              <div style={{ display: 'flex', alignItems: 'center', marginLeft: 16 }}>
                <Text style={{ fontSize: 14, color: '#86909c', marginRight: 8 }}>
                  Real-time Price:
                </Text>
                <Text 
                  style={{ 
                    fontSize: 16, 
                    fontWeight: 600,
                    color: realTimeData.change_24h && realTimeData.change_24h > 0 ? '#00b42a' : '#f53f3f'
                  }}
                >
                  ${realTimeData.price.toFixed(2)}/MWh
                </Text>
                {realTimeData.change_24h && (
                  <Text 
                    style={{ 
                      fontSize: 12, 
                      marginLeft: 8,
                      color: realTimeData.change_24h > 0 ? '#00b42a' : '#f53f3f'
                    }}
                  >
                    {realTimeData.change_24h > 0 ? '+' : ''}{realTimeData.change_24h.toFixed(2)}
                  </Text>
                )}
              </div>
            )}
          </div>

          <Space>
            {/* Connection status */}
            <Badge 
              status={isConnected ? 'success' : 'error'} 
              text={isConnected ? 'Connected' : 'Disconnected'}
            />

            {/* Notifications */}
            <Badge count={notifications.length} offset={[-5, 5]}>
              <Button type="text" icon={<IconNotification />} />
            </Badge>

            {/* Settings */}
            <Button type="text" icon={<IconSettings />} />

            {/* User Avatar */}
            <Avatar size={32}>
              <IconUser />
            </Avatar>

            {/* Logout */}
            <Button type="text" icon={<IconPoweroff />} />
          </Space>
        </Header>

        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: '#f5f5f5',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
