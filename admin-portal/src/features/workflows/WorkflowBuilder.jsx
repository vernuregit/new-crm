import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useWorkflowStore } from './stores/workflowStore'
import { createWorkflow, createWorkflowRun } from './services/workflowService'
import { GitBranch, SlidersHorizontal, History, Save, Loader2, Mail } from 'lucide-react'

export const WorkflowBuilder = () => {
  const navigate = useNavigate()
  const { addWorkflow, addRun } = useWorkflowStore()

  const [name, setName] = useState('')
  const [triggerEvent, setTriggerEvent] = useState('crm.lead.won')
  const [condition, setCondition] = useState('lead.estimatedValue >= 10000')
  const [actionType, setActionType] = useState('send_email')

  // Email Config state
  const [recipientEmail, setRecipientEmail] = useState('manager@company.com')
  const [emailSubject, setEmailSubject] = useState('High Value Lead Alert!')
  const [emailBody, setEmailBody] = useState(
    'A high value lead has been marked as WON in CRM. Please process the onboarding setup.'
  )

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSaveWorkflow = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Rule name is required.')
      return
    }
    setError('')
    setIsSaving(true)

    const actionParams =
      actionType === 'send_email'
        ? { recipientEmail, subject: emailSubject, body: emailBody }
        : {}

    const workflowPayload = {
      name: name.trim(),
      triggerEvent,
      condition,
      actions: [{ type: actionType, params: actionParams }],
    }

    // Persist to Firestore and get back doc with Firestore ID
    const savedWorkflow = await createWorkflow(workflowPayload)

    // Add to Zustand store optimistically
    addWorkflow(savedWorkflow)

    // Create execution log entry in Firestore (which triggers Nodemailer for emails)
    const runPayload = {
      workflowId: savedWorkflow.workflowId,
      workflowName: savedWorkflow.name,
      triggeredBy: `System: Rule activated on save`,
      actionType: actionType,
      recipientEmail: actionType === 'send_email' ? recipientEmail : null,
      emailConfig:
        actionType === 'send_email'
          ? { recipientEmail, subject: emailSubject, body: emailBody }
          : null,
      logs: [
        `[INIT] Workflow rule "${savedWorkflow.name}" registered in engine.`,
        `[TRIGGER] Listening for event: ${triggerEvent}`,
        `[CONDITION] Evaluating: ${condition}`,
        actionType === 'send_email'
          ? `[ACTION] Nodemailer Email queued for ${recipientEmail}`
          : `[ACTION] Action queued: ${actionType}`,
      ],
      status: 'success',
    }

    const savedRun = await createWorkflowRun(runPayload)
    if (savedRun) addRun(savedRun)

    setIsSaving(false)
    navigate('/workflows')
  }

  const selectClass =
    'w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer'

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Create Automation Rule"
          description="Configure event triggers, boolean logic conditions, and automated Nodemailer email actions"
        />

        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <NavLink
            to="/workflows"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <GitBranch className="w-3.5 h-3.5" /> Automation Rules
          </NavLink>
          <NavLink
            to="/workflows/builder"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Rule Builder
          </NavLink>
          <NavLink
            to="/workflows/history"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <History className="w-3.5 h-3.5" /> Execution Logs
          </NavLink>
        </div>
      </div>

      <Card className="max-w-xl space-y-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181C27]">
        <form onSubmit={handleSaveWorkflow} className="space-y-4">
          <Input
            label="Rule Name"
            placeholder="e.g. Notify Manager on High Value Lead"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {error && <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">{error}</p>}

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              1. Trigger Event (WHEN)
            </label>
            <select
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value)}
              className={selectClass}
            >
              <option value="crm.lead.won" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">CRM: Lead Status Changed to Won</option>
              <option value="crm.lead.created" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">CRM: New Lead Created</option>
              <option value="finance.invoice.overdue" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Finance: Invoice Overdue</option>
              <option value="finance.invoice.paid" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Finance: Invoice Payment Received</option>
              <option value="project.task.logged_hours" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Projects: Work Hours Logged</option>
            </select>
          </div>

          <Input
            label="2. Condition Expression (IF)"
            placeholder="e.g. lead.estimatedValue >= 10000"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          />

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              3. Action Executed (THEN)
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className={selectClass}
            >
              <option value="send_email" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Send Email Template (via Nodemailer)</option>
              <option value="create_client_portal_user" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Create Client Portal User Profile</option>
              <option value="send_in_app_notification" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Send In-App Notification</option>
              <option value="send_slack_alert" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Post Slack Alert</option>
            </select>
          </div>

          {/* Dynamic Nodemailer Email Configuration Fields */}
          {actionType === 'send_email' && (
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 space-y-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Mail className="w-4 h-4" />
                <span>Nodemailer Email Parameters</span>
              </div>

              <Input
                label="Recipient Email Address"
                type="email"
                placeholder="e.g. manager@company.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
              />

              <Input
                label="Email Subject"
                placeholder="e.g. Alert: New High Value Lead"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                required
              />

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Email Content / Body</label>
                <textarea
                  rows={3}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Type email body message..."
                  required
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/workflows')}
              className="w-1/3"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-2/3"
              icon={isSaving ? Loader2 : Save}
              disabled={isSaving}
            >
              {isSaving ? 'Saving & Queuing Email...' : 'Save Rule'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
