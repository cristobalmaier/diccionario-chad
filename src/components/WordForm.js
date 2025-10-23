import React, { memo } from 'react';

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
      <div className="relative group">
        <label htmlFor="word-input" className="block text-sm font-medium text-gray-700 mb-2 transition-colors duration-200 group-focus-within:text-blue-600">
          Palabra / Frase <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <input
            id="word-input"
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full pl-10 pr-4 py-3 text-gray-900 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all text-base bg-white/90 hover:bg-white focus:bg-white"
            placeholder="Ej: Sublime"
            autoFocus
          />
          {newWord && (
            <button
              type="button"
              onClick={() => setNewWord('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              aria-label="Limpiar campo"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
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
          <span className="block sm:inline text-red-500">* </span>
          <span className="hidden sm:inline"> Campos obligatorios </span>
        </p>
      </div>
    </div>
  );
});

WordForm.displayName = 'WordForm';

export default WordForm;
