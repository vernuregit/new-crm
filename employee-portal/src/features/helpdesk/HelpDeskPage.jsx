import React, { useState, useEffect, useRef } from 'react'
import {
  LifeBuoy,
  Plus,
  X,
  Monitor,
  Users,
  DollarSign,
  Building,
  HelpCircle,
  CheckCircle2,
  Folder,
  User,
  MessageSquare,
  Send,
  Building2,
  Clock,
  Check,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/layout/PageHeader'
import { useUserStore } from '../../stores/userStore'
import {
  subscribeEmployeeHelpDesk,
  createTicket,
  addTicketReply,
  updateTicketStatus,
} from './services/helpDeskService'

export const HelpDeskPage = () => {
  const { user, userDoc } = useUserStore()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  // View & Filter states
  const [sectionTab, setSectionTab] = useState('client_tickets') // 'client_tickets' | 'internal_tickets'
  const [statusFilter, setStatusFilter] = useState('All')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)

  // Internal Ticket Form
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('it')
  const [priority, setPriority] = useState('medium')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reply Form State
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (!user?.uid) return
    const unsubscribe = subscribeEmployeeHelpDesk(user.uid, (data) => {
      setTickets(data)
      setLoading(false)

      if (selectedTicket) {
        const updated = data.find((t) => t.id === selectedTicket.id)
        if (updated) setSelectedTicket(updated)
      }
    })
    return () => unsubscribe()
  }, [user, selectedTicket?.id])

  useEffect(() => {
    if (selectedTicket) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedTicket?.replies?.length])

  // Split into Client Project tickets vs My Internal requests
  const clientTickets = tickets.filter((t) => !!(t.clientId || t.clientEmail || t.projectName))
  const internalTickets = tickets.filter(
    (t) => t.createdBy === user?.uid && !t.clientId && !t.clientEmail
  )

  const activePool = sectionTab === 'client_tickets' ? clientTickets : internalTickets

  const filteredTickets = activePool.filter((ticket) => {
    const status = (ticket.status || 'open').toLowerCase()
    if (statusFilter === 'All') return true
    if (statusFilter === 'Open') return status === 'open'
    if (statusFilter === 'In Progress') return status === 'in_progress'
    if (statusFilter === 'Resolved') return status === 'resolved' || status === 'closed'
    return true
  })

  const handleSubmitInternal = async (e) => {
    e.preventDefault()
    if (!subject || !user?.uid) return

    setIsSubmitting(true)
    try {
      await createTicket(user.uid, {
        subject,
        description,
        category,
        priority,
        status: 'open',
        employeeName: userDoc?.displayName || user.displayName || 'Employee',
        employeeEmail: user.email || '',
      })
      setIsFormOpen(false)
      setSubject('')
      setDescription('')
      setCategory('it')
      setPriority('medium')
    } catch (error) {
      console.error('Error creating ticket:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedTicket || !user) return

    setSendingReply(true)
    try {
      await addTicketReply(selectedTicket.id, {
        senderId: user.uid,
        senderName: userDoc?.displayName || user.displayName || 'Project Engineer',
        senderRole: 'employee',
        message: replyText.trim(),
      })
      setReplyText('')
    } catch (err) {
      alert('Failed to post reply: ' + err.message)
    } finally {
      setSendingReply(false)
    }
  }

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await updateTicketStatus(ticketId, newStatus)
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      console.error('Failed to change status:', err)
    }
  }

  const getPriorityColor = (prio) => {
    const p = (prio || 'medium').toLowerCase()
    switch (p) {
      case 'urgent':
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'normal':
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  const getStatusBadge = (status = 'open') => {
    const s = status.toLowerCase()
    if (s === 'resolved' || s === 'closed') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          Resolved
        </span>
      )
    }
    if (s === 'in_progress') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          In Progress
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
        Open
      </span>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Help Desk & Support"
        description="Collaborate with clients on project support requests and submit internal company inquiries."
        actions={
          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer rounded-xl"
          >
            <Plus className="w-4 h-4" />
            <span>New Internal Request</span>
          </Button>
        }
      />

      {/* Primary Section Switcher */}
      <div className="flex gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setSectionTab('client_tickets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            sectionTab === 'client_tickets'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>Client Project Tickets ({clientTickets.length})</span>
        </button>

        <button
          onClick={() => setSectionTab('internal_tickets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            sectionTab === 'internal_tickets'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LifeBuoy className="w-3.5 h-3.5" />
          <span>My Internal Requests ({internalTickets.length})</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
        {['All', 'Open', 'In Progress', 'Resolved'].map((tab) => {
          const count =
            tab === 'All'
              ? activePool.length
              : activePool.filter((t) => {
                  const s = (t.status || 'open').toLowerCase()
                  if (tab === 'Open') return s === 'open'
                  if (tab === 'In Progress') return s === 'in_progress'
                  if (tab === 'Resolved') return s === 'resolved' || s === 'closed'
                  return true
                }).length

          return (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                statusFilter === tab
                  ? 'bg-white dark:bg-[#12151E] text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab}</span>
              <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-0.2 px-1.5 rounded-full text-[10px]">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card className="p-12 text-center text-slate-500 dark:text-slate-400 border-dashed space-y-2">
          <LifeBuoy className="w-10 h-10 mx-auto text-slate-400" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {sectionTab === 'client_tickets'
              ? 'No Client Tickets Assigned'
              : 'No Internal Support Requests'}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {sectionTab === 'client_tickets'
              ? 'Support tickets created by clients for your assigned projects will appear here with live reply options.'
              : 'You do not have any open internal support tickets.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map((ticket) => {
            const repliesCount = Array.isArray(ticket.replies) ? ticket.replies.length : 0
            const clientName = ticket.clientName || ticket.clientEmail || 'Client'

            return (
              <Card
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="p-5 flex flex-col justify-between hover:shadow-xs hover:border-blue-300 dark:hover:border-blue-600/40 transition-all cursor-pointer bg-white dark:bg-[#12151E] border-slate-200 dark:border-purple-900/30 rounded-2xl"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {ticket.projectName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
                            <Folder className="w-3 h-3" />
                            {ticket.projectName}
                          </span>
                        )}
                        {ticket.clientName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <Building2 className="w-3 h-3" />
                            {clientName}
                          </span>
                        )}
                        {getStatusBadge(ticket.status)}
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {ticket.subject}
                      </h4>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize shrink-0 ${getPriorityColor(
                        ticket.priority
                      )}`}
                    >
                      {ticket.priority || 'Medium'}
                    </span>
                  </div>

                  {ticket.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {ticket.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <span className="text-[11px] text-slate-400">
                    Category: {ticket.category || 'General'}
                  </span>

                  <div className="flex items-center gap-2">
                    {repliesCount > 0 && (
                      <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {repliesCount}
                      </span>
                    )}
                    <button className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 transition-colors">
                      Open Discussion
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Interactive Ticket Discussion Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedTicket.subject}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${getPriorityColor(
                      selectedTicket.priority
                    )}`}
                  >
                    {selectedTicket.priority || 'Medium'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {selectedTicket.projectName && (
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {selectedTicket.projectName}
                    </span>
                  )}
                  <span>• Client: {selectedTicket.clientName || selectedTicket.clientEmail || 'Client'}</span>
                  <span>• Category: {selectedTicket.category}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Toggle buttons */}
                {selectedTicket.status !== 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange(selectedTicket.id, 'in_progress')}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    Mark In Progress
                  </button>
                )}
                {selectedTicket.status !== 'resolved' && (
                  <button
                    onClick={() => handleStatusChange(selectedTicket.id, 'resolved')}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Resolve</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Original Request Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px]">
                      <User className="w-3 h-3" />
                    </div>
                    <span>{selectedTicket.clientName || selectedTicket.employeeName || 'Creator'}</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 px-1.5 py-0.5 rounded">
                      Initial Request
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {selectedTicket.date || 'Recent'}
                  </span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Replies */}
              {Array.isArray(selectedTicket.replies) && selectedTicket.replies.length > 0 ? (
                selectedTicket.replies.map((reply) => {
                  const isMe = reply.senderId === user.uid
                  const isAdmin = reply.senderRole === 'admin'
                  const isClient = reply.senderRole === 'client'

                  return (
                    <div
                      key={reply.id}
                      className={`flex flex-col space-y-1 ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {isMe ? 'You' : reply.senderName}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            isAdmin
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                              : isClient
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}
                        >
                          {isAdmin ? 'Admin' : isClient ? 'Client' : 'Team Member'}
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
                          isMe
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
                  No replies in this thread yet. Type your answer below to reply directly to the client and admins.
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <form
              onSubmit={handleSendReply}
              className="p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0"
            >
              <Input
                placeholder="Type your response to the client..."
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

      {/* New Internal Ticket Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#12151E] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                New Internal Support Request
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitInternal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  className="w-full bg-white dark:bg-[#0F1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="it">IT Support</option>
                  <option value="hr">HR</option>
                  <option value="finance">Finance</option>
                  <option value="facilities">Facilities</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Priority
                </label>
                <div className="flex gap-2">
                  {['low', 'medium', 'high'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold capitalize border cursor-pointer ${
                        priority === p
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of the issue"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full bg-white dark:bg-[#0F1117] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details about your request..."
                />
              </div>

              <div className="pt-3 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
