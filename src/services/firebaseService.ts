import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  Timestamp,
  orderBy,
  limit,
  getDocFromServer
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { PatrolLog, Guard, Checkpoint, Incident, UploadedFile } from '../types';
import { geminiService } from './geminiService';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function base64ToBlob(base64: string): Blob {
  try {
    const arr = base64.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid base64 format');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
  } catch (error) {
    console.error('Error in base64ToBlob:', error);
    throw new Error('Failed to convert image data to blob');
  }
}

export const firebaseService = {
  // Test connection
  async testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration. ");
      }
    }
  },

  // Guards
  async getGuards(): Promise<Guard[]> {
    const path = 'guards';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guard));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Checkpoints
  async getCheckpoints(): Promise<Checkpoint[]> {
    const path = 'checkpoints';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checkpoint));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Patrol Logs
  async submitPatrolLog(log: Omit<PatrolLog, 'id'>): Promise<string> {
    const path = 'patrolLogs';
    console.log(`Submitting patrol log to ${path}...`, log);
    try {
      const docRef = await addDoc(collection(db, path), {
        ...log,
        timestamp: new Date().toISOString()
      });
      console.log(`Patrol log submitted successfully. ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error(`Error submitting patrol log to ${path}:`, error);
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async uploadImage(
    base64Data: string, 
    guardId: string, 
    onProgress?: (progress: number) => void,
    retryCount = 0
  ): Promise<string> {
    console.log(`[Upload] Starting upload for guard ${guardId} (Attempt ${retryCount + 1})...`);
    try {
      if (!base64Data || !base64Data.startsWith('data:image')) {
        console.error('[Upload] Invalid image data format:', base64Data?.substring(0, 50));
        throw new Error('Invalid image data format');
      }

      // Convert base64 to blob
      const blob = base64ToBlob(base64Data);
      
      if (blob.size === 0) {
        throw new Error('Generated blob is empty (size 0)');
      }

      const timestamp = new Date().getTime();
      const fileName = `checkpoints/${guardId}/${timestamp}.jpg`;
      const storageRef = ref(storage, fileName);
      
      return new Promise((resolve, reject) => {
        // Add a 300-second timeout to the upload
        const timeout = setTimeout(() => {
          console.error('[Upload] Upload timed out after 300 seconds');
          uploadTask.cancel();
          reject(new Error('Upload timed out. Please check your internet connection.'));
        }, 300000);

        const uploadTask = uploadBytesResumable(storageRef, blob, {
          contentType: 'image/jpeg'
        });

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(progress);
          }, 
          async (error) => {
            clearTimeout(timeout);
            if (error.code === 'storage/canceled') {
              console.warn('[Upload] Upload was canceled (likely due to timeout)');
              if (retryCount < 2) {
                console.log(`[Upload] Retrying upload... (${retryCount + 1}/2)`);
                try {
                  const result = await this.uploadImage(base64Data, guardId, onProgress, retryCount + 1);
                  resolve(result);
                } catch (retryErr) {
                  reject(retryErr);
                }
              } else {
                reject(new Error('Upload timed out after multiple attempts. Please check your internet connection.'));
              }
            } else {
              console.error('[Upload] Task error:', error);
              reject(error);
            }
          }, 
          async () => {
            clearTimeout(timeout);
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (err) {
              reject(err);
            }
          }
        );
      });
    } catch (error) {
      console.error('[Upload] Error in uploadImage:', error);
      throw error;
    }
  },

  async uploadUserFile(file: File, notes: string): Promise<string> {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    const uid = auth.currentUser.uid;
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}_${file.name}`;
    const storagePath = `user_uploads/${uid}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    try {
      // 1. Upload to Storage
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // 2. Get Gemini Summary (if it's an image)
      let summary = "No summary available for this file type.";
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const base64Data = await base64Promise;
        summary = await geminiService.summarizeImage(base64Data, file.type);
      }

      // 3. Create Firestore Document
      const path = `users/${uid}/files`;
      const docRef = await addDoc(collection(db, path), {
        fileName: file.name,
        fileSize: file.size,
        storagePath: storagePath,
        notes: notes,
        uploadDate: new Date().toISOString(),
        summary: summary,
        downloadUrl: downloadUrl
      });

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${uid}/files`);
      return '';
    }
  },

  subscribeToPatrolLogs(callback: (logs: PatrolLog[]) => void) {
    const path = 'patrolLogs';
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PatrolLog));
      callback(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Incidents
  async submitIncident(incident: Omit<Incident, 'id'>): Promise<string> {
    const path = 'incidents';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...incident,
        timestamp: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  // Seed data if empty
  async seedInitialData(guards: Guard[], checkpoints: Checkpoint[]) {
    try {
      const guardsSnapshot = await getDocs(collection(db, 'guards'));
      if (guardsSnapshot.empty) {
        for (const guard of guards) {
          await setDoc(doc(db, 'guards', guard.id), guard);
        }
      }

      const checkpointsSnapshot = await getDocs(collection(db, 'checkpoints'));
      if (checkpointsSnapshot.empty) {
        for (const cp of checkpoints) {
          await setDoc(doc(db, 'checkpoints', cp.id), cp);
        }
      }
    } catch (error) {
      console.error('Error seeding data:', error);
    }
  }
};
