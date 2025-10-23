import React, { useState, useEffect } from 'react';
import { ref, onValue, update, remove, query, orderByChild } from 'firebase/database';
import { database } from '../../firebase';
import { toast } from 'react-toastify';
import { MessageCircle, Check, X, ArrowLeft, Trash2 } from 'lucide-react';

const FeedbackManagement = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch feedback from Firebase
  useEffect(() => {
    const feedbackRef = query(ref(database, 'feedback'), orderByChild('timestamp'));
    
    const unsubscribe = onValue(feedbackRef, (snapshot) => {
      const feedbacks = [];
      snapshot.forEach((childSnapshot) => {
        feedbacks.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      // Sort by timestamp (newest first)
      feedbacks.sort((a, b) => b.timestamp - a.timestamp);
      setFeedbackList(feedbacks);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching feedback:', error);
      toast.error('Error al cargar los comentarios');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (feedbackId, isRead) => {
    try {
      await update(ref(database, `feedback/${feedbackId}`), {
        read: isRead
      });
      toast.success(isRead ? 'Marcado como leído' : 'Marcado como no leído');
    } catch (error) {
      console.error('Error updating feedback status:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  const deleteFeedback = async (feedbackId, event) => {
    event.stopPropagation();
    if (window.confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
      try {
        await remove(ref(database, `feedback/${feedbackId}`));
        toast.success('Comentario eliminado');
        if (selectedFeedback && selectedFeedback.id === feedbackId) {
          setSelectedFeedback(null);
        }
        // Remove from local state
        setFeedbackList(prev => prev.filter(fb => fb.id !== feedbackId));
      } catch (error) {
        console.error('Error deleting feedback:', error);
        toast.error('Error al eliminar el comentario');
      }
    }
  };

  const filteredFeedback = feedbackList.filter(feedback => 
    feedback.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (selectedFeedback) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <button
          onClick={() => setSelectedFeedback(null)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" /> Volver a la lista
        </button>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-medium text-gray-900">
              Comentario de {selectedFeedback.userEmail || 'Usuario'}
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => markAsRead(selectedFeedback.id, !selectedFeedback.read)}
                className={`p-2 rounded-full ${selectedFeedback.read ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}`}
                title={selectedFeedback.read ? 'Marcar como no leído' : 'Marcar como leído'}
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => deleteFeedback(selectedFeedback.id, e)}
                className="p-2 text-red-600 rounded-full hover:bg-red-100"
                title="Eliminar comentario"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-2">
            {new Date(selectedFeedback.timestamp).toLocaleString()}
          </p>
          <p className="text-gray-700 whitespace-pre-line">
            {selectedFeedback.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Comentarios de Usuarios</h2>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Buscar comentarios..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <MessageCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {filteredFeedback.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No hay comentarios</h3>
            <p className="mt-1 text-gray-500">
              {searchTerm ? 'No se encontraron comentarios que coincidan con la búsqueda.' : 'Los comentarios de los usuarios aparecerán aquí.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            {filteredFeedback.map((feedback) => (
              <div
                key={feedback.id}
                onClick={() => setSelectedFeedback(feedback)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${feedback.read ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {feedback.userEmail || 'Usuario anónimo'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(feedback.timestamp).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-gray-700 line-clamp-2">
                      {feedback.message}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {!feedback.read && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Nuevo
                      </span>
                    )}
                    {feedback.read ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(feedback.id, false);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Marcar como no leído"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(feedback.id, true);
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Marcar como leído"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => deleteFeedback(feedback.id, e)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Eliminar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackManagement;
