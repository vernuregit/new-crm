import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { useMarketingStore } from './stores/marketingStore'
import { getCampaigns, createCampaign, deleteCampaignFromDb } from './services/marketingService'
import {
  Megaphone,
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Calendar,
  Link,
  X,
  Trash2
} from 'lucide-react'

export const CampaignList = () => {
  const { campaigns, addCampaign, deleteCampaign, setCampaigns } = useMarketingStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [channel, setChannel] = useState('LinkedIn Ads')
  const [budget, setBudget] = useState('')
  const [utmSource, setUtmSource] = useState('linkedin')
  const [utmMedium, setUtmMedium] = useState('cpc')
  const [utmCampaign, setUtmCampaign] = useState('')

  useEffect(() => {
    const fetchRealCampaigns = async () => {
      const data = await getCampaigns()
      if (data) {
        setCampaigns(data)
      }
    }
    fetchRealCampaigns()
  }, [setCampaigns])

  const filtered = campaigns.filter((c) => {
    const q = searchQuery.toLowerCase()
    return !q || (c.name && c.name.toLowerCase().includes(q)) || (c.channel && c.channel.toLowerCase().includes(q))
  })

  // Summary Metrics
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0)
  const totalLeads = campaigns.reduce((sum, c) => sum + (c.leadsGenerated || 0), 0)
  const avgCostPerLead = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0

  const handleCreateCampaign = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    const payload = {
      name,
      channel,
      budget: Number(budget) || 0,
      spent: 0,
      leadsGenerated: 0,
      conversionRate: 0,
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      utmSource: utmSource || 'direct',
      utmMedium: utmMedium || 'cpc',
      utmCampaign: utmCampaign || name.toLowerCase().replace(/\s+/g, '_'),
    }

    const created = await createCampaign(payload)
    addCampaign(created)

    setName('')
    setBudget('')
    setUtmCampaign('')
    setShowAddModal(false)
  }

  const handleDeleteCampaign = async (campaignId) => {
    deleteCampaign(campaignId)
    await deleteCampaignFromDb(campaignId)
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Marketing & Acquisition Hub"
          description="Campaign performance tracking, lead attribution, UTM builders, and content calendars"
          actions={
            <Button icon={Plus} variant="primary" onClick={() => setShowAddModal(true)}>
              New Campaign
            </Button>
          }
        />

        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <NavLink
            to="/marketing/campaigns"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <Megaphone className="w-3.5 h-3.5" /> Campaigns
          </NavLink>
          <NavLink
            to="/marketing/content"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <Calendar className="w-3.5 h-3.5" /> Content Calendar
          </NavLink>
          <NavLink
            to="/marketing/utm-builder"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <Link className="w-3.5 h-3.5" /> UTM Link Builder
          </NavLink>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Marketing Spend
            </span>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              ${totalSpend.toLocaleString()}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Leads Acquired
            </span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalLeads} Leads</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Avg Cost Per Lead
            </span>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">${avgCostPerLead} / lead</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((c) => (
          <Card key={c.campaignId} hover className="space-y-3.5 border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{c.name}</h4>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">{c.channel}</p>
              </div>
              <Badge variant={c.status === 'active' ? 'success' : 'warning'}>{c.status}</Badge>
            </div>

            {/* Budget Progress */}
            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Spend vs Budget</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  ${c.spent?.toLocaleString()} / ${c.budget?.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-800">
                <div
                  className="bg-indigo-600 dark:bg-indigo-500 h-full"
                  style={{
                    width: `${Math.min(100, Math.round(((c.spent || 0) / (c.budget || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Leads</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{c.leadsGenerated}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Conversion Rate</span>
                <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">{c.conversionRate}%</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-mono text-slate-600 dark:text-slate-400">
                utm_source={c.utmSource}
              </span>
              <button
                onClick={() => handleDeleteCampaign(c.campaignId)}
                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
            No marketing campaigns found. Click "New Campaign" to create one.
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">Create Marketing Campaign</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <Input
                label="Campaign Title"
                placeholder="e.g. Q4 Growth Sprint"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-medium text-slate-300">Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full bg-[#11141E] border border-slate-800 text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none"
                  >
                    <option value="LinkedIn Ads">LinkedIn Ads</option>
                    <option value="Google Search Ads">Google Search Ads</option>
                    <option value="Organic Content & SEO">Organic Content & SEO</option>
                    <option value="Email Newsletter">Email Newsletter</option>
                    <option value="Event / Conference">Event / Conference</option>
                  </select>
                </div>

                <Input
                  label="Budget ($ USD)"
                  type="number"
                  placeholder="5000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Input
                  label="UTM Source"
                  placeholder="linkedin"
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                />
                <Input
                  label="UTM Medium"
                  placeholder="cpc"
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                />
                <Input
                  label="UTM Campaign"
                  placeholder="q4_growth"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-1/3">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" icon={Plus}>
                  Save Campaign
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
