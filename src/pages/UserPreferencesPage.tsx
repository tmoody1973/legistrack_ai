import React from 'react';
import { UserPreferencesForm } from '../components/profile/UserPreferencesForm';
import { useAuth } from '../hooks/useAuth';
import { Settings, User, Bell, Shield } from 'lucide-react';

export const UserPreferencesPage: React.FC = () => {
  const { authState } = useAuth();

  if (!authState.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please sign in to view your preferences.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Settings className="w-8 h-8 mr-3 text-primary-500" />
            Personalization Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Customize your experience and get personalized recommendations
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex border-b border-gray-200">
            <button className="px-6 py-3 text-sm font-medium border-b-2 border-primary-500 text-primary-600">
              <User className="w-4 h-4 inline mr-2" />
              Preferences
            </button>
            <button className="px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">
              <Bell className="w-4 h-4 inline mr-2" />
              Notifications
            </button>
            <button className="px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">
              <Shield className="w-4 h-4 inline mr-2" />
              Privacy
            </button>
          </div>
        </div>

        {/* Preferences Form */}
        <UserPreferencesForm />
      </div>
    </div>
  );
};