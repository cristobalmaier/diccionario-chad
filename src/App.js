import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, X } from 'lucide-react';
import { database, ref, set, onValue, off, remove } from './firebase';

export default function DictionaryApp() {
  const [words, setWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');

  const filteredWords = words.filter(item =>
    item.word.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cargar palabras desde Firebase al iniciar
  useEffect(() => {
    const wordsRef = ref(database, 'words');
    
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

    // Escuchar cambios en la base de datos
    onValue(wordsRef, handleData);

    // Limpiar la suscripción al desmontar el componente
    return () => {
      off(wordsRef, 'value', handleData);
    };
  }, []);

  const handleAddWord = async () => {
    if (newWord.trim() && newMeaning.trim()) {
      const newWordRef = ref(database, `words/${Date.now()}`);
      const wordData = {
        word: newWord.trim(),
        meaning: newMeaning.trim(),
        ...(newExample.trim() && { example: newExample.trim() }) // Solo agrega el ejemplo si existe
      };
      
      await set(newWordRef, wordData);
      
      setNewWord('');
      setNewMeaning('');
      setNewExample('');
      setIsModalOpen(false);
    }
  };

  const handleDeleteWord = async (id) => {
    const wordRef = ref(database, `words/${id}`);
    await remove(wordRef);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault(); // Prevenir comportamiento por defecto
      handleAddWord();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 backdrop-blur-lg bg-opacity-90">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Diccionario Chad
              </h1>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-full hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">Nueva Palabra</span>
            </button>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar palabra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-all shadow-sm hover:shadow-md"
          />
        </div>
      </div>

      {/* Words Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Cargando palabras...</p>
          </div>
        ) : words.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No hay palabras en el diccionario. ¡Sé el primero en agregar una!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWords.map((item, index) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100"
                style={{
                  animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-indigo-600">
                    {item.word}
                  </h3>
                  <button
                    onClick={() => handleDeleteWord(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-700 leading-relaxed mb-3">
                  {item.meaning}
                </p>
                {item.example && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-indigo-600 font-medium mb-1">Ejemplo:</p>
                    <p className="text-gray-600 italic text-sm">"{item.example}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {filteredWords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No se encontraron palabras</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          style={{ animation: 'fadeIn 0.3s ease-out' }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            style={{ animation: 'scaleIn 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Agregar Palabra</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Palabra
                </label>
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-all"
                  placeholder="Ej: Sublime"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Significado *
                </label>
                <textarea
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-all resize-none"
                  placeholder="Describe el significado..."
                  rows="3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ejemplo (opcional)
                </label>
                <textarea
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-all resize-none"
                  placeholder="Agrega un ejemplo de uso..."
                  rows="2"
                />
              </div>

              <button
                onClick={handleAddWord}
                disabled={!newWord.trim() || !newMeaning.trim()}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Agregar
              </button>
              <p className="text-xs text-gray-500 text-center">* Campos obligatorios | Presiona Ctrl + Enter para agregar</p>
            </div>
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