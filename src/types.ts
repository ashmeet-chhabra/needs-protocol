export interface Need {
  id: string;
  title: string;
  location: string;
  category: "Medical" | "Education" | "Logistics" | "Food/Water" | "Shelter" | "Other";
  urgency: "High" | "Medium" | "Low";
  requiredSkills: string[];
  description: string;
  status: "Open" | "Matched" | "Completed" | "In Progress" | "Fulfilled";
  assignedTo?: string; // name of the volunteer assigned
  createdAt?: string; // ISO timestamp for historical tracking
  resolvedAt?: string; // ISO timestamp when completed/fulfilled
}

export interface VolunteerProfile {
  id?: string;
  name: string;
  location: string;
  skills: string[];
  availability: string;
  organization?: string; // name of their NGO/org
  status?: "Available" | "On Mission" | "Inactive";
  availableUntil?: string; // ISO timestamp
  travelRadius?: number; // Distance they are willing to travel in km
  joinedAt?: string; // ISO timestamp
}

// Volunteer data extracted from AI (includes temp field for hours available)
export interface ExtractedVolunteerData extends VolunteerProfile {
  estimatedHoursAvailable?: number; // Hours they're available (from AI extraction)
}

export interface MatchResult {
  needId: string;
  matchScore: number; // 0-100
  reasoning: string;
  isCrossZone?: boolean;
}

export interface HistoricalSnapshot {
  timestamp: string;
  totalNeeds: number;
  openNeeds: number;
  resolvedNeeds: number;
  avgResolutionTimeHours: number;
  categoryBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
  volunteerCount: number;
}

export interface AIPrediction {
  location: string;
  predictedCategory: string;
  predictedUrgency: string;
  confidence: number;
  reasoning: string;
}
