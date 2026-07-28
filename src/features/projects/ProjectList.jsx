import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../shared/services/firebaseService'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { useProjectStore } from './stores/projectStore'
import { getProjects, createProject, deleteProjectFromDb } from './services/projectService'
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
  Trash2,
  ArrowRight,
  Loader2
} from 'lucide-react'

export const ProjectList = () => {
  const navigate = useNavigate()
  const { projects, setProjects, addProject, deleteProject, setSelectedProjectId } = useProjectStore()


  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)

  // Form fields for new project
  const [projName, setProjName] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [budget, setBudget] = useState('')
  const [description, setDescription] = useState('')

  // Dropdown data from Firestore
  const [clients, setClients] = useState([])
  const [employees, setEmployees] = useState([])
  const [dropdownLoading, setDropdownLoading] = useState(false)

  useEffect(() => {
    const fetchRealProjects = async () => {
      setLoading(true)
      const data = await getProjects()
      setProjects(data || [])
      setLoading(false)
    }
    fetchRealProjects()
  }, [setProjects])

  // Fetch clients & employees when modal opens
  useEffect(() => {
    if (!showAddModal) return
    const fetchDropdowns = async () => {
      setDropdownLoading(true)
      try {
        const [usersSnap, empSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'client'))),
          getDocs(collection(db, 'employees')),
        ])

        const clientCompaniesMap = new Map()

        // Map registered clients (users collection where role == 'client')
        usersSnap.docs.forEach((d) => {
          const data = d.data()
          if (data.companyName) {
            clientCompaniesMap.set(data.companyName.trim().toLowerCase(), {
              id: d.id,
              name: data.companyName,
            })
          }
        })

        const clientList = Array.from(clientCompaniesMap.values())

        const empList = empSnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.data().fullName || d.data().displayName || 'Unknown',
          role: d.data().role || d.data().roleName || d.data().jobTitle || d.data().department || '',
        }))

        setClients(clientList)
        setEmployees(empList)
        if (clientList.length > 0) setSelectedClientId(clientList[0].id)
        if (empList.length > 0) setSelectedEmployeeId(empList[0].id)
      } catch (err) {
        console.error('Error fetching dropdown data:', err)
      } finally {
        setDropdownLoading(false)
      }
    }
    fetchDropdowns()
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

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!projName.trim()) return

    const selectedClient = clients.find((c) => c.id === selectedClientId)
    const selectedEmployee = employees.find((emp) => emp.id === selectedEmployeeId)

    const payload = {
      name: projName,
      clientId: selectedClientId || '',
      clientName: selectedClient?.name || '',
      employeeId: selectedEmployeeId || '',
      ownerName: selectedEmployee?.name || '',
      ownerRole: selectedEmployee?.role || '',
      budget: Number(budget) || 0,
      description,
      status: 'active',
      completionPercent: 0,
      totalTaskCount: 0,
      completedTaskCount: 0,
      totalHoursLogged: 0,
    }

    const created = await createProject(payload)
    addProject(created)

    setProjName('')
    setSelectedClientId('')
    setSelectedEmployeeId('')
    setBudget('')
    setDescription('')
    setShowAddModal(false)
  }

  const handleProjectClick = (proj) => {
    const pId = proj.projectId || proj.id
    setSelectedProjectId(pId)
    navigate(`/projects/tasks?projectId=${pId}`)
  }

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation()
    const targetId = id || ''
    if (!targetId) return
    await deleteProjectFromDb(targetId)
    deleteProject(targetId)
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((proj) => (
          <Card
            key={proj.projectId || proj.id}
            hover
            className="space-y-4 border-slate-200 dark:border-slate-800 cursor-pointer group"
            onClick={() => handleProjectClick(proj)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                  {proj.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <Building className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {proj.clientName}
                </p>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                <button
                  onClick={(e) => handleDeleteProject(proj.projectId || proj.id, e)}
                  title="Delete project"
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
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
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleProjectClick(proj)
                }}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View Tasks <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">Initialize New Project</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
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
                {/* Client dropdown from Firestore leads */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Building className="w-3 h-3" /> Client
                  </label>
                  {dropdownLoading ? (
                    <div className="flex items-center gap-2 py-2.5 px-3.5 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading clients...
                    </div>
                  ) : clients.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2.5 px-3.5 border border-slate-800 rounded-xl">
                      No clients in Firestore yet
                    </p>
                  ) : (
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-[#11141E] border border-slate-800 text-slate-100 text-xs rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500"
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
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
                <label className="block text-xs font-medium text-slate-300">Description</label>
                <textarea
                  placeholder="Outline project deliverables and scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#11141E] border border-slate-800 text-slate-100 text-xs rounded-xl p-3 h-20 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Employee dropdown from Firestore employees */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Employee
                </label>
                {dropdownLoading ? (
                  <div className="flex items-center gap-2 py-2.5 px-3.5 text-xs text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading employees...
                  </div>
                ) : employees.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2.5 px-3.5 border border-slate-800 rounded-xl">
                    No employees in Firestore yet
                  </p>
                ) : (
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full bg-[#11141E] border border-slate-800 text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}{emp.role ? ` (${emp.role})` : ''}
                      </option>
                    ))}
                  </select>
                )}
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
