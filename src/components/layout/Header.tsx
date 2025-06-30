import React, { useState } from 'react';
import { Menu, X, Bell, User } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  onLogin?: () => void;
  onSignup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogin, onSignup }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { authState } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img 
                src="/legisTRACK copy.png" 
                alt="LegisTrack Logo" 
                className="h-20 w-auto" // 2x bigger logo
              />
            </div>
          </div>
          
          {!authState.user && (
            <div className="hidden md:flex items-center space-x-3">
              <Button variant="ghost" size="md" onClick={onLogin}>
                Login
              </Button>
              <Button variant="primary" size="md" onClick={onSignup}>
                Create Account
              </Button>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && !authState.user && (
          <div className="md:hidden py-4 border-t border-gray-100 animate-fade-in">
            <div className="space-y-3">
              {!authState.user && (
                <div className="pt-3 space-y-2">
                  <Button variant="ghost" size="md" className="w-full" onClick={onLogin}>
                    Login
                  </Button>
                  <Button variant="primary" size="md" className="w-full" onClick={onSignup}>
                    Create Account
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};