import React, { useState, useEffect, useRef } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { usePortalStore } from './stores/portalStore'
import { useUserStore } from '../../stores/userStore'
import {
  getClientProjects,
  subscribeClientTickets,
  createClientTicket,
  addTicketReply,
} from './services/portalService'
import {
  Headphones,
  Plus,
  CheckCircle2,
  HelpCircle,
  X,
  MessageSquare,
  Send,
  Folder,
  Clock,
  User,
  ShieldCheck,
  Building,
  Loader2,
} from 'lucide-react'

export const ClientSupport = () => {
  const { user, userDoc } = useUserStore()
  const { tickets, setTickets, addTicket } = usePortalStore()

  const [projects, setProjects] = useState([])
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)

  // New Ticket Form State
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('General Inquiry')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Normal')
  const [submitting, setSubmitting] = useState(false)

  // Reply Form State
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const messagesEndRef = useRef(null)

  // Fetch client projects for project selector
  useEffect(() => {
    const loadProjects = async () => {
      if (user?.uid) {
        const projs = await getClientProjects(user.uid)
        setProjects(projs)
        if (projs.length > 0) setSelectedProjectId(projs[0].projectId || projs[0].id)
      }
    }
    loadProjects()
  }, [user])

  // Real-time subscription to tickets
  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeClientTickets(user.uid, (data) => {
      setTickets(data)
      // Keep selected ticket in sync if open
      if (selectedTicket) {
        const updated = data.find((t) => t.id === selectedTicket.id)
        if (updated) setSelectedTicket(updated)
      }
    })
    return () => unsub()
  }, [user, setTickets, selectedTicket?.id])

  // Auto scroll to latest reply
  useEffect(() => {
    if (selectedTicket) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedTicket?.replies?.length])

  const handleSubmitTicket = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !user?.uid) return

    setSubmitting(true)
    const targetProject = projects.find(
      (p) => (p.projectId || p.id) === selectedProjectId
    ) || {}

    // Extract all assigned employee IDs from the project document
    const assignedEmployeeIds = []
    if (Array.isArray(targetProject.assignedEmployees)) {
      targetProject.assignedEmployees.forEach((emp) => {
        if (typeof emp === 'string') assignedEmployeeIds.push(emp)
        else if (emp?.id || emp?.uid) assignedEmployeeIds.push(emp.id || emp.uid)
      })
    }
    if (Array.isArray(targetProject.assignedEmployeeIds)) {
      targetProject.assignedEmployeeIds.forEach((id) => assignedEmployeeIds.push(id))
    }
    if (Array.isArray(targetProject.teamMembers)) {
      targetProject.teamMembers.forEach((id) => assignedEmployeeIds.push(id))
    }
    if (targetProject.ownerId) assignedEmployeeIds.push(targetProject.ownerId)
    if (targetProject.assignedTo) assignedEmployeeIds.push(targetProject.assignedTo)

    const uniqueEmployeeIds = Array.from(new Set(assignedEmployeeIds.map(String)))

    const newTicketData = {
      subject,
      category,
      description,
      priority,
      status: 'Open',
      projectId: selectedProjectId || '',
      projectName: targetProject.name || targetProject.title || 'General Support',
      assignedEmployeeIds: uniqueEmployeeIds,
      clientId: user.uid,
      clientEmail: user.email || '',
      clientName: userDoc?.displayName || user.displayName || 'Client',
      createdBy: user.uid,
      date: new Date().toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      replies: [],
    }

    try {
      const createdId = await createClientTicket(newTicketData)
      addTicket({ id: createdId || `ticket_${Date.now()}`, ...newTicketData })

      setSubject('')
      setDescription('')
      setShowNewModal(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedTicket || !user) return

    setSendingReply(true)
    try {
      await addTicketReply(selectedTicket.id, {
        senderId: user.uid,
        senderName: userDoc?.displayName || user.displayName || 'Client',
        senderRole: 'client',
        message: replyText.trim(),
      })
      setReplyText('')
    } catch (err) {
      alert('Failed to send reply: ' + err.message)
    } finally {
      setSendingReply(false)
    }
  }

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Client Support & Help Desk
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Submit project support tickets, talk with assigned project engineers & admins, and track resolution.
          </p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setShowNewModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer px-4 py-2 text-xs font-semibold rounded-xl"
        >
          New Support Ticket
        </Button>
      </div>

      {/* Support Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-6 bg-white dark:bg-[#111827] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Assigned Project Leads</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Tickets route directly to team</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-[#111827] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">2-Way Live Discussion</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Real-time team & admin replies</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-[#111827] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Active SLA Guarantee</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">99.9% resolution commitment</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tickets List */}
      <Card className="p-6 bg-white dark:bg-[#111827] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800/80">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            Your Support Tickets ({tickets.length})
          </h3>
          <span className="text-xs text-slate-400">Click any ticket to open discussion thread</span>
        </div>

        {tickets.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Headphones className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Open Support Tickets</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              You do not have any open tickets right now. If you need any assistance with your project deliverables, click the button above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {tickets.map((t) => {
              const statusLower = (t.status || 'open').toLowerCase()
              const isResolved = statusLower === 'resolved' || statusLower === 'closed'
              const repliesCount = Array.isArray(t.replies) ? t.replies.length : 0

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 p-3 rounded-xl transition-all cursor-pointer"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {t.subject}
                      </span>
                      {t.projectName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
                          <Folder className="w-3 h-3" />
                          {t.projectName}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isResolved
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
                        }`}
                      >
                        {t.status || 'Open'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {t.priority || 'Normal'}
                      </span>
                    </div>

                    {t.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                        {t.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Category: {t.category}</span>
                      <span>• Created: {t.date || 'Recent'}</span>
                      {repliesCount > 0 && (
                        <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {repliesCount} {repliesCount === 1 ? 'reply' : 'replies'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Open Thread</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Create Support Ticket
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              {/* Project Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Related Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {projects.length === 0 ? (
                    <option value="">No active projects assigned</option>
                  ) : (
                    projects.map((p) => (
                      <option key={p.projectId || p.id} value={p.projectId || p.id}>
                        {p.name || p.title}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ticket will route automatically to the engineers and leads working on this project.
                </p>
              </div>

              <Input
                label="Subject / Topic"
                placeholder="e.g. Question on milestone deliverable or bug"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="Technical Bug">Technical Bug</option>
                    <option value="Deliverable Review">Deliverable Review</option>
                    <option value="Billing & Invoices">Billing & Invoices</option>
                    <option value="General Inquiry">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide clear steps, requests, or questions..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowNewModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting ? 'Submitting...' : 'Submit Support Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Conversation / Discussion Thread Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedTicket.subject}
                  </span>
                  <Badge variant={selectedTicket.status === 'Open' ? 'warning' : 'success'}>
                    {selectedTicket.status}
                  </Badge>
                  <Badge variant="neutral">{selectedTicket.priority}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {selectedTicket.projectName}
                  </span>
                  <span>• Category: {selectedTicket.category}</span>
                  <span>• {selectedTicket.date}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Messages Stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Original Ticket Request Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px]">
                      <User className="w-3 h-3" />
                    </div>
                    <span>{selectedTicket.clientName || 'You (Client)'}</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 px-1.5 py-0.5 rounded">
                      Initial Request
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">{selectedTicket.date}</span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Replies */}
              {Array.isArray(selectedTicket.replies) && selectedTicket.replies.length > 0 ? (
                selectedTicket.replies.map((reply) => {
                  const isClient = reply.senderRole === 'client'
                  const isAdmin = reply.senderRole === 'admin'
                  const isEmployee = reply.senderRole === 'employee'

                  return (
                    <div
                      key={reply.id}
                      className={`flex flex-col space-y-1 ${
                        isClient ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {reply.senderName}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            isAdmin
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                              : isEmployee
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {isAdmin ? 'Admin' : isEmployee ? 'Project Engineer' : 'Client'}
                        </span>
                        <span>
                          {reply.createdAt
                            ? new Date(reply.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed ${
                          isClient
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-2xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No replies yet. Project engineers and admins will reply here shortly.
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input Bar */}
            <form
              onSubmit={handleSendReply}
              className="p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0"
            >
              <Input
                placeholder="Type your message or response to the team..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 text-xs"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!replyText.trim() || sendingReply}
                icon={Send}
                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 cursor-pointer"
              >
                {sendingReply ? 'Sending...' : 'Reply'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


