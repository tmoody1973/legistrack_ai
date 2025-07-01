import React from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '../common/Button';

interface CtaSectionProps {
  onSignup?: () => void;
}

export const CtaSection: React.FC<CtaSectionProps> = ({ onSignup }) => {
  return (
    <section className="w-full py-20 lg:py-32 bg-gradient-to-br from-primary-500 to-blue-600 text-white">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Start Making Democracy More Accessible Today
            </h2>
            <p className="text-xl text-primary-100 mb-8 leading-relaxed">
              Join thousands of citizens who are using AI to understand legislation, 
              track bills that matter, and engage meaningfully with their representatives.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-primary-200 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-xl">Stay Informed</h3>
                  <p className="text-primary-100">Get personalized updates on legislation that affects you and your community.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-primary-200 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-xl">Save Time</h3>
                  <p className="text-primary-100">AI-powered summaries and analysis save you hours of reading complex legislation.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-primary-200 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-xl">Make Your Voice Heard</h3>
                  <p className="text-primary-100">Easily contact your representatives about issues that matter to you.</p>
                </div>
              </div>
            </div>
            
            <Button 
              size="lg" 
              className="bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 text-lg shadow-lg"
              onClick={onSignup}
            >
              Create Your Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          
          <div className="bg-white bg-opacity-10 rounded-2xl p-8 backdrop-blur-sm border border-white border-opacity-20 shadow-xl">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Join Our Community</h3>
              <p className="text-primary-100">Create your free account in less than 2 minutes</p>
            </div>
            
            <div className="space-y-6 mb-8">
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-primary-200 rounded-full flex items-center justify-center text-primary-700 font-bold">
                    1
                  </div>
                  <h4 className="font-semibold">Create Your Profile</h4>
                </div>
                <p className="text-primary-100 text-sm pl-14">
                  Sign up with your email and set your location and interests.
                </p>
              </div>
              
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-primary-200 rounded-full flex items-center justify-center text-primary-700 font-bold">
                    2
                  </div>
                  <h4 className="font-semibold">Discover Relevant Legislation</h4>
                </div>
                <p className="text-primary-100 text-sm pl-14">
                  Get personalized bill recommendations based on your profile.
                </p>
              </div>
              
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-primary-200 rounded-full flex items-center justify-center text-primary-700 font-bold">
                    3
                  </div>
                  <h4 className="font-semibold">Stay Informed & Engaged</h4>
                </div>
                <p className="text-primary-100 text-sm pl-14">
                  Track bills, get AI analysis, and contact your representatives.
                </p>
              </div>
            </div>
            
            <Button 
              size="lg" 
              className="w-full bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 text-lg shadow-lg"
              onClick={onSignup}
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};