import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { useMarketingStore } from './stores/marketingStore'
import { getContentItems, createContentItem, deleteContentItemFromDb } from './services/marketingService'
import { Megaphone, Calendar, Link, Plus, X, Trash2 } from 'lucide-react'

export const ContentCalendar = () => {
  const { contentItems, addContentItem, setContentItems, deleteContentItem } = useMarketingStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [title, setTitle] = useState('')
  const [platform, setPlatform] = useState('LinkedIn Article')
  const [scheduledDate, setScheduledDate] = useState('')
  const [author, setAuthor] = useState('Sarah Jenkins')

  useEffect(() => {
    const fetchRealContentItems = async () => {
      const data = await getContentItems()
      if (data) {
        setContentItems(data)
      }
    }
    fetchRealContentItems()
  }, [setContentItems])

  const handleCreateContent = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    const payload = {
      title,
      platform,
      scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
      author,
      status: 'scheduled',
    }

    const created = await createContentItem(payload)
    addContentItem(created)

    setTitle('')
    setShowAddModal(false)
  }

  const handleDeleteContent = async (contentId) => {
    deleteContentItem(contentId)
    await deleteContentItemFromDb(contentId)
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Content Calendar & Social Publisher"
          description="Schedule articles, whitepapers, social posts, and product release notes"
          actions={
            <Button icon={Plus} variant="primary" onClick={() => setShowAddModal(true)}>
              Schedule Post
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

      {/* Content Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contentItems.map((item) => (
          <Card key={item.contentId} hover className="space-y-3 border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400">{item.platform}</span>
              <div className="flex items-center gap-2">
                <Badge variant={item.status === 'scheduled' ? 'success' : 'neutral'}>
                  {item.status}
                </Badge>
                <button
                  onClick={() => handleDeleteContent(item.contentId)}
                  className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800"
                  title="Delete Content"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <h4 className="font-bold text-slate-100 text-sm">{item.title}</h4>
            <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Author: {item.author}</span>
              <span>Scheduled: {item.scheduledDate}</span>
            </div>
          </Card>
        ))}
        {contentItems.length === 0 && (
          <div className="col-span-full p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
            No scheduled content found. Click "Schedule Post" to create one.
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">Schedule Content Item</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContent} className="space-y-4">
              <Input
                label="Content Title"
                placeholder="e.g. 5 SaaS Architecture Best Practices"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-medium text-slate-300">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-[#11141E] border border-slate-800 text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none"
                  >
                    <option value="LinkedIn Article">LinkedIn Article</option>
                    <option value="Engineering Blog">Engineering Blog</option>
                    <option value="Newsletter">Newsletter</option>
                    <option value="Twitter / X Thread">Twitter / X Thread</option>
                  </select>
                </div>

                <Input
                  label="Target Publish Date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-1/3">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" icon={Plus}>
                  Schedule Post
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
