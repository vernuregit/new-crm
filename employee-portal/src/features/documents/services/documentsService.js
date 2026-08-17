import { db, storage } from '../../../shared/services/firebaseService';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

export const subscribeMyDocuments = (uid, callback) => {
  const q = query(
    collection(db, `documents/${uid}/files`),
    orderBy('uploadedAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(docs);
  });
};

export const uploadDocument = async (uid, file, metadata, onProgress) => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const storagePath = `employees/${uid}/documents/${file.name}_${timestamp}`;
    const storageRef = ref(storage, storagePath);
    
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      }, 
      (error) => reject(error), 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const docRef = await addDoc(collection(db, `documents/${uid}/files`), {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          storagePath: storagePath,
          downloadURL,
          uploadedAt: serverTimestamp(),
          description: metadata.description || '',
          category: metadata.category || 'other'
        });
        resolve({ id: docRef.id, downloadURL });
      }
    );
  });
};

export const deleteDocument = async (uid, docId, storagePath) => {
  const docRef = doc(db, `documents/${uid}/files`, docId);
  await deleteDoc(docRef);
  if (storagePath) {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  }
};
