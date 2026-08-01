import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../shared/services/firebaseService'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useProjectStore } from './stores/projectStore'
import { useUserStore } from '../../stores/userStore'
import {
  Plus,
  Search,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  Building,
  Kanban,
  FolderKanban,
  X,
  TrendingUp,
  Layers,
  Loader2
} from 'lucide-react'

// Default fallback client list
const defaultClients = [
  { id: 'cli_acme', name: 'Acme Corp' },
  { id: 'cli_techcorp', name: 'TechCorp Global' },
  { id: 'cli_nexus', name: 'Nexus Systems' },
  { id: 'cli_globallog', name: 'Global Logistics' },
  { id: 'cli_apex', name: 'Apex Enterprises' },
]

export const ProjectList = () => {
  const { user, userDoc } = useUserStore()
  const { projects, addProject, fetchProjectsAndTasks, loading } = useProjectStore()

  const displayName = userDoc?.displayName || user?.displayName || 'Team Member'

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  // Form fields for new project
  const [projName, setProjName] = useState('')
  const [clientName, setClientName] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [budget, setBudget] = useState('')
  const [description, setDescription] = useState('')

  // Client dropdown data
  const [clients, setClients] = useState([])
  const [dropdownLoading, setDropdownLoading] = useState(false)

  useEffect(() => {
    fetchProjectsAndTasks()
  }, [fetchProjectsAndTasks])

  // Fetch real clients from Firestore when modal opens
  useEffect(() => {
    if (!showAddModal) return
    const fetchClients = async () => {
      setDropdownLoading(true)
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'client'))
        const snap = await getDocs(q)
        const clientCompaniesMap = new Map()

        snap.docs.forEach((d) => {
          const data = d.data()
          const company = data.companyName || data.displayName || data.name
          if (company) {
            clientCompaniesMap.set(company.trim().toLowerCase(), {
              id: d.id,
              name: company,
            })
          }
        })

        const fetchedList = Array.from(clientCompaniesMap.values())
        const finalClients = fetchedList.length > 0 ? fetchedList : defaultClients
        setClients(finalClients)
        if (finalClients.length > 0) {
          setSelectedClientId(finalClients[0].id)
          setClientName(finalClients[0].name)
        }
      } catch (err) {
        console.error('Error fetching clients from Firestore:', err)
        setClients(defaultClients)
        setSelectedClientId(defaultClients[0].id)
        setClientName(defaultClients[0].name)
      } finally {
        setDropdownLoading(false)
      }
    }
    fetchClients()
  }, [showAddModal])

  const filtered = projects.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Summary Metrics
  const activeCount = projects.filter((p) => p.status === 'active').length
  const avgCompletion =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, p) => sum + p.completionPercent, 0) / projects.length
        )
      : 0
  const totalLoggedHours = projects.reduce(
    (sum, p) => sum + (p.totalHoursLogged || 0),
    0
  )

  const handleCreateProject = (e) => {
    e.preventDefault()
    if (!projName.trim()) return

    const effectiveClientName = clientName || (clients.find(c => c.id === selectedClientId)?.name) || 'Internal Platform'

    addProject({
      name: projName,
      clientId: selectedClientId,
      clientName: effectiveClientName,
      budget: Number(budget) || 0,
      description,
      ownerName: displayName,
    })

    setProjName('')
    setClientName('')
    setSelectedClientId('')
    setBudget('')
    setDescription('')
    setShowAddModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Project Management"
          description="Manage active client deliverables, sprint velocity, task boards, and time tracking"
          actions={
            <Button icon={Plus} variant="primary" onClick={() => setShowAddModal(true)}>
              New Project
            </Button>
          }
        />

        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <NavLink
              to="/projects/list"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <FolderKanban className="w-3.5 h-3.5" /> All Projects
            </NavLink>
            <NavLink
              to="/projects/tasks"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <Kanban className="w-3.5 h-3.5" /> Task Board
            </NavLink>
            <NavLink
              to="/projects/time"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <Clock className="w-3.5 h-3.5" /> Time Tracking
            </NavLink>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-100 dark:bg-[#181C27] border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#181C27] border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Projects
            </span>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{activeCount}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Avg Completion Rate
            </span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{avgCompletion}%</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Logged Hours
            </span>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">{totalLoggedHours} hrs</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Project Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin" />
          <span className="ml-3 text-slate-500 dark:text-slate-400 text-xs">Loading projects…</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <FolderKanban className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Projects Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No projects found in the system. Click below to initialize a new project deliverable.
          </p>
          <Button size="sm" icon={Plus} variant="primary" onClick={() => setShowAddModal(true)}>
            Initialize New Project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((proj) => (
            <Card key={proj.projectId} hover className="space-y-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {proj.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <Building className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {proj.clientName}
                  </p>
                </div>
                <Badge
                  variant={
                    proj.status === 'active'
                      ? 'success'
                      : proj.status === 'completed'
                      ? 'brand'
                      : 'warning'
                  }
                >
                  {proj.status}
                </Badge>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{proj.description}</p>

              {/* Progress Bar - Emerald Green Progress Fill */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Completion Velocity</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{proj.completionPercent}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-300/40 dark:border-slate-700/50">
                  <div
                    className="bg-emerald-500 dark:bg-emerald-400 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${proj.completionPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800/60">
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {proj.completedTaskCount} / {proj.totalTaskCount} tasks
                </span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <DollarSign className="w-3.5 h-3.5" /> ${proj.budget?.toLocaleString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Initialize New Project</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <Input
                label="Project Title"
                placeholder="e.g. SaaS Refactor & API Redesign"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                {/* Client Dropdown */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building className="w-3 h-3 text-indigo-500" /> Client Name
                  </label>
                  {dropdownLoading ? (
                    <div className="flex items-center gap-2 py-2.5 px-3.5 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading clients...
                    </div>
                  ) : (
                    <select
                      value={selectedClientId}
                      onChange={(e) => {
                        setSelectedClientId(e.target.value)
                        const found = clients.find((c) => c.id === e.target.value)
                        if (found) setClientName(found.name)
                      }}
                      className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id} className="bg-white dark:bg-[#11141E]">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <Input
                  label="Project Budget ($ USD)"
                  type="number"
                  placeholder="45000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  placeholder="Outline project deliverables and scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl p-3 h-20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-1/3">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" icon={Plus}>
                  Create Project
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
