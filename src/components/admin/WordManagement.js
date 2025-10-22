import React, { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database } from '../../firebase';
import { toast } from 'react-toastify';
import { 
  BookOpen, 
  Search, 
  Edit2, 
  Trash2,
  User,
  Calendar,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react';

export default function WordManagement() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // desc = más reciente primero
  const [editingWord, setEditingWord] = useState(null);

  // Cargar todas las palabras
  useEffect(() => {
    const wordsRef = ref(database, 'words');
    
    const unsubscribe = onValue(wordsRef, (snapshot) => {
      const wordsData = snapshot.val() || {};
      const wordsList = Object.entries(wordsData).map(([id, wordData]) => ({
        id,
        ...wordData
      }));
      
      setWords(wordsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const deleteWord = async (wordId, wordText) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la palabra "${wordText}"? Esta acción no se puede deshacer.`)) {
      try {
        const wordRef = ref(database, `words/${wordId}`);
        await remove(wordRef);
        toast.success('Palabra eliminada correctamente');
      } catch (error) {
        console.error('Error al eliminar palabra:', error);
        toast.error('Error al eliminar palabra');
      }
    }
  };

  const updateWord = async (wordId, updatedData) => {
    try {
      const wordRef = ref(database, `words/${wordId}`);
      await update(wordRef, {
        ...updatedData,
        updatedAt: Date.now()
      });
      toast.success('Palabra actualizada correctamente');
      setEditingWord(null);
    } catch (error) {
      console.error('Error al actualizar palabra:', error);
      toast.error('Error al actualizar palabra');
    }
  };

  // Filtrar y ordenar palabras
  const filteredAndSortedWords = words
    .filter(word => {
      const searchLower = searchTerm.toLowerCase();
      return (
        word.word?.toLowerCase().includes(searchLower) ||
        word.meaning?.toLowerCase().includes(searchLower) ||
        word.example?.toLowerCase().includes(searchLower) ||
        word.addedByName?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const timestampA = a.timestamp || 0;
      const timestampB = b.timestamp || 0;
      return sortOrder === 'desc' ? timestampB - timestampA : timestampA - timestampB;
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra de búsqueda y controles */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar palabra, significado o autor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          {/* Ordenar */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {sortOrder === 'desc' ? (
              <>
                <SortDesc className="w-5 h-5" />
                <span className="hidden sm:inline">Más recientes</span>
              </>
            ) : (
              <>
                <SortAsc className="w-5 h-5" />
                <span className="hidden sm:inline">Más antiguas</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lista de palabras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAndSortedWords.length > 0 ? (
          filteredAndSortedWords.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              onDelete={deleteWord}
              onEdit={setEditingWord}
              isEditing={editingWord?.id === word.id}
              onUpdate={updateWord}
              onCancelEdit={() => setEditingWord(null)}
            />
          ))
        ) : (
          <div className="col-span-2 bg-white rounded-lg shadow-md p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron palabras</p>
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Total de palabras: <strong>{filteredAndSortedWords.length}</strong></span>
          <span>Mostrando: <strong>{filteredAndSortedWords.length}</strong> de <strong>{words.length}</strong></span>
        </div>
      </div>
    </div>
  );
}

// Componente de tarjeta de palabra
function WordCard({ word, onDelete, onEdit, isEditing, onUpdate, onCancelEdit }) {
  const [editedWord, setEditedWord] = useState({
    word: word.word,
    meaning: word.meaning,
    example: word.example || ''
  });

  const handleSave = () => {
    if (editedWord.word.trim() && editedWord.meaning.trim()) {
      onUpdate(word.id, editedWord);
    } else {
      toast.error('La palabra y el significado son obligatorios');
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-2 border-purple-500">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Palabra</label>
            <input
              type="text"
              value={editedWord.word}
              onChange={(e) => setEditedWord({ ...editedWord, word: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Significado</label>
            <textarea
              value={editedWord.meaning}
              onChange={(e) => setEditedWord({ ...editedWord, meaning: e.target.value })}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ejemplo (opcional)</label>
            <textarea
              value={editedWord.example}
              onChange={(e) => setEditedWord({ ...editedWord, example: e.target.value })}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Guardar
            </button>
            <button
              onClick={onCancelEdit}
              className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-bold text-gray-900">{word.word}</h3>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(word)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(word.id, word.word)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <p className="text-gray-700">{word.meaning}</p>
        
        {word.example && (
          <p className="text-sm text-gray-600 italic border-l-2 border-gray-300 pl-3">
            "{word.example}"
          </p>
        )}
        
        <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{word.addedByName || 'Anónimo'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(word.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
