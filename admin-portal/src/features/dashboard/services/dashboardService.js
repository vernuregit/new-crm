import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

/**
 * Compute Monthly Recurring Revenue from paid invoices in the current month.
 */
export const getMRR = async () => {
  const snap = await getDocs(collection(db, 'invoices'))
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  let mrr = 0
  let prevMrr = 0

  snap.docs.forEach((d) => {
    const data = d.data()
    if (data.status !== 'paid' && data.status !== 'Paid') return
    const createdAt = data.createdAt ? new Date(data.createdAt) : null
    if (!createdAt) return
    const amount = Number(data.amount) || Number(data.total) || 0

    if (
      createdAt.getMonth() === currentMonth &&
      createdAt.getFullYear() === currentYear
    ) {
      mrr += amount
    }

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
    if (
      createdAt.getMonth() === prevMonth &&
      createdAt.getFullYear() === prevYear
    ) {
      prevMrr += amount
    }
  })

  const changePercent =
    prevMrr > 0 ? (((mrr - prevMrr) / prevMrr) * 100).toFixed(1) : null

  return { mrr, prevMrr, changePercent }
}

/**
 * Compute active CRM pipeline value and opportunity count from open leads.
 */
export const getCRMPipeline = async () => {
  const snap = await getDocs(collection(db, 'leads'))
  let pipelineValue = 0
  let activeCount = 0
  const closedStages = ['closed_won', 'closed_lost', 'won', 'lost']

  snap.docs.forEach((d) => {
    const data = d.data()
    const stage = (data.pipelineStageId || '').toLowerCase()
    if (closedStages.includes(stage)) return
    pipelineValue += Number(data.estimatedValue) || Number(data.value) || 0
    activeCount++
  })

  return { pipelineValue, activeCount }
}

/**
 * Compute active vs total project counts and on-time rate from Firestore.
 */
export const getProjectStats = async () => {
  const snap = await getDocs(collection(db, 'projects'))
  const all = snap.docs.map((d) => d.data())
  const total = all.length
  const active = all.filter(
    (p) =>
      p.status === 'active' ||
      p.status === 'in_progress' ||
      p.status === 'Active' ||
      p.status === 'In Progress'
  ).length

  const taskSnap = await getDocs(collection(db, 'tasks'))
  const tasks = taskSnap.docs.map((d) => d.data())
  const doneTasks = tasks.filter(
    (t) => t.status === 'done' || t.status === 'completed'
  )
  const onTimeTasks = doneTasks.filter((t) => {
    if (!t.dueDate || !t.completedAt) return true
    return new Date(t.completedAt) <= new Date(t.dueDate)
  })
  const onTimeRate =
    doneTasks.length > 0
      ? Math.round((onTimeTasks.length / doneTasks.length) * 100)
      : null

  return { active, total, onTimeRate }
}

/**
 * Fetch the latest health score from Firestore healthScores collection.
 * Returns null fields if no snapshot exists yet.
 */
export const getHealthScore = async () => {
  const q = query(
    collection(db, 'healthScores'),
    orderBy('calculatedAt', 'desc'),
    limit(1)
  )
  const snap = await getDocs(q)
  if (!snap.empty) {
    const d = snap.docs[0].data()
    return {
      overall: d.overall ?? d.overallScore ?? d.score ?? null,
      crm: d.crm ?? d.breakdown?.crm?.score ?? null,
      finance: d.finance ?? d.breakdown?.finance?.score ?? null,
      projects: d.projects ?? d.breakdown?.projects?.score ?? null,
    }
  }
  return { overall: null, crm: null, finance: null, projects: null }
}

/**
 * Build a unified recent activity feed from invoices and leads,
 * ordered by createdAt descending, limited to 4 entries.
 * Returns an empty array if Firestore has no data yet.
 */
export const getRecentActivity = async () => {
  const [invoiceSnap, leadSnap, projectSnap] = await Promise.all([
    getDocs(query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(10))),
    getDocs(query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(10))),
    getDocs(query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(5))),
  ])

  const activities = []

  invoiceSnap.docs.forEach((d) => {
    const data = d.data()
    if (data.status === 'paid' || data.status === 'Paid') {
      const amt = Number(data.amount || data.total || 0)
      activities.push({
        id: d.id,
        title: `Invoice ${data.invoiceNumber || d.id.slice(0, 8).toUpperCase()} paid${data.clientName ? ` by ${data.clientName}` : ''}`,
        type: 'finance',
        label: amt ? `+₹${amt.toLocaleString('en-IN')}` : 'Paid',
        createdAt: data.createdAt || '',
      })
    }
  })

  leadSnap.docs.forEach((d) => {
    const data = d.data()
    const amt = Number(data.estimatedValue || data.value || 0)
    activities.push({
      id: d.id,
      title: `New lead: ${data.name || data.companyName || 'Unknown'}`,
      type: 'crm',
      label: amt ? `₹${amt.toLocaleString('en-IN')}` : 'Lead',
      createdAt: data.createdAt || '',
    })
  })

  projectSnap.docs.forEach((d) => {
    const data = d.data()
    if (data.status === 'completed' || data.status === 'done') {
      activities.push({
        id: d.id,
        title: `Project "${data.name || data.title}" completed`,
        type: 'project',
        label: 'Completed',
        createdAt: data.createdAt || '',
      })
    }
  })

  activities.sort((a, b) => {
    if (!a.createdAt) return 1
    if (!b.createdAt) return -1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  return activities.slice(0, 4)
}
