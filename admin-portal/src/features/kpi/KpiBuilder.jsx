import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useKPIStore } from './stores/kpiStore'
import { createKpiDefinition } from './services/kpiService'
import { Activity, SlidersHorizontal, Save } from 'lucide-react'

export const KpiBuilder = () => {
  const navigate = useNavigate()
  const { addKpiDefinition } = useKPIStore()

  const [name, setName] = useState('')
  const [module, setModule] = useState('crm')
  const [formula, setFormula] = useState('(Won Deals / Total Closed Deals) * 100')
  const [targetValue, setTargetValue] = useState(80)
  const [unit, setUnit] = useState('%')
  const [weight, setWeight] = useState(0.25)
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveKpi = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)

    const kpiData = {
      name,
      module,
      formula,
      targetValue: Number(targetValue),
      targetOperator: 'gte',
      unit,
      healthScoreWeight: Number(weight),
    }

    // Save to Firestore first, get the real ID back
    const saved = await createKpiDefinition(kpiData)

    // Update the local store with the Firestore-assigned kpiId
    addKpiDefinition({ ...kpiData, kpiId: saved.kpiId })

    setIsSaving(false)
    navigate('/kpi')
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="KPI Rules & Target Builder"
          description="Define custom organization metrics, mathematical aggregation formulas, and health score weightings"
        />

        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <NavLink
            to="/kpi"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Activity className="w-3.5 h-3.5" /> Health Score Dashboard
          </NavLink>
          <NavLink
            to="/kpi/builder"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> KPI Rules Builder
          </NavLink>
        </div>
      </div>

      <Card className="max-w-xl space-y-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181C27]">
        <form onSubmit={handleSaveKpi} className="space-y-4">
          <Input
            label="KPI Name"
            placeholder="e.g. Lead Conversion Velocity"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Target Module</label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="crm" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">CRM & Pipeline</option>
                <option value="finance" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Finance & Revenue</option>
                <option value="projects" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Projects & Delivery</option>
                <option value="team" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Team & Personnel</option>
              </select>
            </div>

            <Input
              label="Unit Label"
              placeholder="%, INR, count, hours"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>

          <Input
            label="Formula Description"
            placeholder="e.g. (Total Revenue / Total Expenses)"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Target Threshold Value"
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Health Weight (0 - 1.0)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/kpi')} className="w-1/3">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-2/3"
              icon={Save}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save KPI Rule'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
