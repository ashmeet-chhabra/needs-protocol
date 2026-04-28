import { Need, MatchResult, VolunteerProfile, AIPrediction } from "../types";
import { apiFetch, fetchWithTimeout, handleApiError } from "../utils/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Extract structured needs and volunteers from raw community text.
 * Calls the secure backend proxy — API key stays server-side.
 */
export async function extractDataFromText(rawText: string): Promise<{ needs: Omit<Need, 'id' | 'status'>[], volunteers: VolunteerProfile[] }> {
  try {
    return await apiFetch(`${API_BASE}/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText }),
    });
  } catch (err: any) {
    throw new Error(err.message || "Failed to extract data. Please check your connection.");
  }
}

/**
 * Extract text from an uploaded document image via OCR.
 */
export async function extractTextFromImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const data = await apiFetch(`${API_BASE}/api/ocr`, {
      method: "POST",
      body: formData,
    });
    return data.text || "";
  } catch (err: any) {
    throw new Error(err.message || "Failed to process image. Please try another file.");
  }
}

/**
 * Match a volunteer against open needs using AI scoring.
 */
export async function matchVolunteerToNeeds(
  volunteer: VolunteerProfile,
  needs: Need[]
): Promise<MatchResult[]> {
  try {
    return await apiFetch(`${API_BASE}/api/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volunteer, needs }),
    });
  } catch (err: any) {
    throw new Error(err.message || "Failed to match volunteer. Please try again.");
  }
}

/**
 * Get AI predictions for upcoming community needs based on historical data.
 * This is the "data-driven" historical analysis feature.
 */
export async function getPredictions(
  historicalNeeds: Need[],
  currentNeeds: Need[],
  volunteers: VolunteerProfile[]
): Promise<{ predictions: AIPrediction[], summary: string }> {
  try {
    return await apiFetch(`${API_BASE}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historicalNeeds, currentNeeds, volunteers }),
    });
  } catch (err: any) {
    throw new Error(err.message || "Failed to generate predictions. Please try again.");
  }
}

/**
 * Run a global optimization draft.
 * Assigns multiple volunteers to multiple needs in one smart batch.
 */
export async function optimizeAssignments(
  needs: Need[],
  volunteers: VolunteerProfile[]
): Promise<Record<string, string>> {
  try {
    const data = await apiFetch(`${API_BASE}/api/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ needs, volunteers }),
    });
    return data.assignments || {};
  } catch (err: any) {
    throw new Error(err.message || "Failed to optimize assignments. Please try again.");
  }
}
