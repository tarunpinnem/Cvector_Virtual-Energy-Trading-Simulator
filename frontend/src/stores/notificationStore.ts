import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Notification } from '../types/websocket'

interface NotificationStore {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    (set) => ({
      notifications: [],

      addNotification: (notification) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
        const timestamp = new Date().toISOString()
        
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp,
        }

        set(
          (state) => ({
            notifications: [newNotification, ...state.notifications].slice(0, 10), // Keep only last 10
          }),
          false,
          'addNotification'
        )

        // Auto-remove notification after duration
        if (notification.duration !== 0) {
          const duration = notification.duration || 5000
          setTimeout(() => {
            set(
              (state) => ({
                notifications: state.notifications.filter((n) => n.id !== id),
              }),
              false,
              'autoRemoveNotification'
            )
          }, duration)
        }
      },

      removeNotification: (id) =>
        set(
          (state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }),
          false,
          'removeNotification'
        ),

      clearNotifications: () =>
        set({ notifications: [] }, false, 'clearNotifications'),
    }),
    {
      name: 'notification-store',
    }
  )
)
