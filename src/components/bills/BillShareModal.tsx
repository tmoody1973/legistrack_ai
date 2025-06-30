import React, { useState } from 'react';
import { X, Copy, Twitter, Facebook, Linkedin, Mail, CheckCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import type { Bill } from '../../types';

interface BillShareModalProps {
  bill: Bill;
  isOpen: boolean;
  onClose: () => void;
}

export const BillShareModal: React.FC<BillShareModalProps> = ({ bill, isOpen, onClose }) => {
  const [customMessage, setCustomMessage] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  
  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/bills/${bill.id}`;
  
  const defaultMessage = `Check out ${bill.bill_type} ${bill.number}: ${bill.short_title || bill.title}`;
  const fullShareMessage = customMessage || defaultMessage;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch(err => console.error('Error copying link:', err));
  };
  
  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullShareMessage)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank');
  };
  
  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(fullShareMessage)}`;
    window.open(facebookUrl, '_blank');
  };
  
  const handleLinkedinShare = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedinUrl, '_blank');
  };
  
  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Legislative Update: ${bill.bill_type} ${bill.number}`);
    const body = encodeURIComponent(`${fullShareMessage}\n\nView the bill here: ${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
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
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Content */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Share This Bill</h2>
              <p className="text-gray-600">
                {bill.bill_type} {bill.number}: {bill.short_title || bill.title}
              </p>
            </div>
            
            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add a Custom Message (Optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={defaultMessage}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]"
              />
            </div>
            
            {/* Copy Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share Link
              </label>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="bg-gray-50"
                />
                <Button 
                  variant="outline" 
                  onClick={handleCopyLink}
                  className={linkCopied ? 'bg-success-50 text-success-600 border-success-200' : ''}
                >
                  {linkCopied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Social Share Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Share on Social Media
              </label>
              <div className="flex justify-between">
                <button
                  onClick={handleTwitterShare}
                  className="flex flex-col items-center space-y-1"
                >
                  <div className="w-12 h-12 bg-[#1DA1F2] rounded-full flex items-center justify-center text-white">
                    <Twitter className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-gray-600">Twitter</span>
                </button>
                
                <button
                  onClick={handleFacebookShare}
                  className="flex flex-col items-center space-y-1"
                >
                  <div className="w-12 h-12 bg-[#1877F2] rounded-full flex items-center justify-center text-white">
                    <Facebook className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-gray-600">Facebook</span>
                </button>
                
                <button
                  onClick={handleLinkedinShare}
                  className="flex flex-col items-center space-y-1"
                >
                  <div className="w-12 h-12 bg-[#0A66C2] rounded-full flex items-center justify-center text-white">
                    <Linkedin className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-gray-600">LinkedIn</span>
                </button>
                
                <button
                  onClick={handleEmailShare}
                  className="flex flex-col items-center space-y-1"
                >
                  <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-white">
                    <Mail className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-gray-600">Email</span>
                </button>
              </div>
            </div>
            
            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Preview</h3>
              <p className="text-sm text-gray-600">{fullShareMessage}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};