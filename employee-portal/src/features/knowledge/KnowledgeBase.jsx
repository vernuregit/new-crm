import React, { useState, useEffect } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { BookOpen, Plus, Search, X, User, Clock, Loader2, Trash2 } from 'lucide-react'
import { getArticles, createArticle, deleteArticleFromDb } from './services/knowledgeService'
import { useUserStore } from '../../stores/userStore'

export const KnowledgeBase = () => {
  const { user, userDoc } = useUserStore()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('SOPs')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [author, setAuthor] = useState('')

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const list = await getArticles()
      setArticles(list)
    } catch (err) {
      console.error('Error loading knowledge articles from Firestore:', err)
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArticles()
  }, [])

  // Categories
  const categories = ['All', 'SOPs', 'Client Onboarding SOP', 'Engineering', 'Finance & Operations', 'HR & Benefits']

  const filteredArticles = articles.filter((a) => {
    const titleMatch = a.title?.toLowerCase().includes(searchQuery.toLowerCase())
    const summaryMatch = a.summary?.toLowerCase().includes(searchQuery.toLowerCase())
    const contentMatch = a.content?.toLowerCase().includes(searchQuery.toLowerCase())
    const authorMatch = a.author?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesSearch = !searchQuery || titleMatch || summaryMatch || contentMatch || authorMatch
    const matchesCategory = selectedCategory === 'All' || a.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleCreateArticle = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    setIsSaving(true)
    const effectiveAuthor =
      author.trim() ||
      userDoc?.fullName ||
      user?.displayName ||
      user?.email?.split('@')[0] ||
      'Employee Staff'

    const newDoc = {
      title: title.trim(),
      category,
      summary: summary.trim() || content.trim().substring(0, 150),
      content: content.trim(),
      author: effectiveAuthor,
      createdByRole: 'Employee',
    }

    const created = await createArticle(newDoc)
    setArticles([created, ...articles])

    setTitle('')
    setSummary('')
    setContent('')
    setAuthor('')
    setIsSaving(false)
    setShowAddModal(false)
  }

  const handleDelete = async (e, articleId) => {
    e.stopPropagation()
    setArticles((prev) => prev.filter((a) => (a.articleId || a.id) !== articleId))
    await deleteArticleFromDb(articleId)
    if (selectedDoc && (selectedDoc.articleId === articleId || selectedDoc.id === articleId)) {
      setSelectedDoc(null)
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
          <span className="ml-3 text-slate-500 dark:text-slate-400 text-xs">Loading Knowledge Base…</span>
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-slate-300 dark:border-slate-800 space-y-3 bg-white dark:bg-[#181C27]">
          <BookOpen className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Articles Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No SOPs or documentation match your current filters. Publish a new article to build your team knowledge repository.
          </p>
          <Button size="sm" icon={Plus} variant="primary" onClick={() => setShowAddModal(true)} className="mx-auto">
            Create First Article
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredArticles.map((docItem) => {
            const articleId = docItem.articleId || docItem.id
            const isEmployeePost =
              docItem.createdByRole === 'Employee' ||
              docItem.author?.toLowerCase().includes('employee') ||
              docItem.author?.toLowerCase().includes('staff')

            return (
              <Card
                key={articleId}
                hover
                className="space-y-3.5 border-slate-200 dark:border-slate-800 cursor-pointer group flex flex-col justify-between bg-white dark:bg-[#181C27]"
                onClick={() => setSelectedDoc(docItem)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, articleId)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete Article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="brand">{docItem.category || 'SOPs'}</Badge>
                      {isEmployeePost ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Employee Post
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          Admin Post
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {docItem.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {docItem.summary || docItem.content}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {docItem.author || 'Author'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    {docItem.updatedAt ? new Date(docItem.updatedAt).toLocaleDateString() : 'Recently'}
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Document View Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-5 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27]">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="brand">{selectedDoc.category || 'SOPs'}</Badge>
                  {selectedDoc.createdByRole === 'Employee' || selectedDoc.author?.toLowerCase().includes('employee') ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Employee Article
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      Admin Article
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedDoc.title}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Author: {selectedDoc.author || 'Unknown'} • Updated:{' '}
                  {selectedDoc.updatedAt ? new Date(selectedDoc.updatedAt).toLocaleString() : 'Recently'}
                </p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="prose prose-sm text-slate-700 dark:text-slate-300 space-y-3 leading-relaxed">
              {selectedDoc.summary && (
                <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {selectedDoc.summary}
                </p>
              )}
              <div className="whitespace-pre-wrap text-xs space-y-2 pt-2">
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
                  <option value="Client Onboarding SOP" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Client Onboarding SOP</option>
                  <option value="Engineering" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Engineering</option>
                  <option value="Finance & Operations" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Finance & Operations</option>
                  <option value="HR & Benefits" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">HR & Benefits</option>
                </select>
              </div>

              <Input
                label="Author Name"
                placeholder={userDoc?.fullName || user?.displayName || 'Employee Staff'}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />

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
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-1/3" disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" icon={isSaving ? Loader2 : Plus} disabled={isSaving}>
                  {isSaving ? 'Publishing...' : 'Publish Article'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
