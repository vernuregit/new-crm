import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Megaphone, Calendar, Link as LinkIcon, Copy, Check } from 'lucide-react'

export const UtmBuilder = () => {
  const [baseUrl, setBaseUrl] = useState('https://acme.businessos.io/landing')
  const [source, setSource] = useState('linkedin')
  const [medium, setMedium] = useState('cpc')
  const [campaign, setCampaign] = useState('q3_enterprise_saas')
  const [term, setTerm] = useState('')
  const [content, setContent] = useState('')
  const [copied, setCopied] = useState(false)

  // Construct URL
  const buildUrl = () => {
    try {
      const url = new URL(baseUrl || 'https://company.com')
      if (source) url.searchParams.set('utm_source', source)
      if (medium) url.searchParams.set('utm_medium', medium)
      if (campaign) url.searchParams.set('utm_campaign', campaign)
      if (term) url.searchParams.set('utm_term', term)
      if (content) url.searchParams.set('utm_content', content)
      return url.toString()
    } catch {
      return `${baseUrl}?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`
    }
  }

  const generatedUrl = buildUrl()

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="UTM Link Generator & Attribution Builder"
          description="Build clean, standardized campaign tracking URLs for ads, newsletters, and social posts"
        />

        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <NavLink
            to="/marketing/campaigns"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <LinkIcon className="w-3.5 h-3.5" /> UTM Link Builder
          </NavLink>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 space-y-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181C27]">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-800">
            Link Parameters Configuration
          </h3>

          <Input
            label="Target Landing Page URL"
            placeholder="https://company.com/page"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Campaign Source (utm_source)"
              placeholder="google, linkedin, newsletter"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <Input
              label="Campaign Medium (utm_medium)"
              placeholder="cpc, banner, email, organic"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
            />
          </div>

          <Input
            label="Campaign Name (utm_campaign)"
            placeholder="q3_enterprise_launch"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Campaign Term (utm_term - optional)"
              placeholder="saas_software"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <Input
              label="Campaign Content (utm_content - optional)"
              placeholder="cta_button_blue"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </Card>

        {/* Live URL Output Box */}
        <Card className="space-y-4 border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-slate-900/60 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Generated Campaign URL</h3>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-indigo-200 dark:border-slate-800 font-mono text-xs text-indigo-600 dark:text-indigo-400 break-all leading-relaxed shadow-sm">
              {generatedUrl}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              When leads arrive at this URL, UTM parameters are automatically captured into CRM leads for attribution.
            </p>
          </div>

          <Button
            variant="primary"
            className="w-full"
            icon={copied ? Check : Copy}
            onClick={handleCopy}
          >
            {copied ? 'Copied URL!' : 'Copy Campaign Link'}
          </Button>
        </Card>
      </div>
    </div>
  )
}
