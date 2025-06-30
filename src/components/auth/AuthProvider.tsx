import React from 'react';
import { AuthContext, useAuthState } from '../../hooks/useAuth';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authMethods = useAuthState();

  return (
    <AuthContext.Provider value={authMethods}>
      {children}
    </AuthContext.Provider>
  );
};