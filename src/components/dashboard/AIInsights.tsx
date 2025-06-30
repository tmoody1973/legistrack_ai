import React from 'react';
import { Zap, TrendingUp, Target, BarChart3 } from 'lucide-react';
import { Button } from '../common/Button';

interface InsightItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface AIInsightsProps {
  insights?: InsightItem[];
}

export const AIInsights: React.FC<AIInsightsProps> = ({ insights }) => {
  const defaultInsights: InsightItem[] = [
    {
      id: '1',
      title: '📊 Trending in Your Area',
      description: 'Healthcare bills are gaining momentum in your district with 3 new proposals this week.',
      icon: 'trending'
    },
    {
      id: '2',
      title: '🎯 Personalized Alert',
      description: 'A bill matching your interests (Education) is scheduled for committee vote next week.',
      icon: 'alert'
    },
    {
      id: '3',
      title: '📈 Passage Prediction',
      description: 'HR 1234 has an 85% chance of passing based on current voting patterns and sponsor support.',
      icon: 'prediction'
    }
  ];

  const insightList = insights || defaultInsights;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100 shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">AI Insights</h3>
          <p className="text-purple-700">Powered by advanced analysis</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {insightList.map((insight) => (
          <div 
            key={insight.id} 
            className="bg-white rounded-xl p-4 border border-purple-100 hover:border-purple-300 transition-colors cursor-pointer shadow-sm hover:shadow-md"
          >
            <h4 className="font-semibold text-gray-900 mb-2">{insight.title}</h4>
            <p className="text-sm text-gray-600">{insight.description}</p>
          </div>
        ))}
      </div>
      
      <Button className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white">
        <BarChart3 className="w-4 h-4 mr-2" />
        View All Insights
      </Button>
    </div>
  );
};