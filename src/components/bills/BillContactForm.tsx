import React, { useState } from 'react';
import { X, Mail, Send, Users } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import type { Bill } from '../../types';

interface BillContactFormProps {
  bill: Bill;
  isOpen: boolean;
  onClose: () => void;
}

export const BillContactForm: React.FC<BillContactFormProps> = ({ bill, isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    // Simulate sending message
    setTimeout(() => {
      setSending(false);
      setSent(true);
      
      // Close after showing success message
      setTimeout(() => {
        onClose();
      }, 2000);
    }, 1500);
  };

  // Generate default message template
  const getDefaultMessage = () => {
    return `Dear Representative,

I am writing regarding ${bill.bill_type} ${bill.number}, "${bill.short_title || bill.title}".

[Explain your position on the bill and why it matters to you]

I urge you to [support/oppose] this legislation because [your reasoning].

Thank you for your consideration.

Sincerely,
[Your Name]
[Your Address]
[Your Contact Information]`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Content */}
          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-success-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h2>
              <p className="text-gray-600">
                Your message has been sent to your representatives.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Contact Your Representatives</h2>
                <p className="text-gray-600">
                  Send a message about {bill.bill_type} {bill.number}
                </p>
              </div>
              
              {/* Representatives */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipients
                </label>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  {bill.sponsors && bill.sponsors.length > 0 ? (
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        <Users className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{bill.sponsors[0].full_name}</p>
                        <p className="text-sm text-gray-600">
                          {bill.sponsors[0].party}-{bill.sponsors[0].state}
                          {bill.sponsors[0].district && ` (District ${bill.sponsors[0].district})`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No representative information available</p>
                  )}
                </div>
              </div>
              
              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <Input
                  id="subject"
                  type="text"
                  value={`Regarding ${bill.bill_type} ${bill.number}: ${bill.short_title || bill.title}`}
                  readOnly
                />
              </div>
              
              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  value={message || getDefaultMessage()}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[200px]"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Personalize your message for greater impact. Be clear, concise, and respectful.
                </p>
              </div>
              
              {/* Submit */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={sending}
                >
                  {sending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};