import { VolunteerProfile } from "../types";

/**
 * Filter volunteers to only those available for new assignments
 */
export function getAvailableVolunteers(volunteers: VolunteerProfile[]): VolunteerProfile[] {
  return volunteers.filter(v => !v.status || v.status === "Available");
}

/**
 * Format time remaining until a volunteer's availability expires
 */
export function formatTimeRemaining(endTime: string | undefined): string {
  if (!endTime) return "24h default";
  
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
}

/**
 * Remove duplicates from a list of volunteers based on their name
 */
export function deduplicateVolunteers(volunteers: VolunteerProfile[]): VolunteerProfile[] {
  const seen = new Map<string, VolunteerProfile>();
  volunteers.forEach(v => {
    if (!seen.has(v.name)) {
      seen.set(v.name, v);
    }
  });
  return Array.from(seen.values());
}
