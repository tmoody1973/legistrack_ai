import React from 'react';
import { Brain, Users, BarChart3, MessageSquare, Video, Volume2 } from 'lucide-react';
import { Button } from '../common/Button';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  icon, 
  title, 
  description, 
  highlight = false 
}) => {
  return (
    <div className={`
      relative p-6 rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1
      ${highlight 
        ? 'bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200 shadow-md' 
        : 'bg-white border-gray-200 hover:border-primary-200'
      }
    `}>
      {highlight && (
        <div className="absolute -top-3 left-6">
          <span className="bg-primary-500 text-white text-xs px-3 py-1 rounded-full font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      <div className={`
        w-12 h-12 rounded-lg flex items-center justify-center mb-4
        ${highlight ? 'bg-primary-500' : 'bg-primary-100'}
      `}>
        <div className={highlight ? 'text-white' : 'text-primary-500'}>
          {icon}
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
};

interface FeaturesSectionProps {
  onSignup?: () => void;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ onSignup }) => {
  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'AI-Powered Analysis',
      description: 'Complex legislation translated into plain English with personalized impact assessments and passage predictions.',
      highlight: true
    },
    {
      icon: <Video className="w-6 h-6" />,
      title: 'Video Briefings',
      description: 'Personalized video summaries from AI policy experts tailored to your interests and location.',
      highlight: true
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Your Representatives',
      description: 'Complete profiles, voting records, and direct contact tools for all your federal representatives.'
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Smart Tracking',
      description: 'Monitor bills that matter to you with real-time updates and intelligent notifications.'
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'AI Chat Assistant',
      description: 'Ask questions about any bill or political process and get instant, accurate explanations.'
    },
    {
      icon: <Volume2 className="w-6 h-6" />,
      title: 'Audio Summaries',
      description: 'Listen to bill summaries and updates on-the-go with high-quality text-to-speech technology.'
    }
  ];

  return (
    <section id="features" className="w-full py-20 lg:py-32 bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
            Powerful Features
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Everything You Need to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-blue-600">
              Stay Informed
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            LegisTrack AI combines cutting-edge artificial intelligence with comprehensive legislative data 
            to create the most accessible civic engagement platform ever built.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <FeatureCard {...feature} />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-8 lg:p-12 border border-primary-100">
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
              Ready to Transform Your Civic Engagement?
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of citizens who are already using AI to stay informed and engaged with their government.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={onSignup}
                className="bg-primary-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors shadow-lg hover:shadow-xl"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};