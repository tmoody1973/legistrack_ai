import React from 'react';
import { UserPlus, Settings, Video, MessageCircle } from 'lucide-react';
import { Button } from '../common/Button';

interface StepProps {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  isLast?: boolean;
}

const Step: React.FC<StepProps> = ({ number, icon, title, description, isLast = false }) => {
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Step Number and Icon */}
      <div className="relative mb-6">
        <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
          {number}
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full border-2 border-primary-200 flex items-center justify-center">
          <div className="text-primary-500">
            {icon}
          </div>
        </div>
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed max-w-sm">{description}</p>

      {/* Connector Line */}
      {!isLast && (
        <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary-300 to-primary-200 transform translate-x-8"></div>
      )}
    </div>
  );
};

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      icon: <UserPlus className="w-4 h-4" />,
      title: 'Create Your Profile',
      description: 'Tell us your location, interests, and civic priorities to get personalized recommendations.'
    },
    {
      icon: <Settings className="w-4 h-4" />,
      title: 'AI Finds Relevant Bills',
      description: 'Our AI analyzes thousands of bills and surfaces the ones that matter most to you and your community.'
    },
    {
      icon: <Video className="w-4 h-4" />,
      title: 'Get Video Briefings',
      description: 'Receive personalized video explanations from AI policy experts tailored to your interests and location.'
    },
    {
      icon: <MessageCircle className="w-4 h-4" />,
      title: 'Take Action',
      description: 'Contact your representatives, share insights, and engage with legislation that affects your life.'
    }
  ];

  return (
    <section id="how-it-works" className="w-full py-20 lg:py-32 bg-gradient-to-br from-gray-50 to-primary-50">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-white text-primary-700 rounded-full text-sm font-medium mb-6 shadow-sm">
            Simple Process
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            How{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-blue-600">
              LegisTrack AI
            </span>{' '}
            Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Get started in minutes and transform how you engage with government. 
            Our AI does the heavy lifting so you can focus on what matters.
          </p>
        </div>

        {/* Steps */}
        <div className="grid lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          {steps.map((step, index) => (
            <div
              key={index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <Step
                number={index + 1}
                icon={step.icon}
                title={step.title}
                description={step.description}
                isLast={index === steps.length - 1}
              />
            </div>
          ))}
        </div>

        {/* Demo Preview */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full">
          <div className="bg-gradient-to-r from-primary-500 to-blue-600 px-6 py-4">
            <h3 className="text-white font-semibold text-lg">Live Demo Preview</h3>
            <p className="text-primary-100 text-sm">See LegisTrack AI in action</p>
          </div>
          
          <div className="p-6 lg:p-8">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">
                  Personalized Video Briefings
                </h4>
                <p className="text-gray-600 mb-6">
                  Our AI policy experts deliver personalized video briefings on legislation that matters to you:
                </p>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">Daily Legislative Update</h5>
                      <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                        New
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Your personalized daily briefing covering the most important legislative developments.
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-600 font-medium">
                        3:45 runtime
                      </span>
                      <span className="text-xs text-gray-500">
                        Updated today
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">HR 1234: Healthcare Reform Explained</h5>
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                        Trending
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      A detailed explanation of the Healthcare Reform Act and how it affects your community.
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-600 font-medium">
                        5:12 runtime
                      </span>
                      <span className="text-xs text-gray-500">
                        Generated yesterday
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative shadow-lg">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-primary-500 rounded-full p-4 cursor-pointer hover:bg-primary-600 transition-colors">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded">
                    <h5 className="font-medium mb-1">Video Briefing: S.1234 - Education Funding Act</h5>
                    <p className="text-sm text-gray-300">
                      Personalized explanation of how this bill affects teachers in California
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};