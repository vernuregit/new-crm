import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

const CAMPAIGNS_CACHE_KEY = 'marketing_campaigns_cache'
const CONTENT_CACHE_KEY = 'marketing_content_cache'

/**
 * Fetch all marketing campaigns from Firestore (with localStorage fallback)
 */
export const getCampaigns = async () => {
  try {
    const snap = await getDocs(collection(db, 'campaigns'))
    const remoteDocs = snap.docs.map((d) => ({ campaignId: d.id, ...d.data() }))
    
    if (remoteDocs.length > 0) {
      localStorage.setItem(CAMPAIGNS_CACHE_KEY, JSON.stringify(remoteDocs))
      return remoteDocs
    }
    
    // Check fallback cache
    const cached = localStorage.getItem(CAMPAIGNS_CACHE_KEY)
    return cached ? JSON.parse(cached) : []
  } catch (err) {
    console.error('Error fetching campaigns from Firestore:', err)
    const cached = localStorage.getItem(CAMPAIGNS_CACHE_KEY)
    return cached ? JSON.parse(cached) : []
  }
}

/**
 * Create a marketing campaign document in Firestore (with localStorage sync)
 */
export const createCampaign = async (campaignData) => {
  let createdItem = { campaignId: `camp_${Date.now()}`, ...campaignData }
  
  try {
    const docRef = await addDoc(collection(db, 'campaigns'), {
      ...campaignData,
      createdAt: new Date().toISOString(),
    })
    createdItem = { campaignId: docRef.id, ...campaignData }
  } catch (err) {
    console.error('Error creating campaign in Firestore:', err)
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(CAMPAIGNS_CACHE_KEY)
    const existing = cached ? JSON.parse(cached) : []
    const updated = [createdItem, ...existing.filter((c) => c.campaignId !== createdItem.campaignId)]
    localStorage.setItem(CAMPAIGNS_CACHE_KEY, JSON.stringify(updated))
  } catch (cacheErr) {
    console.error('Error saving campaign to local cache:', cacheErr)
  }

  return createdItem
}

/**
 * Delete a marketing campaign document from Firestore
 */
export const deleteCampaignFromDb = async (campaignId) => {
  try {
    if (!campaignId) return
    await deleteDoc(doc(db, 'campaigns', campaignId))
  } catch (err) {
    console.error('Error deleting campaign from Firestore:', err)
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(CAMPAIGNS_CACHE_KEY)
    if (cached) {
      const existing = JSON.parse(cached)
      const updated = existing.filter((c) => c.campaignId !== campaignId)
      localStorage.setItem(CAMPAIGNS_CACHE_KEY, JSON.stringify(updated))
    }
  } catch (cacheErr) {
    console.error('Error updating cache on campaign delete:', cacheErr)
  }
}

/**
 * Fetch all content items from Firestore (with localStorage fallback)
 */
export const getContentItems = async () => {
  try {
    const snap = await getDocs(collection(db, 'marketing_content'))
    const remoteDocs = snap.docs.map((d) => ({ contentId: d.id, ...d.data() }))
    
    if (remoteDocs.length > 0) {
      localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(remoteDocs))
      return remoteDocs
    }
    
    const cached = localStorage.getItem(CONTENT_CACHE_KEY)
    return cached ? JSON.parse(cached) : []
  } catch (err) {
    console.error('Error fetching content items from Firestore:', err)
    const cached = localStorage.getItem(CONTENT_CACHE_KEY)
    return cached ? JSON.parse(cached) : []
  }
}

/**
 * Create a content item document in Firestore
 */
export const createContentItem = async (itemData) => {
  let createdItem = { contentId: `cnt_${Date.now()}`, ...itemData }

  try {
    const docRef = await addDoc(collection(db, 'marketing_content'), {
      ...itemData,
      createdAt: new Date().toISOString(),
    })
    createdItem = { contentId: docRef.id, ...itemData }
  } catch (err) {
    console.error('Error creating content item in Firestore:', err)
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(CONTENT_CACHE_KEY)
    const existing = cached ? JSON.parse(cached) : []
    const updated = [createdItem, ...existing.filter((i) => i.contentId !== createdItem.contentId)]
    localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(updated))
  } catch (cacheErr) {
    console.error('Error saving content item to local cache:', cacheErr)
  }

  return createdItem
}

/**
 * Delete a content item document from Firestore
 */
export const deleteContentItemFromDb = async (contentId) => {
  try {
    if (!contentId) return
    await deleteDoc(doc(db, 'marketing_content', contentId))
  } catch (err) {
    console.error('Error deleting content item from Firestore:', err)
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(CONTENT_CACHE_KEY)
    if (cached) {
      const existing = JSON.parse(cached)
      const updated = existing.filter((i) => i.contentId !== contentId)
      localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(updated))
    }
  } catch (cacheErr) {
    console.error('Error updating cache on content delete:', cacheErr)
  }
}
