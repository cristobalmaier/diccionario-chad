import React, { memo } from 'react';
import { X } from 'lucide-react';

const WordCard = memo(({ item, onEdit, onDelete }) => {
  return (
    <div 
      className="bg-white/90 backdrop-blur-sm rounded-xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-blue-100 relative w-full max-w-md mx-auto flex flex-col h-full group"
    >
      <div className="flex-1">
        <div className="flex justify-between items-start gap-3 mb-3">
          <h3 className="text-lg font-bold text-blue-800 line-clamp-2">
            {item.word}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-full hover:bg-blue-50"
              title="Editar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50"
              title="Eliminar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <p className="text-gray-700 leading-relaxed text-sm sm:text-base mb-3 line-clamp-3">
          {item.meaning}
        </p>
        
        {item.example && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Ejemplo</p>
            <p className="text-gray-600 text-sm leading-relaxed">"{item.example}"</p>
          </div>
        )}
        
        <div className="mt-auto pt-3 border-t border-gray-100">
          <div className="flex justify-end items-center gap-1">
            {item.modifiedByName ? (
              <>
                <span className="text-xs text-gray-500">Modificado por:</span>
                <span className="text-xs font-medium text-blue-600 ml-1">
                  {item.modifiedByName}
                </span>
              </>
            ) : item.addedByName ? (
              <>
                <span className="text-xs text-gray-500">Agregado por:</span>
                <span className="text-xs font-medium text-blue-600 ml-1">
                  {item.addedByName}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

WordCard.displayName = 'WordCard';

export default WordCard;
