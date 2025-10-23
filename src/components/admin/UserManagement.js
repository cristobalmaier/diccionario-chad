import React, { useState, useEffect } from 'react';
import { ref, onValue, update, remove, query, orderByChild, equalTo, get } from 'firebase/database';
import { database, auth } from '../../firebase';
import { deleteUser as deleteAuthUser } from 'firebase/auth';
import { toast } from 'react-toastify';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  User, 
  Mail, 
  Trash2,
  Search,
  Filter,
  Clock,
  Hash,
  Pencil
} from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, verified, unverified
  const [editingUserId, setEditingUserId] = useState(null);
  const [editedName, setEditedName] = useState('');

  // Cargar todos los usuarios
  useEffect(() => {
    const usersRef = ref(database, 'users');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersData = snapshot.val() || {};
      console.log('Datos de usuarios desde Firebase:', usersData);
      const usersList = Object.entries(usersData).map(([uid, userData]) => ({
        uid,
        ...userData
      }));
      
      console.log('Lista de usuarios procesada:', usersList);
      setUsers(usersList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleVerification = async (userId, currentStatus) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        isVerified: !currentStatus
      });
      toast.success(`Usuario ${!currentStatus ? 'verificado' : 'desverificado'} correctamente`);
    } catch (error) {
      console.error('Error al actualizar el estado de verificación:', error);
      toast.error('Error al actualizar el estado de verificación');
    }
  };

  const handleNameEdit = async (userId, currentName) => {
    setEditingUserId(userId);
    setEditedName(currentName);
  };

  const saveNameEdit = async (userId) => {
    if (!editedName.trim()) return;
    
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        displayName: editedName.trim()
      });
      toast.success('Nombre actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar el nombre:', error);
      toast.error('Error al actualizar el nombre');
    } finally {
      setEditingUserId(null);
      setEditedName('');
    }
  };

  const handleKeyDown = (e, userId) => {
    if (e.key === 'Enter') {
      saveNameEdit(userId);
    } else if (e.key === 'Escape') {
      setEditingUserId(null);
      setEditedName('');
    }
  };

  const deleteUser = async (userId, userName) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) {
      try {
        // 1. Delete user's data from Realtime Database
        const userRef = ref(database, `users/${userId}`);
        await remove(userRef);
        
        // 2. Delete user's words
        const userWordsRef = ref(database, 'words');
        const userWordsQuery = query(userWordsRef, orderByChild('addedBy'), equalTo(userId));
        const snapshot = await get(userWordsQuery);
        
        if (snapshot.exists()) {
          const updates = {};
          snapshot.forEach((childSnapshot) => {
            updates[`words/${childSnapshot.key}`] = null;
          });
          await update(ref(database), updates);
        }
        
        // 3. Show success message
        toast.success('Usuario eliminado correctamente');
        
        // Note: For security reasons, we're not deleting the user from Firebase Authentication here.
        // In a production environment, you should use a Cloud Function with admin privileges
        // to properly handle user deletion from Authentication.
        
      } catch (error) {
        console.error('Error al eliminar el usuario:', error);
        toast.error('Error al eliminar el usuario');
      }
    }
  };

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.uid?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'verified' && user.isVerified) ||
      (filterStatus === 'unverified' && !user.isVerified);
    
    return matchesSearch && matchesFilter;
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
      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          {/* Filtro */}
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="verified">Verificados</option>
              <option value="unverified">No verificados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  UID
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Registro
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Conexión
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          {editingUserId === user.uid ? (
                            <div className="flex items-center">
                              <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, user.uid)}
                                onBlur={() => saveNameEdit(user.uid)}
                                autoFocus
                                className="text-sm border-b border-gray-300 focus:border-purple-500 focus:outline-none focus:ring-0 px-1 py-0.5 w-40"
                              />
                              <button
                                onClick={() => saveNameEdit(user.uid)}
                                className="ml-2 text-green-600 hover:text-green-800"
                                title="Guardar cambios"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div 
                              className="text-sm font-medium text-gray-900 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer flex items-center group"
                              onClick={() => handleNameEdit(user.uid, user.displayName || '')}
                            >
                              {user.displayName || 'Sin nombre'}
                              <Pencil className="h-3 w-3 ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-xs text-gray-500 font-mono">
                        <Hash className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="truncate max-w-[120px]" title={user.uid}>
                          {user.uid}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {user.isVerified ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          No verificado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 text-gray-400 mr-1" />
                        {user.lastLogin ? (
                          <span title={new Date(user.lastLogin).toLocaleString()}>
                            {new Date(user.lastLogin).toLocaleDateString()}
                          </span>
                        ) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => toggleVerification(user.uid, user.isVerified)}
                          className={`inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            user.isVerified
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-500 hover:bg-gray-50'
                          }`}
                          title={user.isVerified ? 'Desverificar usuario' : 'Verificar usuario'}
                        >
                          {user.isVerified ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteUser(user.uid, user.displayName || user.email)}
                          className="inline-flex items-center px-2.5 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No se encontraron usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Total de usuarios: <strong>{filteredUsers.length}</strong></span>
          <span>Verificados: <strong>{filteredUsers.filter(u => u.isVerified).length}</strong></span>
          <span>No verificados: <strong>{filteredUsers.filter(u => !u.isVerified).length}</strong></span>
        </div>
      </div>
    </div>
  );
}
