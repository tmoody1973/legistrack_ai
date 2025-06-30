import React from 'react';
import { Phone, Mail, Globe, MapPin, Users, ExternalLink, BarChart3 } from 'lucide-react';
import { Button } from '../common/Button';
import type { Representative } from '../../types';

interface RepresentativeCardProps {
  representative: Representative;
  onContact?: (rep: Representative) => void;
  onClick?: () => void;
}

export const RepresentativeCard: React.FC<RepresentativeCardProps> = ({
  representative,
  onContact,
  onClick,
}) => {
  const getPartyColor = (party: string) => {
    switch (party.toUpperCase()) {
      case 'D':
        return 'bg-blue-100 text-blue-700';
      case 'R':
        return 'bg-red-100 text-red-700';
      case 'I':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPartyFullName = (party: string) => {
    switch (party.toUpperCase()) {
      case 'D':
        return 'Democratic';
      case 'R':
        return 'Republican';
      case 'I':
        return 'Independent';
      default:
        return party;
    }
  };

  const getChamberTitle = (chamber: string) => {
    return chamber === 'house' ? 'Representative' : 'Senator';
  };

  return (
    <div 
      className="bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start space-x-4 mb-6">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
            {representative.photo_url ? (
              <img
                src={representative.photo_url}
                alt={representative.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Users className="w-8 h-8 text-gray-400" />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              {getChamberTitle(representative.chamber)} {representative.full_name}
            </h3>
            <div className="flex items-center space-x-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPartyColor(representative.party)}`}>
                {getPartyFullName(representative.party)}
              </span>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                {representative.state}
                {representative.district && ` District ${representative.district}`}
              </div>
            </div>
            <p className="text-sm text-gray-600 capitalize">
              {representative.chamber === 'house' ? 'House of Representatives' : 'U.S. Senate'}
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-3 mb-6">
          {representative.contact_info?.office && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-3 text-gray-400" />
              <span>{representative.contact_info.office}</span>
            </div>
          )}
          
          {representative.contact_info?.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-4 h-4 mr-3 text-gray-400" />
              <a
                href={`tel:${representative.contact_info.phone}`}
                className="hover:text-primary-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {representative.contact_info.phone}
              </a>
            </div>
          )}
          
          {representative.contact_info?.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-4 h-4 mr-3 text-gray-400" />
              <a
                href={`mailto:${representative.contact_info.email}`}
                className="hover:text-primary-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {representative.contact_info.email}
              </a>
            </div>
          )}
          
          {representative.contact_info?.website && (
            <div className="flex items-center text-sm text-gray-600">
              <Globe className="w-4 h-4 mr-3 text-gray-400" />
              <a
                href={representative.contact_info.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Official Website
              </a>
            </div>
          )}
        </div>

        {/* Voting Record Summary */}
        {representative.voting_record && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-primary-500" />
              Voting Record
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Votes:</span>
                <span className="font-medium ml-2">{representative.voting_record.totalVotes}</span>
              </div>
              <div>
                <span className="text-gray-600">Missed Votes:</span>
                <span className="font-medium ml-2">{representative.voting_record.missedVotes}</span>
              </div>
              {representative.voting_record.partyUnity && (
                <div className="col-span-2">
                  <span className="text-gray-600">Party Unity:</span>
                  <span className="font-medium ml-2">{representative.voting_record.partyUnity}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onContact?.(representative);
            }}
            className="flex-1"
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact
          </Button>
          
          {representative.govtrack_url && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={representative.govtrack_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Record
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};