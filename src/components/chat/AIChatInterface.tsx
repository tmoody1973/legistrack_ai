import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { openaiService } from '../../services/openaiService';
import ReactMarkdown from 'react-markdown';
import type { Bill } from '../../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

interface AIChatInterfaceProps {
  bill: Bill;
  suggestedQuestions?: string[];
}

export const AIChatInterface: React.FC<AIChatInterfaceProps> = ({ 
  bill,
  suggestedQuestions: initialSuggestions = []
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(initialSuggestions);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Check if OpenAI API is available
  const isOpenAIAvailable = openaiService.isAvailable();

  // Add initial welcome message
  useEffect(() => {
    const welcomeMessage = {
      id: 'welcome',
      role: 'model' as const,
      content: `👋 Hello! I'm your AI legislative assistant. I can help you understand ${bill.bill_type} ${bill.number}: "${bill.short_title || bill.title}". What would you like to know about this bill?`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    
    // Generate suggested questions if none provided
    if (initialSuggestions.length === 0) {
      generateSuggestedQuestions();
    }
  }, [bill.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate suggested follow-up questions
  const generateSuggestedQuestions = async () => {
    if (!isOpenAIAvailable) {
      setSuggestedQuestions([
        "What are the key provisions of this bill?",
        "Who sponsored this bill?",
        "What's the current status of this bill?",
        "How likely is this bill to pass?",
        "How would this bill affect me?"
      ]);
      return;
    }

    try {
      setIsGeneratingSuggestions(true);
      const questions = await openaiService.generateFollowUpQuestions(bill);
      setSuggestedQuestions(questions);
    } catch (err) {
      console.error('Error generating suggested questions:', err);
      // Use default questions on error
      setSuggestedQuestions([
        "What are the key provisions of this bill?",
        "Who sponsored this bill?",
        "What's the current status of this bill?",
        "How likely is this bill to pass?",
        "How would this bill affect me?"
      ]);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Handle sending a message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert messages to format expected by OpenAI service
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Generate response
      const response = await openaiService.generateBillChatResponse(
        input,
        bill,
        chatHistory
      );
      
      const aiMessage: Message = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Generate new suggested questions after each response
      generateSuggestedQuestions();
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to generate response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clicking a suggested question
  const handleSuggestedQuestionClick = (question: string) => {
    setInput(question);
    handleSendMessage();
  };

  // Clear chat history
  const handleClearChat = () => {
    const welcomeMessage = {
      id: 'welcome',
      role: 'model' as const,
      content: `👋 Hello! I'm your AI legislative assistant. I can help you understand ${bill.bill_type} ${bill.number}: "${bill.short_title || bill.title}". What would you like to know about this bill?`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    setError(null);
    generateSuggestedQuestions();
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-primary-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bot className="w-5 h-5 mr-2" />
            <h3 className="font-medium">AI Legislative Assistant</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearChat}
            className="text-white hover:bg-primary-600"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        <p className="text-sm text-primary-100 mt-1">
          Powered by OpenAI GPT-4o
        </p>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user' 
                  ? 'bg-primary-100 text-primary-900' 
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-center mb-1">
                {message.role === 'user' ? (
                  <User className="w-4 h-4 mr-1 text-primary-500" />
                ) : (
                  <Bot className="w-4 h-4 mr-1 text-gray-500" />
                )}
                <span className="text-xs text-gray-500">
                  {message.role === 'user' ? 'You' : 'AI Assistant'} • {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center">
              <Loader2 className="w-4 h-4 text-primary-500 animate-spin mr-2" />
              <span className="text-gray-600">Generating response...</span>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-error-50 text-error-700 rounded-lg p-3 flex items-center max-w-[80%]">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {isGeneratingSuggestions ? (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Generating suggestions...
              </div>
            ) : (
              suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestionClick(question)}
                  className="px-3 py-1 bg-white text-primary-600 text-sm rounded-full border border-primary-200 hover:bg-primary-50 transition-colors"
                  disabled={isLoading}
                >
                  {question}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Ask a question about this bill..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || !isOpenAIAvailable}
              className="pr-10"
            />
          </div>
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading || !isOpenAIAvailable}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        {!isOpenAIAvailable && (
          <p className="text-xs text-error-600 mt-1">
            AI chat requires a valid OpenAI API key to be configured.
          </p>
        )}
      </form>
    </div>
  );
};