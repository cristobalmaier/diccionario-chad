import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database, auth, signOut } from '../../firebase';
import { Clock, Shield, CheckCircle, LogOut, RefreshCw } from 'lucide-react';
import { toast, Bounce } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

export default function WaitingVerification({ user }) {
  const [isVerified, setIsVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Escuchar cambios en el estado de verificación del usuario en tiempo real
    const userRef = ref(database, `users/${user.uid}`);
    
    const unsubscribe = onValue(userRef, (snapshot) => {
      const userData = snapshot.val();
      setChecking(false);
      
      if (userData && userData.isVerified === true) {
        setIsVerified(true);
        
        // Mostrar notificación de éxito
        toast.success('🎉 ¡Tu cuenta ha sido verificada!', {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          transition: Bounce,
          theme: "colored",
          style: {
            fontSize: '18px',
            fontWeight: 'bold'
          }
        });

        toast.info('Ya puedes acceder al sistema. Redirigiendo...', {
          position: "top-center",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          transition: Bounce,
        });

        // Redirigir después de 2 segundos
        setTimeout(() => {
          window.location.reload(); // Recargar para actualizar el estado
        }, 2000);
      }
    });

    return () => unsubscribe();
  }, [user, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.info('Sesión cerrada correctamente', { transition: Bounce });
      navigate('/auth');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión', { transition: Bounce });
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white text-center">
            <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Clock className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Cuenta en Espera de Verificación</h1>
            <p className="text-blue-100">Tu cuenta está siendo revisada por un administrador</p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{user?.displayName || 'Usuario'}</h3>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                </div>
                <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pendiente
                </div>
              </div>
            </div>

            {/* Status Steps */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Cuenta Creada</h4>
                  <p className="text-sm text-gray-600">Tu cuenta ha sido registrada exitosamente</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">En Revisión</h4>
                  <p className="text-sm text-gray-600">Un administrador está revisando tu solicitud</p>
                </div>
              </div>

              <div className="flex items-start gap-4 opacity-50">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Verificación Completada</h4>
                  <p className="text-sm text-gray-600">Podrás acceder al sistema completo</p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">¿Qué está pasando?</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Tu cuenta está siendo revisada por seguridad</li>
                      <li>Recibirás una notificación cuando seas verificado</li>
                      <li>Este proceso suele tomar pocos minutos</li>
                      <li>Puedes cerrar esta ventana y volver más tarde</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-md hover:shadow-lg"
              >
                <RefreshCw className="w-5 h-5" />
                Actualizar Estado
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>Esta página se actualizará automáticamente cuando seas verificado</p>
        </div>
      </div>
    </div>
  );
}
