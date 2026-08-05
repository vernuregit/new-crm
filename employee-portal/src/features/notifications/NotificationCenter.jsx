import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from './stores/notificationStore'
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
  ExternalLink,
  Heart
} from 'lucide-react'

export const NotificationCenter = () => {
  const navigate = useNavigate()
  const { notifications, isOpen, setIsOpen, markAsRead, markAllAsRead } =
    useNotificationStore()

  if (!isOpen) return null

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
    <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 shadow-2xl">
      <Card className="p-0 border-slate-800 bg-[#12151E] overflow-hidden">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-xs">Notifications</h3>
            {unreadCount > 0 && <Badge variant="brand">{unreadCount} New</Badge>}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 rounded hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.notificationId}
                onClick={() => {
                  markAsRead(n.notificationId)
                  if (n.link) {
                    setIsOpen(false)
                    navigate(n.link)
                  }
                }}
                className={`p-3.5 flex items-start gap-3 text-xs cursor-pointer transition-colors ${
                  n.isRead ? 'bg-[#12151E] opacity-75' : 'bg-indigo-600/5 hover:bg-indigo-600/10'
                }`}
              >
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{n.title}</span>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-500 block pt-0.5">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
