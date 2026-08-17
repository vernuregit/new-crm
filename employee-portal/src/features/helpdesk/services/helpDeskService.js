import { collection, doc, addDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../../shared/services/firebaseService';

export const subscribeMyTickets = (uid, callback) => {
  if (!uid) return () => {};
  const ticketsRef = collection(db, 'helpDeskTickets');
  const q = query(ticketsRef, where('createdBy', '==', uid), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(tickets);
  });
};

export const createTicket = async (uid, ticketData) => {
  if (!uid) throw new Error('User ID is required');
  const ticketsRef = collection(db, 'helpDeskTickets');
  return await addDoc(ticketsRef, {
    ...ticketData,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
};

export const closeTicket = async (ticketId) => {
  if (!ticketId) throw new Error('Ticket ID is required');
  const ticketRef = doc(db, 'helpDeskTickets', ticketId);
  return await updateDoc(ticketRef, {
    status: 'resolved'
  });
};
