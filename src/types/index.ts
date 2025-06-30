// Core application types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  preferences: UserPreferences;
  profile: UserProfile;
}

export interface UserPreferences {
  notifications: {
    frequency: 'immediate' | 'daily' | 'weekly' | 'never';
    email: boolean;
    push: boolean;
  };
  interests: string[];
  location: {
    state?: string;
    district?: number;
    zipCode?: string;
  };
  contentTypes: ('text' | 'audio' | 'video')[];
}

export interface UserProfile {
  demographics: {
    ageGroup?: string;
    occupation?: string;
  };
  civicEngagement: {
    votingFrequency?: string;
    organizationMemberships: string[];
    issueAdvocacy: string[];
  };
}

// Bill types
export interface Bill {
  id: string;
  congress: number;
  bill_type: string;
  number: number;
  title: string;
  short_title?: string;
  introduced_date?: string;
  status?: string;
  latest_action: BillAction;
  summary?: string;
  ai_analysis?: AIAnalysis;
  sponsors: Sponsor[];
  cosponsors_count: number;
  committees: Committee[];
  subjects: string[];
  policy_area?: string; // NEW: Added policy area
  congress_url?: string;
  govtrack_url?: string;
  voting_data: VotingData;
  created_at: string;
  updated_at: string;
  last_synced?: string;
  full_text_url?: string;
  full_text_content?: string; // NEW: Added full text content
  podcast_overview?: string; // NEW: Added podcast overview field
  comprehensive_analysis?: any; // NEW: Added comprehensive analysis field
}

// NEW: Subject type for bill subjects
export interface BillSubject {
  id: string;
  name: string;
  type: 'legislative' | 'policy';
  count?: number;
  updateDate?: string;
}

export interface BillAction {
  date?: string;
  text?: string;
  actionCode?: string;
}

export interface AIAnalysis {
  generated_at?: string;
  summary?: string;
  keyProvisions: string[];
  impactAssessment: {
    economic?: string;
    social?: string;
    regional?: string;
    demographic?: string;
  };
  passagePrediction: {
    probability?: number;
    reasoning?: string;
    keyFactors: string[];
    timeline?: string;
  };
}

export interface Sponsor {
  bioguide_id: string;
  full_name: string;
  party: string;
  state: string;
  district?: number;
}

export interface Committee {
  name: string;
  chamber: 'house' | 'senate';
  url?: string;
}

export interface VotingData {
  votes: Vote[];
  vote_count: number;
  last_vote_date?: string;
  passage_probability?: number;
}

export interface Vote {
  id: number;
  govtrack_vote_id: number;
  congress: number;
  chamber: 'house' | 'senate';
  question: string;
  created: string;
  result: string;
  total_votes: number;
  total_plus: number;
  total_minus: number;
  total_other: number;
  govtrack_url?: string;
}

// Representative types
export interface Representative {
  bioguide_id: string;
  full_name: string;
  party: string;
  state: string;
  district?: number;
  chamber: 'house' | 'senate';
  contact_info: ContactInfo;
  voting_record: VotingRecord;
  govtrack_id?: number;
  photo_url?: string;
  is_active: boolean;
}

export interface ContactInfo {
  office?: string;
  phone?: string;
  email?: string;
  website?: string;
  socialMedia: {
    twitter?: string;
    facebook?: string;
  };
}

export interface VotingRecord {
  totalVotes: number;
  missedVotes: number;
  partyUnity?: number;
  recentPositions: VotePosition[];
}

export interface VotePosition {
  vote_id: number;
  bill_id?: string;
  option: string;
  option_text: string;
  date: string;
  question: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Search and filter types
export interface BillSearchParams {
  query?: string;
  congress?: number;
  bill_type?: string;
  status?: string;
  sponsor_state?: string;
  sponsor_party?: string;
  subjects?: string[]; // NEW: Added subjects array for filtering
  introduced_after?: string;
  introduced_before?: string;
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'date' | 'title' | 'status';
  order?: 'asc' | 'desc';
}

// Auth types
export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  full_name: string;
}