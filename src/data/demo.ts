import { Need, VolunteerProfile } from "../types";

// Demo needs for initial state / demo mode
export const DEMO_NEEDS: Need[] = [
  {
    id: `demo-need-1`,
    title: "Emergency Medical Support — BTM Layout",
    description: "Waterborne infection spike in slum clusters. Need 2+ nurses for triage and basic first-aid by this weekend.",
    category: "Medical",
    urgency: "High",
    location: "BTM Layout, Bengaluru",
    requiredSkills: ["Medical", "First Aid", "Crisis Management"],
    status: "Open",
    createdAt: new Date().toISOString()
  },
  {
    id: `demo-need-2`,
    title: "Water Transport Logistics — Koramangala",
    description: "Families relying on a single tanker every 2 days. Need logistics support to transport 500L of clean water daily.",
    category: "Logistics",
    urgency: "High",
    location: "Koramangala, Bengaluru",
    requiredSkills: ["Logistics", "Driving", "Water Purification"],
    status: "Open",
    createdAt: new Date().toISOString()
  },
  {
    id: `demo-need-3`,
    title: "Makeshift Classroom Setup — Jayanagar",
    description: "School building damaged. 50 children out of school. Need teachers or educators for a community hall setup.",
    category: "Education",
    urgency: "Medium",
    location: "Jayanagar, Bengaluru",
    requiredSkills: ["Education", "Childcare", "Counseling"],
    status: "Open",
    createdAt: new Date().toISOString()
  },
  {
    id: `demo-need-4`,
    title: "Food Kitchen Surge — Indiranagar",
    description: "Community kitchen turnout doubled to 800 meals/day. Critically short on ingredients and prep volunteers.",
    category: "Food/Water",
    urgency: "Medium",
    location: "Indiranagar, Bengaluru",
    requiredSkills: ["Food/Water", "Cooking", "Supply Chain"],
    status: "Open",
    createdAt: new Date().toISOString()
  }
];

// Demo volunteers for initial state / demo mode
export const DEMO_VOLUNTEERS: VolunteerProfile[] = [
  {
    id: "vol-aarav-sharma",
    name: "Aarav Sharma",
    skills: ["Medical", "First Aid", "Bilingual (HI/EN)", "Crisis Management"],
    location: "Koramangala, Bengaluru",
    availability: "High",
    organization: "Red Cross India",
    travelRadius: 15,
    status: "Available",
    availableUntil: new Date(Date.now() + 24 * 3600000).toISOString()
  },
  {
    id: "vol-priya-patel",
    name: "Priya Patel",
    skills: ["Logistics", "Heavy Machinery", "Driving", "Inventory"],
    location: "BTM Layout, Bengaluru",
    availability: "Medium",
    organization: "CRY India",
    travelRadius: 10,
    status: "Available",
    availableUntil: new Date(Date.now() + 12 * 3600000).toISOString()
  },
  {
    id: "vol-rohan-desai",
    name: "Rohan Desai",
    skills: ["Education", "Counseling", "Childcare"],
    location: "Jayanagar, Bengaluru",
    availability: "High",
    organization: "Teach for India",
    travelRadius: 8,
    status: "Available",
    availableUntil: new Date(Date.now() + 24 * 3600000).toISOString()
  },
  {
    id: "vol-ananya-singh",
    name: "Ananya Singh",
    skills: ["Food/Water", "Cooking", "Supply Chain", "Bilingual (HI/EN)"],
    location: "Indiranagar, Bengaluru",
    availability: "High",
    organization: "Akshaya Patra",
    travelRadius: 12,
    status: "Available",
    availableUntil: new Date(Date.now() + 24 * 3600000).toISOString()
  },
  {
    id: "vol-karan-gupta",
    name: "Karan Gupta",
    skills: ["Shelter", "Carpentry", "Electrical", "Engineering"],
    location: "BTM Layout, Bengaluru",
    availability: "Low",
    organization: "Habitat for Humanity",
    travelRadius: 10,
    status: "Available"
  },
  {
    id: "vol-shruti-joshi",
    name: "Shruti Joshi",
    skills: ["Water Purification", "Logistics", "Driving", "Organization"],
    location: "Jayanagar, Bengaluru",
    availability: "High",
    organization: "Red Cross India",
    travelRadius: 20,
    status: "Available",
    availableUntil: new Date(Date.now() + 8 * 3600000).toISOString()
  }
];

// Sample text inputs for the NgoDashboard
export const SAMPLE_TEXTS = [
  {
    id: 1,
    title: "Monsoon Relief — Bengaluru South",
    text: `Field Report - Bengaluru South (24th Oct):
We visited the temporary shelters in BTM Layout today. There's a severe shortage of clean drinking water; families are relying on a single BBMP tanker that comes every two days. We urgently need logistics support to transport at least 500 litres of water daily. Also, a local school building in Jayanagar was damaged by recent floods. Around 50 kids missed classes all week. Need teachers or volunteers to run makeshift classes in the community hall.

Note from Dr. Mehta - Community Clinic:
Seeing a spike in waterborne infections in the Koramangala slums. We are short-staffed. Need at least 2 nurses or medical volunteers with basic first-aid knowledge to help triage patients by this weekend. High priority.

New Volunteer Signup:
Name: Shruti Joshi
Location: Jayanagar, Bengaluru
Skills: Water Purification, Logistics, Driving, Organization
Availability: High

Name: Rahul Verma
Location: Koramangala, Bengaluru
Details: Registered nurse, willing to help locally. Very high availability right now.`
  },
  {
    id: 2,
    title: "Food Kitchen Surge — Indiranagar",
    text: `URGENT - Indiranagar Community Kitchen - Update:
Expected turnout for the week has doubled. We will serve approximately 800 hot meals daily. We are critically short on ingredients: we need 100 kg of rice, fresh vegetables, and cooking oil. Status: High Urgency. Need 5 volunteers for prep cooking and 10 to serve food. Category: Food/Water.

Logistics note:
We have a transit van available but lack a driver with a commercial license. Need at least 1 logistics volunteer immediately for BTM Layout distribution run.

New Volunteer:
Name: Divya Iyer
Location: Indiranagar, Bengaluru
Skills: Cooking, Food Handling, Kannada translation
Availability: Medium`
  },
  {
    id: 3,
    title: "Infrastructure Damage — Koramangala",
    text: `Community Report - Koramangala Block 7 (June 3):
Heavy rains have damaged 3 apartment stairwells and the community generator is malfunctioning, affecting medical refrigeration at the local health centre. We urgently need an electrician or someone with mechanical skills to repair it ASAP. Category: Shelter. Priority: High.

Also need temporary shelter kits for 12 displaced families in BTM Layout who lost their ground-floor units to flooding.

Volunteer Check-in:
Name: Karan Gupta
Location: BTM Layout, Bengaluru
Skills: Electrical, Generators, Carpentry, Engineering
Availability: High

Name: Meera Nair
Location: Koramangala, Bengaluru
Skills: Medical, First Aid, Community Outreach
Availability: Medium`
  }
];
