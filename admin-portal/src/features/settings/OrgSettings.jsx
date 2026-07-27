import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useSettingsStore } from './stores/settingsStore'
import { Building, ShieldCheck, SlidersHorizontal, Save, Key } from 'lucide-react'

export const OrgSettings = () => {
  const { orgDetails, updateOrgDetails } = useSettingsStore()

  const [name, setName] = useState(orgDetails.name)
  const [slug, setSlug] = useState(orgDetails.slug)
  const [currency, setCurrency] = useState(orgDetails.currency)
  const [timezone, setTimezone] = useState(orgDetails.timezone)
  const [saved, setSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    updateOrgDetails({ name, slug, currency, timezone })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Organization Settings"
          description="Configure company profile, multi-tenant workspace preferences, custom roles, and API integrations"
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

      <Card className="max-w-2xl space-y-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181C27]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">General Profile Settings</h3>
          <Badge variant="brand">{orgDetails.plan}</Badge>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Organization Legal Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Workspace Identifier (Slug)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Default Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
            <Input
              label="Primary Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            {saved && <span className="text-xs text-emerald-400 font-semibold">Settings Saved!</span>}
            <Button type="submit" variant="primary" icon={Save} className="ml-auto">
              Save Settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
