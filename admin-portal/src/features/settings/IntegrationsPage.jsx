import React from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useSettingsStore } from './stores/settingsStore'
import { Building, ShieldCheck, Key, Check, Plug } from 'lucide-react'

export const IntegrationsPage = () => {
  const { integrations, toggleIntegration } = useSettingsStore()

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Integrations & API Settings"
          description="Manage third-party search extensions, payment gateways, and automated webhook connections"
        />

        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <NavLink
            to="/settings/org"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Building className="w-3.5 h-3.5" /> Organization Profile
          </NavLink>
          <NavLink
            to="/settings/roles"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Custom Roles & Permissions
          </NavLink>
          <NavLink
            to="/settings/integrations"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Key className="w-3.5 h-3.5" /> Integrations & API
          </NavLink>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {integrations.map((item) => (
          <Card key={item.id} hover className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181C27] space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-500/20">
                    <Plug className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.name}</h4>
                </div>
                <Badge variant={item.status === 'connected' ? 'success' : 'neutral'}>
                  {item.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex justify-end">
              <Button
                size="sm"
                variant={item.status === 'connected' ? 'outline' : 'primary'}
                onClick={() => toggleIntegration(item.id)}
              >
                {item.status === 'connected' ? 'Disconnect' : 'Connect Integration'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
