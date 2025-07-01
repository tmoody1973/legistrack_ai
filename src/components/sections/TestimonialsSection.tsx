import React from 'react';
import { Star, Quote } from 'lucide-react';

interface TestimonialProps {
  quote: string;
  author: string;
  role: string;
  rating?: number;
  highlight?: boolean;
}

const Testimonial: React.FC<TestimonialProps> = ({ 
  quote, 
  author, 
  role, 
  rating = 5,
  highlight = false
}) => {
  return (
    <div className={`
      p-6 rounded-xl transition-all duration-300 h-full flex flex-col
      ${highlight 
        ? 'bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-200 shadow-md' 
        : 'bg-white border border-gray-200 hover:border-primary-200 hover:shadow-md'
      }
    `}>
      {/* Rating Stars */}
      <div className="flex mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star 
            key={i} 
            className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
          />
        ))}
      </div>
      
      {/* Quote */}
      <div className="mb-4 flex-grow">
        <Quote className="w-8 h-8 text-primary-100 mb-2" />
        <p className="text-gray-700 italic">{quote}</p>
      </div>
      
      {/* Author */}
      <div>
        <p className="font-semibold text-gray-900">{author}</p>
        <p className="text-sm text-gray-600">{role}</p>
      </div>
    </div>
  );
};

export const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      quote: "LegisTrack AI has completely transformed how I stay informed about legislation. The AI summaries save me hours of reading complex bills.",
      author: "Sarah Johnson",
      role: "Policy Analyst",
      rating: 5,
      highlight: true
    },
    {
      quote: "As a busy professional, I never had time to track legislation that affects my industry. Now I get personalized updates that take minutes to review.",
      author: "Michael Chen",
      role: "Small Business Owner",
      rating: 5
    },
    {
      quote: "The video briefings are a game-changer. I can understand complex legislation while commuting or exercising.",
      author: "David Rodriguez",
      role: "Community Organizer",
      rating: 5
    },
    {
      quote: "I've tried other legislative tracking tools, but none come close to the personalization and clarity that LegisTrack AI provides.",
      author: "Jennifer Williams",
      role: "Concerned Citizen",
      rating: 4
    },
    {
      quote: "Being able to contact my representatives directly through the platform has made civic engagement so much more accessible.",
      author: "Robert Taylor",
      role: "Advocacy Director",
      rating: 5
    },
    {
      quote: "The AI chat assistant answers my questions about bills instantly. It's like having a legislative expert on call 24/7.",
      author: "Lisa Martinez",
      role: "Journalist",
      rating: 5
    }
  ];

  const stats = [
    { value: '10,000+', label: 'Active Users' },
    { value: '250,000+', label: 'Bills Tracked' },
    { value: '98%', label: 'User Satisfaction' },
    { value: '30+', label: 'States Represented' }
  ];

  return (
    <section className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
            User Testimonials
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Trusted by Citizens and{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-blue-600">
              Professionals
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            See how LegisTrack AI is transforming civic engagement for thousands of users across the country.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-3xl sm:text-4xl font-bold text-primary-600 mb-2">{stat.value}</p>
              <p className="text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Testimonial {...testimonial} />
            </div>
          ))}
        </div>

        {/* Logos */}
        <div className="mt-20">
          <p className="text-center text-gray-500 mb-8">Trusted by organizations across the country</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-70">
            <img src="https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" alt="Organization logo" className="h-12 grayscale" />
            <img src="https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" alt="Organization logo" className="h-12 grayscale" />
            <img src="https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" alt="Organization logo" className="h-12 grayscale" />
            <img src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" alt="Organization logo" className="h-12 grayscale" />
            <img src="https://images.pexels.com/photos/3184296/pexels-photo-3184296.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" alt="Organization logo" className="h-12 grayscale" />
          </div>
        </div>
      </div>
    </section>
  );
};