import React, { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild } from 'firebase/database';
import { database } from '../../firebase';
import { 
  Shield, 
  BookOpen, 
  Users, 
  TrendingUp, 
  Activity,
  LogOut,
  Home,
  UserCheck,
  FileText,
  MessageCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { toast } from 'react-toastify';

// Componentes de las diferentes secciones
import UserManagement from './UserManagement';
import WordManagement from './WordManagement';
import FeedbackManagement from './FeedbackManagement';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalWords: 0,
    totalUsers: 0,
    verifiedUsers: 0,
    recentWords: [],
    unreadFeedback: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Cargar estadísticas
  useEffect(() => {
    const wordsRef = ref(database, 'words');
    const usersRef = ref(database, 'users');

    const unsubscribeWords = onValue(wordsRef, (snapshot) => {
      const wordsData = snapshot.val() || {};
      const wordsArray = Object.entries(wordsData).map(([id, data]) => ({
        id,
        ...data
      }));
      
      // Ordenar por timestamp descendente y tomar los últimos 5
      const recentWords = wordsArray
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 5);

      setStats(prev => ({
        ...prev,
        totalWords: wordsArray.length,
        recentWords
      }));
    });

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val() || {};
      const usersArray = Object.values(usersData);
      
      const verifiedCount = usersArray.filter(user => user.isVerified).length;
      
      setStats(prev => ({
        ...prev,
        totalUsers: usersArray.length,
        verifiedUsers: verifiedCount
      }));
    });

    // Cargar comentarios no leídos
    const feedbackRef = query(ref(database, 'feedback'), orderByChild('read'));
    const unsubscribeFeedback = onValue(feedbackRef, (snapshot) => {
      const feedbacks = snapshot.val() || {};
      const unreadCount = Object.values(feedbacks).filter(fb => !fb.read).length;
      
      setStats(prev => ({
        ...prev,
        unreadFeedback: unreadCount
      }));
    });

    setLoading(false);

    return () => {
      unsubscribeWords();
      unsubscribeUsers();
      unsubscribeFeedback();
      if (unsubscribeFeedback) unsubscribeFeedback();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Sesión cerrada correctamente');
      navigate('/auth');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
                <p className="text-sm text-gray-600">Bienvenido, {user?.displayName || user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">Inicio</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs de navegación */}
        <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Activity className="w-5 h-5" />
              <span className="hidden sm:inline">Vista General</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline">Usuarios</span>
            </button>
            <button
              onClick={() => setActiveTab('words')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'words'
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="hidden sm:inline">Palabras</span>
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'feedback'
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="hidden sm:inline">Comentarios</span>
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {stats.unreadFeedback || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Contenido según el tab activo */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={<BookOpen className="w-8 h-8" />}
                title="Total Palabras"
                value={stats.totalWords}
                color="blue"
              />
              <StatCard
                icon={<Users className="w-8 h-8" />}
                title="Total Usuarios"
                value={stats.totalUsers}
                color="green"
              />
              <StatCard
                icon={<UserCheck className="w-8 h-8" />}
                title="Usuarios Verificados"
                value={stats.verifiedUsers}
                color="purple"
              />
              <StatCard
                icon={<TrendingUp className="w-8 h-8" />}
                title="Tasa de Verificación"
                value={stats.totalUsers > 0 ? `${Math.round((stats.verifiedUsers / stats.totalUsers) * 100)}%` : '0%'}
                color="orange"
              />
            </div>

            {/* Palabras recientes */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Palabras Recientes
              </h2>
              {stats.recentWords.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentWords.map((word) => (
                    <div
                      key={word.id}
                      className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{word.word}</h3>
                        <p className="text-sm text-gray-600 mt-1">{word.meaning}</p>
                        {word.example && (
                          <p className="text-xs text-gray-500 mt-1 italic">"{word.example}"</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xs text-gray-500">
                          {word.addedByName || 'Anónimo'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(word.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No hay palabras registradas</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'words' && <WordManagement />}
        {activeTab === 'feedback' && <FeedbackManagement />}
      </div>
    </div>
  );
}

// Componente de tarjeta de estadística
function StatCard({ icon, title, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${colorClasses[color]} p-3 rounded-lg text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
