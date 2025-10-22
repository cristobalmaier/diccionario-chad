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

    const userRef = ref(database, `users/${user.uid}`);
    
    const unsubscribe = onValue(userRef, (snapshot) => {
      const userData = snapshot.val();
      setChecking(false);
      
      if (userData?.isVerified) {
        setIsVerified(true);
        
        toast.success('🎉 ¡Cuenta verificada!', {
          position: "top-center",
          autoClose: 2000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          transition: Bounce,
        });

        setTimeout(() => window.location.reload(), 1500);
      }
    });

    return () => unsubscribe();
  }, [user, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/auth');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">Verificación en Proceso</h1>
            <p className="text-gray-600">Tu cuenta está siendo revisada por un administrador</p>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-lg font-medium">
                {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{user?.displayName || 'Usuario'}</h3>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
              <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Pendiente
              </span>
            </div>
          </div>

          {/* Status Steps */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Cuenta Creada</h4>
                <p className="text-sm text-gray-500">Registro completado exitosamente</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">En Revisión</h4>
                <p className="text-sm text-gray-500">Solicitud en proceso de aprobación</p>
              </div>
            </div>

            <div className="flex items-start gap-3 opacity-50">
              <div className="flex-shrink-0 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Verificado</h4>
                <p className="text-sm text-gray-500">Acceso completo al sistema</p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-2">¿Qué sigue?</h3>
                <ul className="text-sm text-blue-700 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Revisión de seguridad en proceso</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Te notificaremos cuando estés verificado</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar estado
            </button>
            
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1.5 mx-auto mt-4"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
        
        <p className="mt-6 text-xs text-gray-500 text-center">
          Esta página se actualizará automáticamente cuando tu cuenta sea verificada
        </p>
      </div>
    </div>
  );
}
