import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { BookOpen, Plus, Search, X } from 'lucide-react';
import { database, ref, set, onValue, off, remove } from './firebase';
import { query, orderByChild, startAt, endAt } from 'firebase/database';

// Componentes cargados bajo demanda con prefetching
const WordCard = lazy(() => import(/* webpackPrefetch: true */ './components/WordCard'));
const WordForm = lazy(() => import(/* webpackPrefetch: true */ './components/WordForm'));

// Error Boundary
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
              <X className="h-5 w-5 text-red-400" />
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

// Debounce hook
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

export default function DictionaryApp() {
  const [words, setWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');

  // Memoizar la lista filtrada para evitar recálculos innecesarios
  const filteredWords = useMemo(() => {
    if (!searchTerm) return words;
    const term = searchTerm.toLowerCase();
    return words.filter(item => 
      item.word.toLowerCase().includes(term) || 
      (item.meaning && item.meaning.toLowerCase().includes(term)) ||
      (item.example && item.example.toLowerCase().includes(term))
    );
  }, [words, searchTerm]);

  // Usar debounce para el término de búsqueda
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Cargar palabras desde Firebase con query optimizada
  useEffect(() => {
    const wordsRef = ref(database, 'words');
    let queryRef = wordsRef;
    
    // Si hay un término de búsqueda, optimizamos la consulta
    if (debouncedSearchTerm) {
      const searchTermLower = debouncedSearchTerm.toLowerCase();
      queryRef = query(
        wordsRef,
        orderByChild('wordLower'),
        startAt(searchTermLower),
        endAt(searchTermLower + '\uf8ff')
      );
    }
    
    const handleData = (snapshot) => {
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
    };

    // Usar once para la carga inicial y luego onValue para actualizaciones
    const initialLoad = onValue(queryRef, handleData, {
      onlyOnce: true
    });

    // Si no hay término de búsqueda, escuchar cambios
    if (!debouncedSearchTerm) {
      const updateListener = onValue(wordsRef, handleData);
      return () => {
        off(wordsRef, 'value', updateListener);
      };
    }

    return () => {
      off(queryRef, 'value', initialLoad);
    };
  }, [debouncedSearchTerm]);

  // Memoizar las funciones de manejo
  const handleAddWord = useCallback(async () => {
    if (newWord.trim() && newMeaning.trim()) {
      const wordData = {
        word: newWord.trim(),
        meaning: newMeaning.trim(),
        ...(newExample.trim() && { example: newExample.trim() })
      };

      if (editingId) {
        // Actualizar palabra existente
        const wordRef = ref(database, `words/${editingId}`);
        await set(wordRef, wordData);
        setEditingId(null);
      } else {
        // Crear nueva palabra
        const newWordRef = ref(database, `words/${Date.now()}`);
        await set(newWordRef, wordData);
      }
      
      // Limpiar el formulario
      setNewWord('');
      setNewMeaning('');
      setNewExample('');
      setIsModalOpen(false);
    }
  }, [newWord, newMeaning, newExample, editingId]);

  const handleEditWord = useCallback((word) => {
    setEditingId(word.id);
    setNewWord(word.word);
    setNewMeaning(word.meaning);
    setNewExample(word.example || '');
    setIsModalOpen(true);
  }, []);

  const handleDeleteWord = useCallback(async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta palabra?')) {
      const wordRef = ref(database, `words/${id}`);
      await remove(wordRef);
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
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault(); // Prevenir comportamiento por defecto
      handleAddWord();
    }
  }, [handleAddWord]);

  // Componente de carga para el Suspense
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
    </div>
  );

  // Memoizar componentes para evitar re-renders innecesarios
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
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-full transition-all transform hover:scale-[1.02] active:scale-95 shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base font-medium">Nueva Palabra</span>
          </button>
        </div>
      </div>
    </header>
  ), []);

  // Usar useRef para mantener una referencia estable a las funciones
  const memoizedHandlers = useRef({
    handleEditWord,
    handleDeleteWord
  });

  // Actualizar las referencias cuando las funciones cambien
  useEffect(() => {
    memoizedHandlers.current = {
      handleEditWord,
      handleDeleteWord
    };
  }, [handleEditWord, handleDeleteWord]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      {MemoizedHeader}

      {/* Search Bar */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {MemoizedSearchBar}
      </div>

      {/* Words Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
        <Suspense fallback={<LoadingSpinner />}>
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-blue-700"></div>
              <p className="mt-4 text-gray-600 text-lg">Cargando palabras...</p>
            </div>
          ) : words.length === 0 ? (
            <div className="text-center py-16 bg-white/50 rounded-2xl p-8 max-w-2xl mx-auto">
              <BookOpen className="w-14 h-14 mx-auto text-blue-200 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">El diccionario está vacío</h3>
              <p className="text-gray-600 max-w-md mx-auto">Aún no hay palabras en el diccionario. ¡Sé el primero en agregar una!</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-6 inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Agregar primera palabra
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredWords.map((item, index) => (
                <ErrorBoundary key={item.id}>
                  <WordCard 
                    item={item} 
                    onEdit={memoizedHandlers.current.handleEditWord} 
                    onDelete={memoizedHandlers.current.handleDeleteWord}
                    style={{ 
                      animation: `fadeInUp 0.5s ease-out ${Math.min(index * 0.05, 1)}s both`,
                      willChange: 'transform, opacity' // Mejora el rendimiento de las animaciones
                    }}
                  />
                </ErrorBoundary>
              ))}
            </div>
          )}

          {filteredWords.length === 0 && searchTerm && (
            <div className="text-center py-12">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto">
                <svg className="w-14 h-14 text-blue-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No se encontraron coincidencias</h3>
                <p className="text-gray-600 mb-6">No hay palabras que coincidan con "{searchTerm}"</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="inline-flex items-center px-5 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Limpiar búsqueda
                </button>
              </div>
            </div>
          )}
        </Suspense>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setIsModalOpen(false)}
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
                <X className="w-6 h-6" />
              </button>
            </div>

            <Suspense fallback={<div className="h-64 flex items-center justify-center"><LoadingSpinner /></div>}>
              <WordForm 
                editingId={editingId}
                newWord={newWord}
                newMeaning={newMeaning}
                newExample={newExample}
                setNewWord={setNewWord}
                setNewMeaning={setNewMeaning}
                setNewExample={setNewExample}
                handleAddWord={handleAddWord}
                handleKeyPress={handleKeyPress}
                resetForm={resetForm}
              />
            </Suspense>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}