import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useAuth } from '../../hooks/useAuth';
import type { SignupCredentials } from '../../types';

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { signUp } = useAuth();
  const [credentials, setCredentials] = useState<SignupCredentials>({
    email: '',
    password: '',
    full_name: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (credentials.password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (credentials.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(credentials);
      
      if (error) {
        // Handle specific error cases with user-friendly messages
        if (error.message.includes('User already registered') || error.message.includes('user_already_exists')) {
          setError('This email is already registered. Please try logging in instead.');
        } else if (error.message.includes('Invalid email')) {
          setError('Please enter a valid email address.');
        } else if (error.message.includes('Password')) {
          setError('Password must be at least 6 characters long.');
        } else {
          setError(error.message);
        }
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof SignupCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
        <p className="text-gray-600">Join thousands of engaged citizens</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <p className="text-error-700 text-sm">{error}</p>
            {error.includes('already registered') && (
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="mt-2 text-primary-500 hover:text-primary-600 font-medium text-sm underline"
              >
                Switch to login
              </button>
            )}
          </div>
        )}

        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="full_name"
              type="text"
              value={credentials.full_name}
              onChange={handleInputChange('full_name')}
              placeholder="Enter your full name"
              required
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="email"
              type="email"
              value={credentials.email}
              onChange={handleInputChange('email')}
              placeholder="Enter your email"
              required
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={credentials.password}
              onChange={handleInputChange('password')}
              placeholder="Create a password"
              required
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-start">
          <input
            type="checkbox"
            required
            className="mt-1 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-600">
            I agree to the{' '}
            <a href="#" className="text-primary-500 hover:text-primary-600">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary-500 hover:text-primary-600">
              Privacy Policy
            </a>
          </span>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-primary-500 hover:text-primary-600 font-medium"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};