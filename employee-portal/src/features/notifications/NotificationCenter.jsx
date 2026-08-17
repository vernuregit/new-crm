import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from './stores/notificationStore'
import { useUserStore } from '../../stores/userStore'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import {
  Bell,
  CheckCheck,
  DollarSign,
  Users,
  Briefcase,
  Info,
  X,
  Heart,
  ArrowRight,
} from 'lucide-react'

export const NotificationCenter = () => {
  const navigate = useNavigate()
  const { user } = useUserStore()
  const { notifications, setIsOpen, markAsRead, markAllAsRead } = useNotificationStore()

  const uid = user?.uid
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const getIcon = (type) => {
    switch (type) {
      case 'finance':
        return <DollarSign className="w-4 h-4 text-emerald-400" />
      case 'crm':
        return <Users className="w-4 h-4 text-indigo-400" />
      case 'project':
        return <Briefcase className="w-4 h-4 text-purple-400" />
      case 'wellness':
        return <Heart className="w-4 h-4 text-rose-400" />
      default:
        return <Info className="w-4 h-4 text-blue-400" />
    }
  }

  return (
    <Card className="p-0 border-slate-800 bg-white dark:bg-[#12151E] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-purple-500 dark:text-indigo-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs">Notifications</h3>
          {unreadCount > 0 && <Badge variant="brand">{unreadCount} New</Badge>}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead(uid)}
              className="text-[10px] text-purple-600 dark:text-indigo-400 hover:text-purple-700 dark:hover:text-indigo-300 font-semibold px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" /> Mark all read
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/60">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No notifications yet.
          </div>
        ) : (
          notifications.slice(0, 8).map((n) => (
            <div
              key={n.notificationId}
              onClick={() => {
                markAsRead(uid, n.notificationId)
                if (n.link) {
                  setIsOpen(false)
                  navigate(n.link)
                }
              }}
              className={`p-3.5 flex items-start gap-3 text-xs cursor-pointer transition-colors ${
                n.isRead
                  ? 'bg-white dark:bg-[#12151E] opacity-75 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  : 'bg-purple-50/50 dark:bg-indigo-600/5 hover:bg-purple-100/50 dark:hover:bg-indigo-600/10'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{n.title}</span>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-indigo-500 shrink-0" />
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-2">{n.message}</p>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <button
            onClick={() => {
              setIsOpen(false)
              navigate('/notifications')
            }}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-purple-600 dark:text-indigo-400 hover:text-purple-700 dark:hover:text-indigo-300 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-indigo-500/10 transition-colors"
          >
            View all notifications <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </Card>
  )
}
