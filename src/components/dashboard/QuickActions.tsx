import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

export const QuickAction: React.FC<QuickActionProps> = ({ 
  title, 
  description, 
  icon, 
  color, 
  onClick 
}) => {
  return (
    <button
      onClick={onClick}
      className={`${color} text-white p-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg group w-full`}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="p-3 bg-white bg-opacity-20 rounded-xl group-hover:bg-opacity-30 transition-all">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm opacity-90">{description}</p>
        </div>
      </div>
    </button>
  );
};

interface QuickActionsProps {
  actions: Array<{
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
  }>;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  return (
    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
          <p className="text-gray-600">Get things done faster</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <QuickAction key={index} {...action} />
        ))}
      </div>
    </div>
  );
};