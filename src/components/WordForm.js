import React, { memo } from 'react';
import { X } from 'lucide-react';

const WordForm = memo(({ 
  editingId, 
  newWord, 
  newMeaning, 
  newExample, 
  setNewWord, 
  setNewMeaning, 
  setNewExample, 
  handleAddWord, 
  handleKeyPress, 
  resetForm 
}) => {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Palabra / Frase <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 text-gray-900 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all text-base"
            placeholder="Ej: Sublime"
            autoFocus
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Significado <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <textarea
            value={newMeaning}
            onChange={(e) => setNewMeaning(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 text-gray-900 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-none text-base"
            placeholder="Describe el significado..."
            rows="3"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ejemplo <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <div className="relative">
          <textarea
            value={newExample}
            onChange={(e) => setNewExample(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 text-gray-900 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-none text-base"
            placeholder="Agrega un ejemplo de uso..."
            rows="2"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={handleAddWord}
          disabled={!newWord.trim() || !newMeaning.trim()}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          {editingId ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              Actualizar palabra
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Agregar palabra
            </>
          )}
        </button>
        <p className="mt-3 text-xs text-gray-500 text-center">
          <span className="block sm:inline">* Campos obligatorios</span>
          <span className="hidden sm:inline"> | </span>
          <span className="block sm:inline">Presiona <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">Ctrl + Enter</kbd> para guardar</span>
        </p>
      </div>
    </div>
  );
});

WordForm.displayName = 'WordForm';

export default WordForm;
