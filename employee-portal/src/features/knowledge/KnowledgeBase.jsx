import React, { useState, useEffect } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { BookOpen, Plus, Search, FileText, Folder, X, User, Clock, ChevronRight, Loader2 } from 'lucide-react'
import { collection, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../shared/services/firebaseService'

export const KnowledgeBase = () => {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('SOPs')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true)
      try {
        const snap = await getDocs(collection(db, 'knowledge'))
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setArticles(list)
      } catch (err) {
        console.error('Error loading knowledge articles from Firestore:', err)
        setArticles([])
      } finally {
        setLoading(false)
      }
    }
    fetchArticles()
  }, [])

  // Form state
  const categories = ['All', 'SOPs', 'Engineering', 'Finance & Operations', 'HR & Benefits']

  const filteredArticles = articles.filter((a) => {
    const matchesSearch =
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.summary.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || a.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleCreateArticle = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    const docId = `doc_${Date.now()}`
    const newDoc = {
      id: docId,
      title,
      category,
      author: 'Team Staff',
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      summary: summary || 'Internal documentation article',
      content: content || title,
      createdAt: serverTimestamp(),
    }

    setArticles([{ ...newDoc, updatedAt: 'Just now' }, ...articles])
    setTitle('')
    setSummary('')
    setContent('')
    setShowAddModal(false)

    try {
      await setDoc(doc(db, 'knowledge', docId), newDoc)
    } catch (err) {
      console.error('Error saving article to Firestore:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Knowledge Base & Internal SOPs"
        description="Standard operating procedures, architectural guidelines, HR policies, and training materials"
        actions={
          <Button icon={Plus} variant="primary" onClick={() => setShowAddModal(true)}>
            New Article
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search documentation & SOPs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-[#181C27] border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin" />
          <span className="ml-3 text-slate-500 dark:text-slate-400 text-xs">Loading Knowledge Base from Firestore…</span>
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <BookOpen className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Articles Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No SOPs or documentation match your current filters. Publish a new article to build your team knowledge repository.
          </p>
          <Button size="sm" icon={Plus} variant="primary" onClick={() => setShowAddModal(true)}>
            Create First Article
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredArticles.map((doc) => (
            <Card
              key={doc.id}
              hover
              className="space-y-3.5 border-slate-200 dark:border-slate-800 cursor-pointer group flex flex-col justify-between"
              onClick={() => setSelectedDoc(doc)}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <Badge variant="brand">{doc.category}</Badge>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {doc.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{doc.summary}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {doc.author}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {doc.updatedAt}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Document View Drawer / Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-5 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27]">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <Badge variant="brand" className="mb-1.5">{selectedDoc.category}</Badge>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedDoc.title}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Updated {selectedDoc.updatedAt} by {selectedDoc.author}</p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="prose prose-sm text-slate-700 dark:text-slate-300 space-y-3 leading-relaxed">
              <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                {selectedDoc.summary}
              </p>
              <div className="whitespace-pre-line text-xs space-y-2 pt-2">
                {selectedDoc.content}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-right">
              <Button variant="secondary" size="sm" onClick={() => setSelectedDoc(null)}>
                Close Article
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* New Article Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Publish New SOP / Article</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateArticle} className="space-y-4">
              <Input
                label="Article Title"
                placeholder="e.g. Incident Response & Security SOP"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-100/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="SOPs" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">SOPs</option>
                  <option value="Engineering" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Engineering</option>
                  <option value="Finance & Operations" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Finance & Operations</option>
                  <option value="HR & Benefits" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">HR & Benefits</option>
                </select>
              </div>

              <Input
                label="Summary / Overview"
                placeholder="Brief summary of document..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Document Body / Content</label>
                <textarea
                  placeholder="Detailed guidelines, markdown or steps..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded-xl p-3 h-28 focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-1/3">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" icon={Plus}>
                  Publish Article
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

