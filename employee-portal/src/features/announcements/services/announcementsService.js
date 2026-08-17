import { collection, onSnapshot, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../shared/services/firebaseService';

export const subscribeAnnouncements = (callback) => {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(announcements);
  });
};

export const getAnnouncements = async () => {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
