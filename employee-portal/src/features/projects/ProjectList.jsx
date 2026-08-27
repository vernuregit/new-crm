import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../shared/services/firebaseService'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useProjectStore } from './stores/projectStore'
import { isUserOnProject } from './services/projectService'
import { useUserStore } from '../../stores/userStore'
import {
  Plus,
  Search,
  Briefcase,
  CheckCircle2,
  Clock,
  User,
  Users,
  UserPlus,
  Building,
  Kanban,
  FolderKanban,
  X,
  TrendingUp,
  Trash2,
  Pencil,
  Loader2,
  ShieldCheck,
  Calendar,
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
  const navigate = useNavigate()
  const { user, userDoc, claims } = useUserStore()
  const {
    projects,
    tasks,
    addProject,
    updateProject,
    updateProjectMembers,
    deleteProject,
    setSelectedProjectId,
    fetchProjectsAndTasks,
    loading,
  } = useProjectStore()

  const currentUserId = userDoc?.uid || user?.uid || userDoc?.id
  const currentUserEmail = userDoc?.email || user?.email
  const currentDisplayName = userDoc?.displayName || user?.displayName || 'Team Member'
  const userRole = claims?.role || userDoc?.role || 'employee'
  const isAdmin =
    userRole === 'admin' ||
    userRole === 'owner' ||
    userRole === 'superadmin' ||
    claims?.role === 'admin' ||
    claims?.role === 'owner' ||
    claims?.role === 'superadmin'

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  // Form fields for new project
  const [projName, setProjName] = useState('')
  const [clientName, setClientName] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [budget, setBudget] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedDate, setEstimatedDate] = useState('')

  // Client dropdown data
  const [clients, setClients] = useState([])
  const [dropdownLoading, setDropdownLoading] = useState(false)

  // Manage Project Members Modal state
  const [memberModalProj, setMemberModalProj] = useState(null)
  const [allEmployees, setAllEmployees] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set())
  const [deleteConfirmProj, setDeleteConfirmProj] = useState(null)

  // Edit Project Modal state
  const [editModalProj, setEditModalProj] = useState(null)
  const [editProjName, setEditProjName] = useState('')
  const [editClientName, setEditClientName] = useState('')
  const [editSelectedClientId, setEditSelectedClientId] = useState('')
  const [editBudget, setEditBudget] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editEstimatedDate, setEditEstimatedDate] = useState('')
  const [editStatus, setEditStatus] = useState('active')
  const [editSubmitting, setEditSubmitting] = useState(false)

  useEffect(() => {
    fetchProjectsAndTasks()
  }, [fetchProjectsAndTasks])

  // Fetch real clients from Firestore when modal opens
  useEffect(() => {
    if (!showAddModal && !editModalProj) return
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
        if (finalClients.length > 0 && showAddModal && !selectedClientId) {
          setSelectedClientId(finalClients[0].id)
          setClientName(finalClients[0].name)
        }
      } catch (err) {
        console.error('Error fetching clients from Firestore:', err)
        setClients(defaultClients)
        if (showAddModal && !selectedClientId) {
          setSelectedClientId(defaultClients[0].id)
          setClientName(defaultClients[0].name)
        }
      } finally {
        setDropdownLoading(false)
      }
    }
    fetchClients()
  }, [showAddModal, editModalProj])

  // Fetch available employees when Member Modal opens (employees collection only)
  useEffect(() => {
    if (!memberModalProj) return
    const fetchTeamEmployees = async () => {
      setMembersLoading(true)
      try {
        const empSnap = await getDocs(collection(db, 'employees'))

        const byKey = new Map()

        const upsert = (entry) => {
          const key = String(entry.uid || entry.id || entry.email || '').toLowerCase()
          if (!key) return
          const existing = byKey.get(key)
          byKey.set(key, existing ? { ...existing, ...entry } : entry)
        }

        const isEmployeeOnly = (role) => {
          const normalized = String(role || 'employee').toLowerCase().trim()
          return normalized !== 'admin' && normalized !== 'client' && normalized !== 'superadmin'
        }

        empSnap.docs.forEach((d) => {
          const data = d.data()
          const role = data.role || 'employee'
          if (!isEmployeeOnly(role)) return
          const id = data.uid || data.authUid || d.id
          upsert({
            id,
            uid: id,
            name: data.name || data.fullName || data.displayName || 'Employee',
            email: data.email || '',
            role,
          })
        })

        const empList = Array.from(byKey.values())
        setAllEmployees(empList)

        // Initialize selected members set based on current project members
        const currentMembers = memberModalProj.members || []
        const initialSelected = new Set()

        currentMembers.forEach((m) => {
          const mId = typeof m === 'object' ? (m.uid || m.id) : m
          if (mId) initialSelected.add(String(mId))
        })

        // Ensure creator is included
        if (memberModalProj.createdBy) {
          initialSelected.add(String(memberModalProj.createdBy))
        }

        setSelectedMemberIds(initialSelected)
      } catch (err) {
        console.error('Error fetching employees for member assignment:', err)
      } finally {
        setMembersLoading(false)
      }
    }
    fetchTeamEmployees()
  }, [memberModalProj])

  // Helper to check if a project is visible to current user
  const isProjectVisibleToUser = (p) => {
    if (isAdmin) return true
    return isUserOnProject(p, user, userDoc, tasks)
  }

  const userVisibleProjects = projects.filter(isProjectVisibleToUser)

  const filtered = userVisibleProjects.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Summary Metrics based on user visible projects
  const activeCount = userVisibleProjects.filter((p) => p.status === 'active').length
  const avgCompletion =
    userVisibleProjects.length > 0
      ? Math.round(
          userVisibleProjects.reduce((sum, p) => sum + (p.completionPercent || 0), 0) /
            userVisibleProjects.length
        )
      : 0
  const totalLoggedHours = userVisibleProjects.reduce(
    (sum, p) => sum + (p.totalHoursLogged || 0),
    0
  )

  const handleCreateProject = (e) => {
    e.preventDefault()
    if (!projName.trim()) return

    const effectiveClientName =
      clientName || (clients.find((c) => c.id === selectedClientId)?.name) || 'Internal Platform'

    const creatorMember = {
      uid: currentUserId || `emp_${Date.now()}`,
      id: currentUserId || `emp_${Date.now()}`,
      email: currentUserEmail || '',
      name: currentDisplayName,
      role: userRole,
    }

    addProject({
      name: projName,
      clientId: selectedClientId,
      clientName: effectiveClientName,
      budget: Number(budget) || 0,
      description,
      estimatedDate: estimatedDate || null,
      ownerName: currentDisplayName,
      createdBy: currentUserId || null,
      createdByEmail: currentUserEmail || null,
      createdByName: currentDisplayName,
      createdByRole: userRole || 'employee',
      members: [creatorMember],
    })

    setProjName('')
    setClientName('')
    setSelectedClientId('')
    setBudget('')
    setDescription('')
    setEstimatedDate('')
    setShowAddModal(false)
  }

  const handleProjectClick = (proj) => {
    const pId = proj.projectId || proj.id
    setSelectedProjectId(pId)
    navigate(`/projects/${pId}/tasks`)
  }

  const handleOpenEditModal = (proj) => {
    setEditModalProj(proj)
    setEditProjName(proj.name || '')
    setEditClientName(proj.clientName || '')
    setEditSelectedClientId(proj.clientId || '')
    setEditBudget(proj.budget !== undefined && proj.budget !== null ? String(proj.budget) : '')
    setEditDescription(proj.description || '')
    setEditEstimatedDate(proj.estimatedDate || '')
    setEditStatus(proj.status || 'active')
  }

  const handleUpdateProject = async (e) => {
    e.preventDefault()
    if (!editModalProj || !editProjName.trim()) return

    const pId = editModalProj.projectId || editModalProj.id
    setEditSubmitting(true)
    try {
      const selectedClient = clients.find((c) => c.id === editSelectedClientId)
      const finalClientName = editClientName || selectedClient?.name || editModalProj.clientName || 'Independent'

      await updateProject(pId, {
        name: editProjName.trim(),
        clientName: finalClientName,
        clientId: editSelectedClientId || '',
        budget: editBudget ? Number(editBudget) : 0,
        description: editDescription,
        estimatedDate: editEstimatedDate || null,
        status: editStatus || 'active',
      })

      setEditModalProj(null)
    } catch (err) {
      console.error('Failed to update project:', err)
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleToggleMemberSelection = (empId) => {
    const next = new Set(selectedMemberIds)
    if (next.has(empId)) {
      next.delete(empId)
    } else {
      next.add(empId)
    }
    setSelectedMemberIds(next)
  }

  const handleSaveMembers = async (e) => {
    e.preventDefault()
    if (!memberModalProj) return

    const pId = memberModalProj.projectId || memberModalProj.id
    const updatedMembersList = allEmployees
      .filter((emp) => selectedMemberIds.has(String(emp.id)) || selectedMemberIds.has(String(emp.uid)))
      .map((emp) => ({
        uid: emp.uid || emp.id,
        id: emp.id || emp.uid,
        name: emp.name,
        email: emp.email,
        role: emp.role,
      }))

    // Always keep project creator on the member list
    if (memberModalProj.createdBy) {
      const creatorId = String(memberModalProj.createdBy)
      const hasCreator = updatedMembersList.some(
        (m) => String(m.uid) === creatorId || String(m.id) === creatorId
      )
      if (!hasCreator) {
        updatedMembersList.unshift({
          uid: memberModalProj.createdBy,
          id: memberModalProj.createdBy,
          name: memberModalProj.createdByName || memberModalProj.ownerName || 'Creator',
          email: memberModalProj.createdByEmail || '',
          role: memberModalProj.createdByRole || 'employee',
        })
      }
    }

    await updateProjectMembers(pId, updatedMembersList)
    setMemberModalProj(null)
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Project Management"
          description="Manage active client deliverables, sprint velocity, task boards, and team access"
          actions={
            <Button icon={Plus} variant="primary" onClick={() => setShowAddModal(true)}>
              New Project
            </Button>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
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
              <FolderKanban className="w-3.5 h-3.5" /> All Projects ({userVisibleProjects.length})
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
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Accessible Projects Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not have access to any projects matching your filter. Create a new project or ask the creator to add you to their project card.
          </p>
          <Button size="sm" icon={Plus} variant="primary" onClick={() => setShowAddModal(true)}>
            Initialize New Project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((proj) => {
            const pId = proj.projectId || proj.id
            const membersList = proj.members || []
            const isCreator =
              proj.createdBy && currentUserId && String(proj.createdBy) === String(currentUserId)

            return (
              <Card
                key={pId}
                hover
                className="space-y-4 border-slate-200 dark:border-slate-800 cursor-pointer group relative"
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
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenEditModal(proj)
                      }}
                      title="Edit project name & details"
                      className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {(isAdmin || isCreator) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirmProj(proj)
                        }}
                        title="Delete project"
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{proj.description}</p>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>Completion Velocity</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {proj.completionPercent || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-300/40 dark:border-slate-700/50">
                    <div
                      className="bg-emerald-500 dark:bg-emerald-400 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${proj.completionPercent || 0}%` }}
                    />
                  </div>
                </div>

                {/* Assigned Employees / Members on Project Card */}
                <div
                  className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3 text-indigo-500" /> Team:
                    </span>
                    {membersList.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">Only Creator</span>
                    ) : (
                      membersList.slice(0, 3).map((m, idx) => {
                        const name = typeof m === 'object' ? m.name || m.email : m
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium border border-slate-200 dark:border-slate-700"
                          >
                            <User className="w-2.5 h-2.5 text-indigo-500" />
                            {name}
                          </span>
                        )
                      })
                    )}
                    {membersList.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-semibold">
                        +{membersList.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Add Employee Button on Project Card */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMemberModalProj(proj)
                    }}
                    title="Add or manage employees in this project"
                    className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 text-[10px] font-bold rounded-lg transition-colors"
                  >
                    <UserPlus className="w-3 h-3" /> Add Employee
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                  <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />{' '}
                    {proj.completedTaskCount || 0} / {proj.totalTaskCount || 0} tasks
                  </span>
                  <div className="flex items-center gap-3">
                    {proj.estimatedDate && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <Calendar className="w-3.5 h-3.5" /> {proj.estimatedDate}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                      <Clock className="w-3.5 h-3.5" /> {proj.totalHoursLogged || 0} hrs
                    </span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Member Management Modal ("Add Employee in Project Card") */}
      {memberModalProj && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-500" /> Add Employees to Project Card
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Project: <strong className="text-indigo-600 dark:text-indigo-400">{memberModalProj.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setMemberModalProj(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Select team members to give them access and visibility to this project card and its tasks:
            </p>

            <form onSubmit={handleSaveMembers} className="space-y-4 flex-1 overflow-y-auto pr-1">
              {membersLoading ? (
                <div className="flex items-center justify-center py-8 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading team directory...
                </div>
              ) : allEmployees.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No additional employees registered in team directory.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {allEmployees.map((emp) => {
                    const empIdStr = String(emp.id || emp.uid)
                    const isChecked = selectedMemberIds.has(empIdStr)
                    const isCreator =
                      memberModalProj.createdBy && String(memberModalProj.createdBy) === empIdStr

                    return (
                      <div
                        key={empIdStr}
                        onClick={() => !isCreator && handleToggleMemberSelection(empIdStr)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700/60'
                            : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isCreator}
                            onChange={() => handleToggleMemberSelection(empIdStr)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                              {emp.name} {isCreator && '(Project Creator)'}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {emp.email || emp.role || 'Employee'}
                            </span>
                          </div>
                        </div>
                        {isCreator && (
                          <Badge variant="brand" className="text-[10px]">
                            Creator
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMemberModalProj(null)}
                  className="w-1/3"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" icon={ShieldCheck}>
                  Save Project Members
                </Button>
              </div>
            </form>
          </Card>
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
                  label="Project Budget"
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

              <Input
                label="Estimated Date"
                type="date"
                value={estimatedDate}
                onChange={(e) => setEstimatedDate(e.target.value)}
                required
              />

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

      {/* Edit Project Modal */}
      {editModalProj && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Edit Project</h3>
              </div>
              <button
                onClick={() => setEditModalProj(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="space-y-4">
              <Input
                label="Project Title *"
                placeholder="e.g. SaaS Refactor & API Redesign"
                value={editProjName}
                onChange={(e) => setEditProjName(e.target.value)}
                required
                autoFocus
              />

              <div className="grid grid-cols-2 gap-3">
                {/* Client Dropdown */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building className="w-3 h-3 text-indigo-500" /> Client
                  </label>
                  <select
                    value={editSelectedClientId}
                    onChange={(e) => {
                      setEditSelectedClientId(e.target.value)
                      const found = clients.find((c) => c.id === e.target.value)
                      if (found) setEditClientName(found.name)
                    }}
                    className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="">{editClientName || 'Select client'}</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white dark:bg-[#11141E]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Dropdown */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Project Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Project Budget ($ USD / ₹)"
                  type="number"
                  placeholder="45000"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                />

                <Input
                  label="Estimated Date"
                  type="date"
                  value={editEstimatedDate}
                  onChange={(e) => setEditEstimatedDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  placeholder="Outline project deliverables and scope..."
                  value={editDescription}
                  onChange={(e) => setDescription ? setEditDescription(e.target.value) : null}
                  className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl p-3 h-20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setEditModalProj(null)} className="w-1/3">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" disabled={editSubmitting}>
                  {editSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Confirm Delete Project Modal */}
      {deleteConfirmProj && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" /> Confirm Delete Project
              </h3>
              <button
                onClick={() => setDeleteConfirmProj(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete project <strong className="text-slate-900 dark:text-white">{deleteConfirmProj.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setDeleteConfirmProj(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  const targetId = deleteConfirmProj.projectId || deleteConfirmProj.id
                  if (targetId) {
                    await deleteProject(targetId)
                  }
                  setDeleteConfirmProj(null)
                }}
              >
                Yes, Delete Project
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
