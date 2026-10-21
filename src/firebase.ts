import { initializeApp } from '@firebase/app';
import { getAuth } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);
