import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const configuredOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...configuredOrigins,
]);

app.use(cors({
  origin(origin, callback) {
    // Allow server-to-server tools and local dev frontends.
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.options("*", cors());
app.use(express.json({ limit: "5mb" }));

// --- Gemini Configuration ---
const MODEL_NAME = "gemini-2.5-flash"; // Updated to user requested version
let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not set in environment");
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

type OptimizeNeed = {
  id: string;
  title: string;
  description: string;
  urgency: "High" | "Medium" | "Low";
  category: string;
  location: string;
  requiredSkills: string[];
};

type OptimizeVolunteer = {
  name: string;
  skills: string[];
  location: string;
  travelRadius?: number;
  availability?: string;
};

type CandidateEdge = {
  volunteerIndex: number;
  score: number;
};

type AllocationState = {
  assignedCount: number;
  priorityScore: number;
  totalScore: number;
  assignments: number[];
};

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeList(values: string[]): string[] {
  return values.map(normalizeToken).filter(Boolean);
}

function getOverlapCount(needSkills: string[], volunteerSkills: string[]): number {
  const volunteerSet = new Set(normalizeList(volunteerSkills));
  return normalizeList(needSkills).filter((skill) => volunteerSet.has(skill)).length;
}

function getUrgencyWeight(urgency: OptimizeNeed["urgency"]): number {
  switch (urgency) {
    case "High":
      return 3;
    case "Medium":
      return 2;
    default:
      return 1;
  }
}

function getAvailabilityWeight(availability?: string): number {
  switch (availability) {
    case "High":
      return 10;
    case "Medium":
      return 6;
    case "Low":
      return 2;
    default:
      return 4;
  }
}

function getLocationScore(needLocation: string, volunteerLocation: string): number {
  const needParts = needLocation.split(",").map(normalizeToken).filter(Boolean);
  const volunteerParts = volunteerLocation.split(",").map(normalizeToken).filter(Boolean);

  const needZone = needParts[0] || "";
  const volunteerZone = volunteerParts[0] || "";
  const needCity = needParts[1] || needZone;
  const volunteerCity = volunteerParts[1] || volunteerZone;

  if (needZone && volunteerZone && needZone === volunteerZone) return 14;
  if (needCity && volunteerCity && needCity === volunteerCity) return 8;
  return 0;
}

function buildCandidateScore(need: OptimizeNeed, volunteer: OptimizeVolunteer): number | null {
  const overlapCount = getOverlapCount(need.requiredSkills, volunteer.skills);
  const isUrgentFallback = need.urgency === "High";

  if (overlapCount === 0 && !isUrgentFallback) {
    return null;
  }

  const requiredCount = Math.max(1, need.requiredSkills.length);
  const skillCoverage = overlapCount / requiredCount;
  let score = overlapCount > 0 ? 48 + skillCoverage * 28 : 26;

  score += getLocationScore(need.location, volunteer.location);
  score += getAvailabilityWeight(volunteer.availability);
  score += need.urgency === "High" ? 8 : need.urgency === "Medium" ? 4 : 0;

  if (volunteer.travelRadius !== undefined && getLocationScore(need.location, volunteer.location) === 0) {
    score -= 4;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function compareAllocation(a: AllocationState, b: AllocationState): number {
  if (a.assignedCount !== b.assignedCount) return a.assignedCount - b.assignedCount;
  if (a.priorityScore !== b.priorityScore) return a.priorityScore - b.priorityScore;
  if (a.totalScore !== b.totalScore) return a.totalScore - b.totalScore;
  return 0;
}

function optimizeAssignmentsGlobally(
  needs: OptimizeNeed[],
  volunteers: OptimizeVolunteer[]
): Record<string, string> {
  const candidatesByNeed: CandidateEdge[][] = needs.map((need) =>
    volunteers
      .map((volunteer, volunteerIndex) => {
        const score = buildCandidateScore(need, volunteer);
        return score === null ? null : { volunteerIndex, score };
      })
      .filter((candidate): candidate is CandidateEdge => candidate !== null)
      .sort((a, b) => b.score - a.score)
  );

  const volunteerFlexibility = volunteers.map((_, volunteerIndex) =>
    candidatesByNeed.reduce((count, candidates) => (
      count + (candidates.some((candidate) => candidate.volunteerIndex === volunteerIndex) ? 1 : 0)
    ), 0)
  );

  const orderedNeedIndexes = needs
    .map((need, index) => ({
      index,
      urgencyWeight: getUrgencyWeight(need.urgency),
      candidateCount: candidatesByNeed[index].length,
      skillCount: need.requiredSkills.length,
    }))
    .sort((a, b) => {
      if (b.urgencyWeight !== a.urgencyWeight) return b.urgencyWeight - a.urgencyWeight;
      if (a.candidateCount !== b.candidateCount) return a.candidateCount - b.candidateCount;
      return b.skillCount - a.skillCount;
    })
    .map((entry) => entry.index);

  if (volunteers.length <= 18) {
    const memo = new Map<string, AllocationState>();

    const dfs = (position: number, usedMask: bigint): AllocationState => {
      if (position >= orderedNeedIndexes.length) {
        return {
          assignedCount: 0,
          priorityScore: 0,
          totalScore: 0,
          assignments: Array(needs.length).fill(-1),
        };
      }

      const key = `${position}:${usedMask.toString()}`;
      const cached = memo.get(key);
      if (cached) return cached;

      const needIndex = orderedNeedIndexes[position];
      let best = dfs(position + 1, usedMask);

      for (const candidate of candidatesByNeed[needIndex]) {
        const bit = 1n << BigInt(candidate.volunteerIndex);
        if ((usedMask & bit) !== 0n) continue;

        const next = dfs(position + 1, usedMask | bit);
        const candidateState: AllocationState = {
          assignedCount: next.assignedCount + 1,
          priorityScore: next.priorityScore + getUrgencyWeight(needs[needIndex].urgency),
          totalScore: next.totalScore + candidate.score,
          assignments: [...next.assignments],
        };

        candidateState.assignments[needIndex] = candidate.volunteerIndex;

        if (compareAllocation(candidateState, best) > 0) {
          best = candidateState;
        }
      }

      memo.set(key, best);
      return best;
    };

    const best = dfs(0, 0n);
    return Object.fromEntries(
      best.assignments
        .map((volunteerIndex, needIndex) => (
          volunteerIndex >= 0 ? [needs[needIndex].id, volunteers[volunteerIndex].name] : null
        ))
        .filter((entry): entry is [string, string] => entry !== null)
    );
  }

  // Improved heuristic for larger datasets that approximates global optimization
  // This algorithm considers opportunity cost and global impact, not just local match quality
  
  const assignments: Record<string, string> = {};
  const usedVolunteers = new Set<number>();
  
  // Calculate volunteer uniqueness scores (how many needs can only this volunteer satisfy?)
  const volunteerUniqueness = volunteers.map((_, volIndex) => {
    let uniqueCount = 0;
    let criticalUniqueCount = 0;
    
    for (let needIndex = 0; needIndex < needs.length; needIndex++) {
      const candidates = candidatesByNeed[needIndex];
      const isOnlyCandidate = candidates.length === 1 && candidates[0].volunteerIndex === volIndex;
      const isBestCandidate = candidates.length > 0 && candidates[0].volunteerIndex === volIndex;
      
      if (isOnlyCandidate) {
        uniqueCount++;
        if (needs[needIndex].urgency === "High") {
          criticalUniqueCount++;
        }
      } else if (isBestCandidate) {
        // Count as partial uniqueness
        uniqueCount += 0.3;
      }
    }
    
    return { uniqueCount, criticalUniqueCount };
  });
  
  // Main assignment loop with opportunity cost consideration
  for (const needIndex of orderedNeedIndexes) {
    const candidates = candidatesByNeed[needIndex]
      .filter((candidate) => !usedVolunteers.has(candidate.volunteerIndex));
    
    if (candidates.length === 0) continue;
    
    // Score candidates considering both match quality AND opportunity cost
    const scoredCandidates = candidates.map(candidate => {
      const uniqueness = volunteerUniqueness[candidate.volunteerIndex];
      const needUrgencyWeight = getUrgencyWeight(needs[needIndex].urgency);
      
      // Opportunity cost: how much would we lose by NOT using this volunteer for other needs?
      const opportunityCost = uniqueness.uniqueCount * 0.8 + uniqueness.criticalUniqueCount * 1.5;
      
      // Global score = match quality + urgency - opportunity cost
      // We want to assign volunteers who are good fits but not critically needed elsewhere
      const globalScore = candidate.score + (needUrgencyWeight * 5) - (opportunityCost * 2);
      
      return { ...candidate, globalScore };
    });
    
    // Sort by global score (best overall impact)
    const bestCandidate = scoredCandidates.sort((a, b) => b.globalScore - a.globalScore)[0];
    
    usedVolunteers.add(bestCandidate.volunteerIndex);
    assignments[needs[needIndex].id] = volunteers[bestCandidate.volunteerIndex].name;
  }
  
  return assignments;
}

// --- Health Check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Extract Needs + Volunteers from raw text ---
app.post("/api/extract", async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText?.trim()) return res.status(400).json({ error: "rawText is required" });

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze the following raw community survey data, field notes, or intake forms. 
Extract any specific community needs discussed AND extract any volunteer profiles mentioned.
If the text only contains needs, return them and an empty array for volunteers. If it only contains volunteers, return them and an empty array for needs.

Raw Data:
${rawText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            needs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "A short, descriptive title for the need." },
                  location: { type: Type.STRING, description: "The location/area where this need requires attention." },
                  category: { type: Type.STRING, description: "Must be one of: Medical, Education, Logistics, Food/Water, Shelter, Other." },
                  urgency: { type: Type.STRING, description: "Must be one of: High, Medium, Low." },
                  requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "e.g., 'First Aid', 'Driving', 'Teaching'." },
                  description: { type: Type.STRING, description: "Detailed description of the need." },
                },
                required: ["title", "location", "category", "urgency", "requiredSkills", "description"],
              },
            },
            volunteers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the volunteer." },
                  location: { type: Type.STRING, description: "Where the volunteer is located or willing to work." },
                  skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Skills possessed by the volunteer." },
                  availability: { type: Type.STRING, description: "Must be one of: High, Medium, Low." },
                  organization: { type: Type.STRING, description: "Name of the NGO or organization they belong to, if mentioned." },
                  estimatedHoursAvailable: { type: Type.NUMBER, description: "How many hours they are available for (e.g. 48 for 2 days). Default to 24 if not specified." },
                },
                required: ["name", "location", "skills", "availability"],
              },
            }
          },
          required: ["needs", "volunteers"],
        },
      },
    });

    const text = response.text || '{"needs":[],"volunteers":[]}';
    res.json(JSON.parse(text));
  } catch (err: any) {
    console.error("Extract error:", err.message);
    res.status(500).json({ error: err.message || "Failed to extract data" });
  }
});

// --- OCR: Extract text from uploaded image ---
app.post("/api/ocr", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const ai = getAI();
    const base64Data = file.buffer.toString("base64");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          text: "Extract all text from this document accurately. Preserve formatting where it makes sense, but output plain text. Do not add any markdown formatting like ``` or 'Text from document:'. Just return the raw text."
        },
        {
          inlineData: {
            mimeType: file.mimetype,
            data: base64Data
          }
        }
      ]
    });

    res.json({ text: response.text?.trim() || "" });
  } catch (err: any) {
    console.error("OCR error:", err.message);
    res.status(500).json({ error: err.message || "Failed to process image" });
  }
});

// --- Volunteer-to-Needs matching ---
app.post("/api/match", async (req, res) => {
  try {
    const { volunteer, needs } = req.body;
    if (!volunteer || !needs?.length) return res.status(400).json({ error: "volunteer and needs are required" });

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Our core philosophy is to solve for improper allocation, ensuring surplus resources in some areas can quickly cover deficits in others.
I have a volunteer profile and a list of active community needs. 
Please evaluate how well the volunteer matches EACH need. Return a matching score (0-100) and a brief sentence explaining why they are a good fit.

CRITICAL ALLOCATION RULES:
1. Base your score primarily on skills match.
2. For location: if the need is in the volunteer's base zone, increase the score.
3. Cross-Zone Allocation: If the volunteer has the right skills, but is in a different zone/location, STILL GIVE THEM A RELATIVELY HIGH SCORE (e.g. 70-85) IF the need's urgency is "High". We want to route surplus capacity to high-need deficit zones. Explicitly state in the reasoning if this is a cross-zone deployment.
4. If a Volunteer provides a 'travelRadius', take that into consideration. High score if within limit, drastically lower if the location seems far beyond that limit. If no radius is provided, assume cross-zone deployment is acceptable for high priority tasks.

Volunteer Profile:
${JSON.stringify(volunteer, null, 2)}

Active Needs:
${JSON.stringify(needs, null, 2)}
`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              needId: { type: Type.STRING, description: "The ID of the need evaluated." },
              matchScore: { type: Type.NUMBER, description: "Score from 0 to 100 representing how good of a fit the volunteer is for this need." },
              reasoning: { type: Type.STRING, description: "A 1-2 sentence explanation of why this score was given." },
              isCrossZone: { type: Type.BOOLEAN, description: "True if this match involves routing a volunteer to a need outside their base location." }
            },
            required: ["needId", "matchScore", "reasoning", "isCrossZone"],
          },
        },
      },
    });

    const text = response.text || "[]";
    res.json(JSON.parse(text));
  } catch (err: any) {
    console.error("Match error:", err.message);
    res.status(500).json({ error: err.message || "Failed to generate matches" });
  }
});

// --- AI Prediction: Predict upcoming needs from historical data ---
app.post("/api/predict", async (req, res) => {
  try {
    const { historicalNeeds, currentNeeds, volunteers } = req.body;

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `You are an analyst for a community resource allocation system. Based on the historical pattern of community needs and current volunteer availability, predict what needs are likely to emerge in the next 1-2 weeks.

Our philosophy: We solve for IMPROPER ALLOCATION, not lack of resources. Identify where surpluses exist and where deficits are forming.

Historical Needs (resolved and current):
${JSON.stringify(historicalNeeds || [], null, 2)}

Current Open Needs:
${JSON.stringify(currentNeeds || [], null, 2)}

Available Volunteers:
${JSON.stringify(volunteers || [], null, 2)}

Analyze patterns in:
1. Location clustering — which areas repeatedly have needs?
2. Category trends — are medical needs increasing? Is food/water seasonal?
3. Urgency escalation — do medium-priority needs in certain areas tend to become high-priority?
4. Resource gaps — which locations/skills have chronic volunteer shortages?

Return 3-5 actionable predictions.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  location: { type: Type.STRING, description: "The area where this need is predicted." },
                  predictedCategory: { type: Type.STRING, description: "Expected category: Medical, Education, Logistics, Food/Water, Shelter, Other." },
                  predictedUrgency: { type: Type.STRING, description: "Expected urgency: High, Medium, Low." },
                  confidence: { type: Type.NUMBER, description: "Confidence level 0-100." },
                  reasoning: { type: Type.STRING, description: "2-3 sentence explanation of why this prediction is made, referencing historical patterns." },
                },
                required: ["location", "predictedCategory", "predictedUrgency", "confidence", "reasoning"],
              },
            },
            summary: {
              type: Type.STRING,
              description: "A 2-3 sentence executive summary of the overall trend and key recommendation."
            }
          },
          required: ["predictions", "summary"],
        },
      },
    });

    const text = response.text || '{"predictions":[],"summary":"Insufficient data for predictions."}';
    res.json(JSON.parse(text));
  } catch (err: any) {
    console.error("Predict error:", err.message);
    res.status(500).json({ error: err.message || "Failed to generate predictions" });
  }
});

// --- Optimization Endpoint (Many-to-Many) ---
app.post("/api/optimize", async (req, res) => {
  try {
    const { needs, volunteers } = req.body as { needs?: OptimizeNeed[]; volunteers?: OptimizeVolunteer[] };
    if (!Array.isArray(needs) || !Array.isArray(volunteers)) {
      return res.status(400).json({ error: "needs and volunteers arrays are required" });
    }

    const assignments = optimizeAssignmentsGlobally(needs, volunteers);

    res.json({ assignments });
  } catch (error) {
    console.error("Optimization error:", error);
    res.status(500).json({ error: "Failed to optimize assignments" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Needs Protocol API server running on http://localhost:${PORT}`);
});
