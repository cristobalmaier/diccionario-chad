import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
// Importamos BrowserRouter para usarlo como componente principal
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'; 
import { AlertTriangle, BookOpen, Plus, Search, LogOut, XCircle, Shield } from 'lucide-react';
import { 
  auth, 
  database, 
  ref, 
  onValue, 
  off, 
  set, 
  remove, 
  query, 
  orderByChild, 
  startAt, 
  endAt, 
  update, 
  push, 
  onChildAdded,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  get
} from './firebase';
import { updateProfile } from 'firebase/auth';
import { toast, Bounce } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css';

// Componentes cargados bajo demanda con prefetching
const Auth = lazy(() => import('./components/auth/Auth'));
const WordCard = lazy(() => import(/* webpackPrefetch: true */ './components/WordCard'));
const WordForm = lazy(() => import(/* webpackPrefetch: true */ './components/WordForm'));
const AdminDashboard = lazy(() => import(/* webpackPrefetch: true */ './components/admin/AdminDashboard'));
const WaitingVerification = lazy(() => import(/* webpackPrefetch: true */ './components/auth/WaitingVerification'));

// Error Boundary (Componente de clase)
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Algo salió mal. Por favor, recarga la página.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Hook de Debounce
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// Componente principal de la aplicación (Contiene toda la lógica y las rutas)
function DictionaryLogic() {
  const [words, setWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUserVerified, setIsUserVerified] = useState(true); // true por defecto para evitar parpadeos
  
  // SOLUCIÓN: useNavigate se llama dentro de la lógica del componente
  // que ahora está envuelto por <BrowserRouter> en el export final.
  const navigate = useNavigate();

  // Memoizar la lista filtrada 
  const filteredWords = useMemo(() => {
    if (!searchTerm) return words;
    const term = searchTerm.toLowerCase();
    return words.filter(item => 
      item.word.toLowerCase().includes(term) || 
      (item.meaning && item.meaning.toLowerCase().includes(term)) ||
      (item.example && item.example.toLowerCase().includes(term))
    );
  }, [words, searchTerm]);

  // Manejar el estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let displayName = user.displayName;
        if (!user.displayName && user.email) {
          displayName = user.email.split('@')[0];
          try {
            await updateProfile(user, { displayName });
          } catch (error) {
            console.error('Error al actualizar displayName:', error);
          }
        } else if (!user.displayName && !user.email) {
          displayName = 'Anónimo';
        }
        
        const IS_ADMIN_EMAIL = 'admin@gmail.com';
        const isUserAdmin = user.email === IS_ADMIN_EMAIL;
        setIsAdmin(isUserAdmin);
        
        // Guardar/actualizar datos del usuario en la base de datos en tiempo real
        try {
          const userRef = ref(database, `users/${user.uid}`);
          const userSnapshot = await get(userRef);
          
          let userData;
          if (userSnapshot.exists()) {
            // Usuario existe, actualizar última conexión
            console.log('Actualizando usuario existente:', user.uid);
            userData = userSnapshot.val();
            await update(userRef, {
              lastLogin: Date.now(),
              displayName: displayName,
              email: user.email
            });
            console.log('Usuario actualizado correctamente');
          } else {
            // Usuario nuevo, crear registro completo
            console.log('Creando nuevo usuario:', user.uid);
            userData = {
              uid: user.uid,
              displayName: displayName,
              email: user.email,
              isVerified: false,
              createdAt: Date.now(),
              lastLogin: Date.now()
            };
            await set(userRef, userData);
            console.log('Usuario creado correctamente');
          }
          
          // Verificar si el usuario está verificado (excepto admin)
          if (!isUserAdmin && userData.isVerified === false) {
            console.log('Usuario no verificado, mostrando vista de espera');
            setIsUserVerified(false);
          } else {
            setIsUserVerified(true);
          }
        } catch (error) {
          console.error('Error al guardar datos del usuario:', error);
        }
        
        setUser({
          ...user,
          displayName: displayName,
          isAdmin: isUserAdmin
        });
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  // ... (El resto de los hooks: sessionId, useEffects de listeners, useDebounce, etc., son iguales)
  const sessionId = useMemo(() => {
    if (user) return user.uid;
    
    if (typeof window !== 'undefined') {
      let storedId = sessionStorage.getItem('dictionarySessionId');
      if (!storedId) {
        storedId = 'temp-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('dictionarySessionId', storedId);
      }
      return storedId;
    }
    return 'unknown-session';
  }, [user]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
      toast.success('Sesión cerrada correctamente.', { transition: Bounce });
      navigate('/auth'); 
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión.', { transition: Bounce });
    }
  }, [navigate]);

  const handleSignUp = useCallback(async (email, password, displayName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, { displayName });
      
      const userRef = ref(database, `users/${userCredential.user.uid}`);
      await set(userRef, {
        uid: userCredential.user.uid,
        displayName: displayName,
        email: email,
        isVerified: false,
        createdAt: Date.now(),
        lastLogin: Date.now()
      });
      
      setUser({
        ...userCredential.user,
        displayName: displayName
      });

      toast.success('Registro exitoso. ¡Bienvenido!', { transition: Bounce });
      return userCredential.user;
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      toast.error(`Error al registrar: ${error.message}`, { transition: Bounce });
      throw error;
    }
  }, []);

  const initialLoad = useRef(true);

  useEffect(() => {
    const wordsRef = ref(database, 'words');
    const wordsQuery = query(wordsRef, orderByChild('timestamp'));
    
    const listener = onChildAdded(wordsQuery, (snapshot) => {
      const newWord = { id: snapshot.key, ...snapshot.val() };
      
      const adderId = newWord.addedBy || 'unknown-session';
      const currentId = user ? user.uid : sessionId;
      
      if (!initialLoad.current && adderId !== currentId) {
        toast.info(`Nueva palabra agregada: ${newWord.word}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          transition: Bounce,
          icon: '📝',
          className: 'animate-bounce-once'
        });
      }
    });

    const timer = setTimeout(() => {
      initialLoad.current = false;
    }, 1000); 

    return () => {
      clearTimeout(timer);
      off(wordsQuery, 'child_added', listener);
    };
  }, [sessionId, user]); 

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  useEffect(() => {
    if (!authChecked) return;

    const wordsRef = ref(database, 'words');
    let queryRef = wordsRef;
    
    const updateListener = onValue(queryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const wordsArray = Object.entries(data).map(([id, wordData]) => ({
          id,
          ...wordData
        }));
        setWords(wordsArray); 
      } else {
        setWords([]);
      }
      setIsLoading(false);
    });

    return () => {
      off(queryRef, 'value', updateListener);
    };
  }, [authChecked]); 

  const handleAddWord = useCallback(async () => {
    if (newWord.trim() && newMeaning.trim() && user) { 
      const wordToSave = newWord.trim();
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('No hay usuario autenticado');
        }
        
        const wordData = {
          word: wordToSave,
          meaning: newMeaning.trim(),
          example: newExample.trim() || null, 
          timestamp: Date.now(),
          updatedAt: Date.now(),
          addedBy: currentUser.uid, 
          addedByName: currentUser.displayName || currentUser.email.split('@')[0],
          wordLower: wordToSave.toLowerCase() 
        };

        if (editingId) {
          const wordRef = ref(database, `words/${editingId}`);
          await update(wordRef, wordData);
          toast.success('Palabra actualizada con éxito.', { transition: Bounce });
          setEditingId(null);
        } else {
          const newWordRef = push(ref(database, 'words'));
          await set(newWordRef, wordData);
          toast.success('Palabra agregada con éxito.', { transition: Bounce });
        }
        
        setNewWord('');
        setNewMeaning('');
        setNewExample('');
        setIsModalOpen(false);
      } catch (error) {
        console.error('Error al agregar/actualizar palabra:', error);
        toast.error(`Error: ${error.message || 'No se pudo guardar la palabra.'}`, { transition: Bounce });
      }
    } else if (!user) {
      toast.error('Debes iniciar sesión para agregar palabras.', { transition: Bounce });
    }
  }, [newWord, newMeaning, newExample, editingId, user]);

  const handleEditWord = useCallback((word) => {
    setEditingId(word.id);
    setNewWord(word.word);
    setNewMeaning(word.meaning);
    setNewExample(word.example || '');
    setIsModalOpen(true);
  }, []);

  const handleDeleteWord = useCallback(async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta palabra? Esta acción es permanente.')) {
      try {
        const wordRef = ref(database, `words/${id}`);
        await remove(wordRef);
        toast.success('Palabra eliminada con éxito.', { transition: Bounce });
      } catch (error) {
        console.error('Error al eliminar palabra:', error);
        toast.error('Error al eliminar palabra.', { transition: Bounce });
      }
    }
  }, []);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setNewWord('');
    setNewMeaning('');
    setNewExample('');
    setIsModalOpen(false);
  }, []);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && e.ctrlKey && isModalOpen) { 
      e.preventDefault(); 
      handleAddWord();
    }
  }, [handleAddWord, isModalOpen]);

  // Componente de carga para el Suspense
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
    </div>
  );

  // Memoizar componentes del Header y Searchbar
  const MemoizedSearchBar = useMemo(() => (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      <input
        type="text"
        placeholder="Buscar palabra..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-12 pr-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-sm hover:shadow-md text-base sm:text-lg"
      />
    </div>
  ), [searchTerm]);

  const MemoizedHeader = useMemo(() => (
    <header className="bg-white/80 shadow-sm sticky top-0 z-10 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-blue-800" />
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent">
              Diccionario Chad
            </h1>
            
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none">
              <button
                onClick={() => { setIsModalOpen(true); setEditingId(null); }} 
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-full transition-all transform hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base font-medium">Nueva Palabra</span>
              </button>
            </div>
            
            <div className="flex items-center gap-3">
            {isAdmin && (
              <Link 
                to="/admin" 
                className="flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-full transition-all transform hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-lg text-sm sm:text-base font-medium"
              >
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Panel Admin</span>
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-full transition-all transform hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-lg"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base font-medium">Cerrar Sesión</span>
            </button>
            </div>
          </div>
          
        </div>
      </div>
    </header>
  ), [handleSignOut, isAdmin, user]); 

  // Usar useRef para mantener una referencia estable a las funciones
  const memoizedHandlers = useRef({ handleEditWord, handleDeleteWord });
  useEffect(() => {
    memoizedHandlers.current = { handleEditWord, handleDeleteWord };
  }, [handleEditWord, handleDeleteWord]);
  
  // Agregar event listener para Ctrl+Enter
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Mostrar pantalla de carga mientras se verifica la autenticación
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  // Componente para el contenido principal del diccionario (Dashboard)
  const DictionaryDashboard = () => (
    <>
      {MemoizedHeader}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {MemoizedSearchBar}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
        <Suspense fallback={<LoadingSpinner />}>
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-blue-700"></div>
              <p className="mt-4 text-gray-600 text-lg">Cargando palabras...</p>
            </div>
          ) : words.length === 0 && !searchTerm ? ( 
            <div className="text-center py-16 bg-white/50 rounded-2xl p-8 max-w-2xl mx-auto">
              <BookOpen className="w-14 h-14 mx-auto text-blue-200 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">El diccionario está vacío</h3>
              <p className="text-gray-600 max-w-md mx-auto">Aún no hay palabras. ¡Sé el primero en agregar una!</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-6 inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Agregar primera palabra
              </button>
            </div>
          ) : filteredWords.length === 0 ? ( 
            <div className="text-center py-16 bg-white/50 rounded-2xl p-8 max-w-2xl mx-auto">
              <Search className="w-14 h-14 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No se encontraron resultados</h3>
              <p className="text-gray-600 max-w-md mx-auto">Intenta una palabra clave diferente o ajusta tu búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full">
              {filteredWords.map((item, index) => (
                <ErrorBoundary key={item.id}>
                  <WordCard 
                    item={item} 
                    onEdit={memoizedHandlers.current.handleEditWord} 
                    onDelete={memoizedHandlers.current.handleDeleteWord}
                    userIsAdmin={isAdmin} 
                    currentUserId={user?.uid} 
                    style={{ 
                      animation: `fadeInUp 0.5s ease-out ${Math.min(index * 0.05, 0.5)}s both`,
                      willChange: 'transform, opacity'
                    }}
                  />
                </ErrorBoundary>
              ))}
            </div>
          )}
        </Suspense>
      </div>
    </>
  );

  // Contenedor principal de rutas
  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorBoundary>
        
        {/* Aquí definimos las rutas, y como useNavigate está en DictionaryLogic, ¡funciona! */}
        <Routes>
          <Route path="/" element={
            user ? (
              !isUserVerified ? (
                <Navigate to="/waiting" replace />
              ) : isAdmin ? (
                <Navigate to="/admin" replace />
              ) : (
                <DictionaryDashboard />
              )
            ) : (
              <Navigate to="/auth" />
            )
          } />
          <Route path="/auth" element={
            user ? (
              isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />
            ) : (
              <Suspense fallback={<LoadingSpinner />}>
                <Auth 
                    onAuthSuccess={() => navigate(isAdmin ? '/admin' : '/')} 
                    handleSignUp={handleSignUp}
                    handleSignIn={signInWithEmailAndPassword}
                />
              </Suspense>
            )
          } />
          <Route path="/waiting" element={
            user && !isUserVerified ? (
              <Suspense fallback={<LoadingSpinner />}>
                <WaitingVerification user={user} />
              </Suspense>
            ) : user ? (
              <Navigate to="/" replace />
            ) : (
              <Navigate to="/auth" replace />
            )
          } />
          <Route path="/admin" element={
            user && isAdmin ? (
              <Suspense fallback={<LoadingSpinner />}>
                <AdminDashboard user={user} />
              </Suspense>
            ) : user ? (
              <Navigate to="/" replace />
            ) : (
              <Navigate to="/auth" replace />
            )
          } />
          <Route path="*" element={
            user ? (
              isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />
            ) : (
              <Navigate to="/auth" replace />
            )
          } />
        </Routes>

        {/* Modal */}
        {isModalOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
            onClick={resetForm}
          >
            <div
              className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md mx-auto my-8 shadow-xl"
              style={{ animation: 'scaleIn 0.2s ease-out' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {editingId ? 'Editar palabra' : 'Agregar palabra / frase'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-2"
                  aria-label="Cerrar"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <Suspense fallback={<LoadingSpinner />}>
                <WordForm
                  newWord={newWord}
                  setNewWord={setNewWord}
                  newMeaning={newMeaning}
                  setNewMeaning={setNewMeaning}
                  newExample={newExample}
                  setNewExample={setNewExample}
                  handleAddWord={handleAddWord}
                  isEditing={!!editingId}
                />
              </Suspense>
            </div>
          </div>
        )}
        
        {/* Estilos CSS */}
        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </ErrorBoundary>
    </div>
  );
}

// Este es el componente que tu index.js llama: <App />
// Lo envolvemos en BrowserRouter AHORA para que DictionaryLogic (donde está useNavigate) funcione.
function DictionaryApp() {
    return (
        <BrowserRouter>
            <DictionaryLogic />
        </BrowserRouter>
    );
}

export default DictionaryApp;