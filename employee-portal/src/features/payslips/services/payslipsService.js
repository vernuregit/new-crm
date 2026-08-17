import { db } from '../../../shared/services/firebaseService';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export const subscribeMyPayslips = (uid, callback) => {
  const q = query(
    collection(db, `payslips/${uid}/records`),
    orderBy('year', 'desc'),
    orderBy('month', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(docs);
  });
};
