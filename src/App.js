import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  lazy, 
  Suspense, 
  useRef,
  useDeferredValue,
  startTransition
} from 'react';
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Navigate, 
  Link, 
  useNavigate 
} from 'react-router-dom'; 
import { 
  BookOpen, 
  Plus, 
  LogOut, 
  XCircle, 
  Shield, 
  Search,
  AlertTriangle,
  Star,
  MessageCircle 
} from 'lucide-react';
import { toast, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Firebase imports with tree-shaking
import { auth, database } from './firebase';
import { 
  ref, 
  query, 
  orderByChild, 
  limitToLast,
  onValue, 
  off, 
  set, 
  remove, 
  update, 
  push, 
  onChildAdded,
  get
} from 'firebase/database';
import { 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';

// Lazy load components with prefetching
const SearchInput = React.memo(lazy(() => 
  import(/* webpackPrefetch: true */ './components/SearchInput')
));
const DeleteConfirmationModal = React.memo(lazy(() => 
  import(/* webpackPrefetch: true */ './components/DeleteConfirmationModal')
));
const Auth = lazy(() => import(/* webpackPrefetch: true */ './components/auth/Auth'));
const WordCard = lazy(() => import(/* webpackPrefetch: true */ './components/WordCard'));
const WordForm = lazy(() => import(/* webpackPrefetch: true */ './components/WordForm'));
const AdminDashboard = lazy(() => import(/* webpackPrefetch: true */ './components/admin/AdminDashboard'));
const WaitingVerification = lazy(() => import(/* webpackPrefetch: true */ './components/auth/WaitingVerification'));
const FeedbackButton = lazy(() => import('./components/FeedbackButton'));

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
// Memoized components to prevent unnecessary re-renders
const MemoizedSearchInput = React.memo(SearchInput);
const MemoizedDeleteModal = React.memo(DeleteConfirmationModal);

function DictionaryLogic() {
  // State with initial values to prevent undefined
  const [words, setWords] = useState(() => []);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    wordId: null,
    wordText: ''
  });
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
        // Usar el displayName del perfil de autenticación o 'Usuario' como valor por defecto
        let displayName = user.displayName || 'Usuario';
        const IS_ADMIN_EMAIL = 'admin@gmail.com';
        const isUserAdmin = user.email === IS_ADMIN_EMAIL;
        
        try {
          const userRef = ref(database, `users/${user.uid}`);
          const userSnapshot = await get(userRef);
          let userData = {};
          
          if (userSnapshot.exists()) {
            userData = userSnapshot.val();
            // Si hay un displayName en la base de datos, usarlo y actualizar el perfil de autenticación si es necesario
            if (userData.displayName && userData.displayName !== displayName) {
              displayName = userData.displayName;
              await updateProfile(user, { displayName });
            }
            
            // Actualizar última conexión
            await update(userRef, {
              lastLogin: Date.now(),
              email: user.email
              // No sobrescribir el displayName existente
            });
          } else {
            // Si no existe en la base de datos, crear el registro con el displayName del perfil
            const newUserData = {
              uid: user.uid,
              displayName: displayName,
              email: user.email,
              isVerified: false,
              isAdmin: isUserAdmin,
              createdAt: Date.now(),
              lastLogin: Date.now()
            };
            await set(userRef, newUserData);
            userData = newUserData;
          }
          
          // Actualizar el estado del usuario
          setUser({
            ...user,
            displayName: displayName,
            isAdmin: isUserAdmin,
            isVerified: userData.isVerified || false
          });
          
          // Actualizar el estado de verificación
          setIsAdmin(isUserAdmin);
          
          // Verificar si el usuario está verificado (excepto admin)
          if (!isUserAdmin && user.emailVerified === false) {
            console.log('Usuario no verificado, mostrando vista de espera');
            setIsUserVerified(false);
          } else {
            setIsUserVerified(true);
          }
        } catch (error) {
          console.error('Error en la autenticación:', error);
          setUser(null);
          setIsAdmin(false);
          setIsUserVerified(false);
          return; // Salir si hay un error
        }
        
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
      
      // Asegurarse de que el displayName se guarde en el perfil de autenticación
      await updateProfile(userCredential.user, { 
        displayName: displayName.trim() 
      });
      
      // Actualizar el perfil en la base de datos en tiempo real
      const userRef = ref(database, `users/${userCredential.user.uid}`);
      const userData = {
        uid: userCredential.user.uid,
        displayName: displayName.trim(),
        email: email,
        isVerified: false,
        createdAt: Date.now(),
        lastLogin: Date.now()
      };
      
      await set(userRef, userData);
      
      // Actualizar el estado local
      setUser({
        ...userCredential.user,
        displayName: displayName.trim()
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
    // Add limit and order for better performance
    // Sort words alphabetically by the 'word' field
    const wordsQuery = query(
      wordsRef,
      orderByChild('wordLower') // Ensure we sort by lowercase for case-insensitive sorting
    );
    
    const listener = onValue(wordsQuery, (snapshot) => {
      // Use startTransition for non-urgent state updates
      startTransition(() => {
        const data = snapshot.val();
        if (data) {
          const wordsArray = Object.entries(data)
            .map(([id, wordData]) => ({
              id,
              isFavorite: wordData.isFavorite || false,
              ...wordData
            }))
            .sort((a, b) => {
              // Sort favorites first, then alphabetically
              if (a.isFavorite && !b.isFavorite) return -1;
              if (!a.isFavorite && b.isFavorite) return 1;
              
              // If both are favorites or both are not, sort alphabetically
              const wordA = (a.wordLower || a.word || '').toLowerCase();
              const wordB = (b.wordLower || b.word || '').toLowerCase();
              return wordA.localeCompare(wordB);
            });
          setWords(wordsArray); 
        } else {
          setWords([]);
        }
        setIsLoading(false);
      });
    }, {
      // Only fetch the data once to reduce bandwidth
      onlyOnce: false,
      // Add error handler
      onError: (error) => {
        console.error('Error fetching words:', error);
        setIsLoading(false);
      }
    });

    // Cleanup function
    return () => {
      off(wordsQuery, 'value', listener);
    };
  }, [authChecked]); 

  // Toggle favorite status
  const toggleFavorite = useCallback(async (wordId, currentStatus) => {
    try {
      const wordRef = ref(database, `words/${wordId}`);
      await update(wordRef, { 
        isFavorite: !currentStatus,
        updatedAt: Date.now()
      });
      toast.success(`Palabra ${!currentStatus ? 'agregada a' : 'quitada de'} favoritos`, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error updating favorite status:', error);
      toast.error('Error al actualizar favoritos');
    }
  }, []);

  const handleAddWord = useCallback(async () => {
    if (newWord.trim() && newMeaning.trim() && user) { 
      const wordToSave = newWord.trim();
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('No hay usuario autenticado');
        }
        
        // Obtener el displayName del usuario autenticado
        // Primero intentamos obtenerlo del perfil de autenticación
        let displayName = currentUser.displayName || '';
        
        // Si no hay displayName, intentamos obtenerlo de la base de datos
        if (!displayName) {
          const userRef = ref(database, `users/${currentUser.uid}`);
          const userSnapshot = await get(userRef);
          
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            displayName = userData.displayName || '';
          }
        }
        
        // Asegurarse de que el displayName no sea un correo electrónico
        if (displayName.includes('@')) {
          displayName = displayName.split('@')[0];
        }
        
        // Si aún no hay displayName, usamos 'Usuario' como valor por defecto
        displayName = displayName.trim() || 'Usuario';
        
        // Si estamos editando, mantener los datos originales de quién lo creó
        const isEditing = !!editingId;
        const originalWord = isEditing ? words.find(w => w.id === editingId) : null;
        
        const wordData = {
          word: wordToSave,
          meaning: newMeaning.trim(),
          example: newExample.trim() || null, 
          timestamp: isEditing ? (originalWord?.timestamp || Date.now()) : Date.now(),
          updatedAt: Date.now(),
          addedBy: isEditing ? (originalWord?.addedBy || currentUser.uid) : currentUser.uid,
          addedByName: isEditing ? (originalWord?.addedByName || displayName) : displayName,
          modifiedBy: currentUser.uid,
          modifiedByName: displayName,
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

  // Manejar solicitud de eliminación
  const handleDeleteClick = useCallback((id, word) => {
    setDeleteModal({
      isOpen: true,
      wordId: id,
      wordText: word
    });
  }, []);

  // Confirmar eliminación de palabra
  const confirmDelete = useCallback(async () => {
    if (!user || !deleteModal.wordId) return;
    
    try {
      const wordRef = ref(database, `words/${deleteModal.wordId}`);
      await remove(wordRef);
      toast.success('Palabra eliminada con éxito.', { transition: Bounce });
    } catch (error) {
      console.error('Error al eliminar la palabra:', error);
      toast.error('Error al eliminar la palabra. Intenta de nuevo.');
    } finally {
      setDeleteModal({ isOpen: false, wordId: null, wordText: '' });
    }
  }, [user, deleteModal.wordId]);

  // Cancelar eliminación
  const cancelDelete = useCallback(() => {
    setDeleteModal({ isOpen: false, wordId: null, wordText: '' });
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

  // Manejador de búsqueda
  const handleSearch = (value) => {
    setSearchTerm(value);
  };

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
  const memoizedHandlers = useRef({ handleEditWord, handleDeleteClick });
  useEffect(() => {
    memoizedHandlers.current = { handleEditWord, handleDeleteClick };
  }, [handleEditWord, handleDeleteClick]);
  
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
        <div className="w-full max-w-2xl mx-auto">
          <SearchInput 
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Buscar palabras o significados..."
            autoFocus={!isModalOpen}
          />
        </div>
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
                  <div className="relative group">
                    <WordCard 
                      item={item} 
                      onEdit={memoizedHandlers.current.handleEditWord} 
                      onDelete={memoizedHandlers.current.handleDeleteClick}
                      userIsAdmin={isAdmin} 
                      currentUserId={user?.uid} 
                      style={{ 
                        animation: `fadeInUp 0.5s ease-out ${Math.min(index * 0.05, 0.5)}s both`,
                        willChange: 'transform, opacity'
                      }}
                    />
                    <button
                      onClick={() => toggleFavorite(item.id, item.isFavorite)}
                      className={`absolute top-2 right-2 p-1.5 rounded-full ${item.isFavorite ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'} bg-white/80 backdrop-blur-sm transition-colors`}
                      aria-label={item.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                    >
                      <Star className="w-5 h-5" fill={item.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </ErrorBoundary>
              ))}
            </div>
          )}
        </Suspense>
      </div>

      {/* Modal de confirmación de eliminación */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="¿Eliminar palabra?"
        message={`¿Estás seguro de que quieres eliminar la palabra "${deleteModal.wordText}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
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
        {user && (
          <Suspense fallback={null}>
            <FeedbackButton />
          </Suspense>
        )}
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