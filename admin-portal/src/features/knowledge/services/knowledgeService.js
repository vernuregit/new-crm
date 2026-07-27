import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

/**
 * Fetch all Knowledge Base articles from Firestore
 */
export const getArticles = async () => {
  try {
    const q = query(collection(db, 'knowledgeArticles'), orderBy('updatedAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ articleId: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching articles from Firestore:', err)
    return []
  }
}

/**
 * Create a new Knowledge Base article in Firestore
 */
export const createArticle = async (articleData) => {
  try {
    const payload = {
      ...articleData,
      author: articleData.author || 'Admin',
      category: articleData.category || 'General SOP',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const docRef = await addDoc(collection(db, 'knowledgeArticles'), payload)
    return { articleId: docRef.id, ...payload }
  } catch (err) {
    console.error('Error creating article in Firestore:', err)
    return { articleId: `art_${Date.now()}`, ...articleData, author: 'Admin', createdAt: new Date().toISOString() }
  }
}

/**
 * Delete an article from Firestore
 */
export const deleteArticleFromDb = async (articleId) => {
  try {
    if (!articleId) return
    await deleteDoc(doc(db, 'knowledgeArticles', articleId))
  } catch (err) {
    console.error('Error deleting article from Firestore:', err)
  }
}
