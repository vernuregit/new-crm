import React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { BookOpen, Plus, Search } from 'lucide-react'

export const KnowledgeBase = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base & SOPs"
        description="Internal standard operating procedures, training docs, and client guides"
        actions={<Button icon={Plus}>New Article</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Client Onboarding SOP', 'Invoice Approval Workflow Guide', 'Engineering Code Review Guidelines'].map((doc, i) => (
          <Card key={i} hover className="space-y-3 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-slate-100 text-sm">{doc}</h4>
            <p className="text-xs text-slate-400">Updated 3 days ago by Admin</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
