import React, { useState } from 'react';
import { AuthProvider } from './components/auth/AuthProvider';
import { AuthModal } from './components/auth/AuthModal';
import { Header } from './components/layout/Header';
import { HeroSection } from './components/sections/HeroSection';
import { FeaturesSection } from './components/sections/FeaturesSection';
import { HowItWorksSection } from './components/sections/HowItWorksSection';
import { TestimonialsSection } from './components/sections/TestimonialsSection';
import { CtaSection } from './components/sections/CtaSection';
import { Footer } from './components/sections/Footer';
import { BillsPage } from './pages/BillsPage';
import { RepresentativesList } from './components/representatives/RepresentativesList';
import { BillTracker } from './components/tracking/BillTracker';
import { DebugPage } from './pages/DebugPage';
import { ProfilePage } from './pages/ProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { VideoBriefingPage } from './pages/VideoBriefingPage';
import { useAuth } from './hooks/useAuth';

// Landing page component
const LandingPage: React.FC = () => {
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    mode: 'login' | 'signup';
  }>({
    isOpen: false,
    mode: 'login',
  });

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthModal({ isOpen: true, mode });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, mode: 'login' });
  };

  return (
    <div className="min-h-screen bg-white">
      <Header onLogin={() => openAuthModal('login')} onSignup={() => openAuthModal('signup')} />
      <main>
        <HeroSection onLogin={() => openAuthModal('login')} onSignup={() => openAuthModal('signup')} />
        <FeaturesSection onSignup={() => openAuthModal('signup')} />
        <HowItWorksSection />
        <TestimonialsSection />
        <CtaSection onSignup={() => openAuthModal('signup')} />
      </main>
      <Footer />
      
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        initialMode={authModal.mode}
      />
    </div>
  );
};

// Dashboard component with navigation
const Dashboard: React.FC = () => {
  const { signOut, authState } = useAuth();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'bills' | 'representatives' | 'tracking' | 'profile' | 'debug' | 'video'>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'bills':
        return <BillsPage />;
      case 'representatives':
        return <RepresentativesList />;
      case 'tracking':
        return <BillTracker />;
      case 'profile':
        return <ProfilePage />;
      case 'debug':
        return <DebugPage />;
      case 'video':
        return <VideoBriefingPage />;
      default:
        return <DashboardPage />;
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', description: 'Real-time legislative feed' },
    { id: 'bills', label: 'Bills', description: 'Browse and search legislation' },
    { id: 'representatives', label: 'Representatives', description: 'Your elected officials' },
    { id: 'tracking', label: 'Tracked Bills', description: 'Bills you\'re following' },
    { id: 'video', label: 'Video Briefings', description: 'Personalized video updates' },
    { id: 'profile', label: 'Profile', description: 'Your account settings' },
    { id: 'debug', label: 'Debug', description: 'Test API connections' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <img 
                  src="/legisTRACK.png" 
                  alt="LegisTrack Logo" 
                  className="h-18 w-auto mr-4"
                />
              </div>
              <nav className="hidden md:flex space-x-6">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id as any)}
                    className={`text-sm font-medium transition-colors ${
                      currentPage === item.id
                        ? 'text-primary-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title={item.description}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {authState.user?.user_metadata?.full_name || authState.user?.email}
              </span>
              <button
                onClick={signOut}
                className="text-gray-600 hover:text-gray-900 font-medium text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-100">
        <div className="px-4 py-2">
          <select
            value={currentPage}
            onChange={(e) => setCurrentPage(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {navigationItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

// Main App component with auth routing
const AppContent: React.FC = () => {
  const { authState } = useAuth();

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return authState.user ? <Dashboard /> : <LandingPage />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;