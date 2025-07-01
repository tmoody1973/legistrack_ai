import React from 'react';
import { ArrowRight, Play, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '../common/Button';

interface HeroSectionProps {
  onLogin?: () => void;
  onSignup?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onLogin, onSignup }) => {
  return (
    <section className="relative bg-gradient-to-br from-gray-50 via-white to-primary-50 py-20 lg:py-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary-100 rounded-full blur-3xl opacity-30"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-20"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column - Content */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-primary-500 rounded-full mr-2 animate-pulse"></span>
              Now in Beta - Join the Future of Civic Engagement
            </div>

            {/* LegisTrack Logo - Left-justified and smaller */}
            <div className="flex justify-start mb-6">
              <img 
                src="/legisTRACK copy copy.png" 
                alt="LegisTrack Logo" 
                className="h-32 w-auto" 
              />
            </div>

            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6 lg:mb-0">
                Making Democracy{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-blue-600">
                  Accessible
                </span>{' '}
                Through AI
              </h1>
              
              <img 
                src="/files_1192970-1751377605869-unnamed.png" 
                alt="Bill Analysis Screenshot" 
                className="rounded-lg shadow-xl border border-gray-200 max-w-full lg:max-w-md"
              />
            </div>

            <p className="text-xl text-gray-600 leading-relaxed mb-8 max-w-2xl">
              Transform complex legislation into clear, personalized insights. Track bills that matter to you, 
              understand their impact, and engage with your representatives—all powered by cutting-edge AI.
            </p>

            {/* Key Benefits */}
            <div className="space-y-3 mb-8">
              {[
                'AI-powered bill summaries in plain English',
                'Personalized recommendations based on your location',
                'Real-time voting updates and passage predictions'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-success-500 flex-shrink-0" />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Button size="lg" className="h-12 px-8" onClick={onSignup}>
                Create Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8" onClick={onLogin}>
                Login
              </Button>
            </div>

            {/* Bolt Badge */}
            <div className="mb-6">
              <a href="http://bolt.new" target="_blank" rel="noopener noreferrer">
                <img 
                  src="/black_circle_360x360.png" 
                  alt="Powered by Bolt" 
                  className="h-36 w-auto hover:opacity-80 transition-opacity"
                />
              </a>
            </div>

            <p className="text-sm text-gray-500">
              Join thousands of citizens staying informed about legislation that affects them.
            </p>
            
            {/* Has this happened to you? Section with YouTube Video Alternative */}
            <div className="mt-12 bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Has this happened to you?</h2>
              
              {/* Video Thumbnail with Play Button */}
              <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg bg-gray-800">
                {/* Thumbnail Image */}
                <img 
                  src="https://img.youtube.com/vi/jqULu0-7kJU/maxresdefault.jpg" 
                  alt="Marjorie Taylor Greene Not Reading Bill" 
                  className="w-full h-full object-cover opacity-80"
                />
                
                {/* Play Button Overlay */}
                <a 
                  href="https://www.youtube.com/watch?v=jqULu0-7kJU" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center group"
                >
                  <div className="bg-red-600 rounded-full p-4 shadow-lg group-hover:bg-red-700 transition-colors">
                    <Play className="w-8 h-8 text-white" fill="white" />
                  </div>
                  
                  <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded">
                    <h3 className="font-medium text-sm">Marjorie Taylor Greene Admits She Did Not Read Budget Bill Before Voting Yes</h3>
                    <div className="flex items-center mt-1 text-xs text-gray-300">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      <span>Watch on YouTube</span>
                    </div>
                  </div>
                </a>
              </div>
              
              <p className="mt-4 text-gray-600">
                Don't let this happen to you. With LegisTrack AI, you'll always know what's in the bills that affect your life.
              </p>
            </div>
          </div>

          {/* Right Column - Demo Preview */}
          <div className="relative animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* Mock Browser Header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <div className="ml-4 bg-white rounded px-3 py-1 text-xs text-gray-500 border">
                    legistrack.ai/dashboard
                  </div>
                </div>
              </div>

              {/* Mock Dashboard Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Your Personalized Dashboard</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>

                {/* Mock Bill Card */}
                <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg p-4 border border-primary-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">HR 1234: Healthcare Access Act</h4>
                      <p className="text-xs text-gray-600">Sponsored by Rep. Jane Smith (D-CA)</p>
                    </div>
                    <span className="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full">
                      95% Match
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mb-3">
                    AI Summary: This bill expands healthcare access in your area by funding 
                    community health centers and reducing insurance costs...
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-success-600 font-medium">
                      ✓ 78% passage probability
                    </span>
                    <Button size="sm" variant="outline" className="text-xs">
                      Track Bill
                    </Button>
                  </div>
                </div>

                {/* Mock AI Chat */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">AI</span>
                    </div>
                    <span className="text-xs font-medium text-gray-700">LegisTrack Assistant</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    "Based on your interests in healthcare and education, I found 3 new bills 
                    that might impact your community. Would you like me to explain them?"
                  </p>
                </div>
              </div>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <div className="bg-white rounded-full p-4 shadow-lg">
                  <Play className="w-8 h-8 text-primary-500" />
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-success-100 text-success-700 px-3 py-1 rounded-full text-sm font-medium animate-bounce-gentle">
              Live Updates
            </div>
            <div className="absolute -bottom-4 -left-4 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium animate-bounce-gentle" style={{ animationDelay: '1s' }}>
              AI Powered
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};