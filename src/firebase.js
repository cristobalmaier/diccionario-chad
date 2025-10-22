import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  onValue, 
  off, 
  remove, 
  update, 
  query, 
  orderByChild, 
  startAt, 
  endAt, 
  push, 
  onChildAdded,
  get 
} from 'firebase/database';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDF6GH2VMYFE6vTu9GIMo3H1RnHsgXJrM4",
  authDomain: "diccionario-chad-f9504.firebaseapp.com",
  databaseURL: "https://diccionario-chad-f9504-default-rtdb.firebaseio.com",
  projectId: "diccionario-chad-f9504",
  storageBucket: "diccionario-chad-f9504.firebasestorage.app",
  messagingSenderId: "685680103467",
  appId: "1:685680103467:web:ebbcd67ab9c8efd08d1a6e"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { 
  database, 
  auth, 
  ref, 
  set, 
  onValue, 
  off, 
  remove, 
  update,
  get,
  query,
  orderByChild,
  startAt,
  endAt,
  push,
  onChildAdded,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};