import React, { useState } from 'react';
import { Video, Loader2, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { Button } from '../common/Button';
import { tavusService } from '../../services/tavusService';
import { useAuth } from '../../hooks/useAuth';
import type { Bill } from '../../types';

interface VideoBriefingGeneratorProps {
  bill?: Bill;
  onVideoGenerated?: (videoId: string) => void;
}

export const VideoBriefingGenerator: React.FC<VideoBriefingGeneratorProps> = ({
  bill,
  onVideoGenerated
}) => {
  const { authState } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [customScript, setCustomScript] = useState('');
  const [useCustomScript, setUseCustomScript] = useState(false);

  // Check if Tavus API is available
  const isTavusAvailable = tavusService.isAvailable();

  const handleGenerateVideo = async () => {
    if (!isTavusAvailable) {
      setError('Tavus API is not available. Please check your API key configuration.');
      return;
    }

    if (!bill && !useCustomScript) {
      setError('Please select a bill or use a custom script.');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setSuccess(null);

      let response;
      
      if (useCustomScript) {
        // Generate video with custom script
        response = await tavusService.generateVideo({
          replicaId: import.meta.env.VITE_TAVUS_REPLICA_ID || 'r6ca16dbe104',
          script: customScript,
          metadata: {
            type: 'custom_briefing'
          }
        });
      } else if (bill) {
        // Generate bill briefing
        response = await tavusService.generateBillBriefing(
          bill.id,
          bill.short_title || bill.title,
          bill.summary || 'No summary available',
          authState.user?.user_metadata?.full_name || 'there'
        );
      } else {
        throw new Error('Invalid generation parameters');
      }

      setSuccess(`Video generation initiated! Video ID: ${response.video_id}`);
      onVideoGenerated?.(response.video_id);
    } catch (error) {
      console.error('Error generating video:', error);
      setError(`Failed to generate video: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isTavusAvailable) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertTriangle className="w-6 h-6 text-yellow-500 mr-3 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 text-lg mb-2">Tavus API Not Configured</h3>
            <p className="text-yellow-700 mb-4">
              To enable personalized video briefings, please add your Tavus API key to your environment variables:
            </p>
            <div className="bg-yellow-100 p-3 rounded-md font-mono text-sm mb-4">
              VITE_TAVUS_API_KEY=your_tavus_api_key<br />
              VITE_TAVUS_REPLICA_ID=r6ca16dbe104
            </div>
            <p className="text-yellow-700">
              You can get your API key from the <a href="https://app.tavus.io/settings/api" target="_blank" rel="noopener noreferrer" className="text-yellow-800 underline">Tavus dashboard</a>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <Video className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900 text-lg">Generate Video Briefing</h3>
          <p className="text-gray-600 text-sm">Create a personalized video explanation from a policy expert</p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 bg-error-50 border border-error-200 rounded-lg p-4 flex items-center">
          <AlertTriangle className="w-5 h-5 text-error-500 mr-3 flex-shrink-0" />
          <p className="text-error-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-success-50 border border-success-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
          <p className="text-success-700">{success}</p>
        </div>
      )}

      {/* Bill Information */}
      {bill && !useCustomScript && (
        <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center mb-2">
            <FileText className="w-5 h-5 text-gray-500 mr-2" />
            <h4 className="font-medium text-gray-900">Bill Information</h4>
          </div>
          <p className="text-gray-700 font-medium mb-1">{bill.bill_type} {bill.number}: {bill.short_title || bill.title}</p>
          <p className="text-sm text-gray-600 line-clamp-3">{bill.summary || 'No summary available'}</p>
        </div>
      )}

      {/* Script Options */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <label className="flex items-center">
            <input
              type="radio"
              checked={!useCustomScript}
              onChange={() => setUseCustomScript(false)}
              className="mr-2"
              disabled={!bill}
            />
            <span className={`text-sm ${!bill ? 'text-gray-400' : 'text-gray-700'}`}>
              Use AI-generated script based on bill content
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={useCustomScript}
              onChange={() => setUseCustomScript(true)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Write custom script</span>
          </label>
        </div>

        {useCustomScript && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Script
            </label>
            <textarea
              value={customScript}
              onChange={(e) => setCustomScript(e.target.value)}
              placeholder="Write your custom script here..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[150px]"
              required={useCustomScript}
            />
            <p className="text-xs text-gray-500 mt-1">
              Write a natural-sounding script that our AI presenter will deliver. Keep it under 500 words for best results.
            </p>
          </div>
        )}
      </div>

      {/* Generation Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleGenerateVideo}
          disabled={isGenerating || (!bill && !useCustomScript) || (useCustomScript && !customScript.trim())}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Video...
            </>
          ) : (
            <>
              <Video className="w-4 h-4 mr-2" />
              Generate Video Briefing
            </>
          )}
        </Button>
      </div>
    </div>
  );
};