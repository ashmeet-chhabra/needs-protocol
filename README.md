<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Needs Protocol

**Real-time Resource Allocation Platform for Crisis Response**

> Google Solution Challenge 2026 India — Built with Gemini AI, Firebase, React, and Express

## What It Does

Needs Protocol is a coordination tool for disaster response and humanitarian work. It helps organizations:
- **Process field data** quickly: Paste raw text or upload photos of field reports → AI extracts structured needs and volunteer information
- **Match resources efficiently**: Assign available volunteers to open needs based on skills, location, and urgency
- **Allocate optimally**: Use global optimization to find the best assignment for all needs at once, not sequentially
- **Track and analyze**: Monitor resource allocation patterns, identify skill gaps, and forecast upcoming needs

The core problem it solves: in crisis situations, the challenge is rarely a lack of resources, but *misallocation*. This tool ensures volunteers with the right skills get to where they're needed most.

### How It Works
1. **Field Data Processing** — Paste field reports or scan documents → Gemini AI extracts What, Where, and Urgency
2. **Smart Matching** — Match individual volunteers to needs with AI scoring based on skills, location, and availability
3. **Resource Draft** — Run global optimization to assign all available volunteers to open needs simultaneously
4. **Analytics** — View resource hotspots, skill gaps, trends, and what's still needed

### Technical Stack
- **Gemini AI** (gemini-2.5-flash) — Text/OCR extraction, skill matching, global optimization, trend analysis
- **Firebase Firestore** — Real-time data persistence with live sync across all coordinators
- **React 19** — Responsive UI with three role-based dashboards (Organization, Volunteer, Analytics)
- **Express.js** — Backend proxy for Gemini API (secure, api-key never exposed to client)

## Architecture

```
React Frontend  →  Express Backend  →  Gemini AI
       ↕                  ↕
  Firebase Firestore (persistence + real-time sync)
```

## Getting Started

**Prerequisites:** Node.js 18+, Gemini API key

1. **Clone and install:**
   ```bash
   git clone <repo>
   cd needs-protocol
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key to `.env`:
   ```
   GEMINI_API_KEY=your-key-here
   ```

3. **Cloud persistence is pre-configured**
   - Firebase config is already in `.env` (VITE_FIREBASE_* variables)
   - If you remove those variables, the app automatically falls back to local-only mode
   - To use a different Firebase project, replace the `VITE_FIREBASE_*` values in `.env`

4. **Start the app:**
   ```bash
   npm run dev:full
   ```
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## Features

### Organization Coordinator Dashboard
- **Field Data Processing**: Upload text or OCR scan photos → AI extracts structured needs and volunteer profiles
  - Paste raw field reports, surveys, or requirements lists
  - Upload handwritten or printed documents for automatic OCR extraction
  - AI identifies needs, locations, urgency levels, and required skills
- **Smart Matching**: Score individual volunteers against needs (skill fit, location, availability)
- **Resource Draft**: Global optimization to assign all volunteers to open needs at once
- **Status Tracking**: Monitor which needs are open, assigned, in progress, or completed
- **Needs Heatmap**: Visualize geographic distribution of needs and volunteer coverage by location
  - Shows "balanced", "strained", or "critical" status for each zone
  - Identifies geographic hotspots requiring urgent attention
  - Displays coverage ratio: volunteers vs open needs per location

### Volunteer Portal
- **Dashboard View**: See all available needs you could help with
- **Assignments**: View needs you've been matched to by coordinators
- **Accept/Decline**: Manage your workload and availability
- **Details**: Understand what's needed, where, why you were matched, and urgency level
- **Profile Management**: Update your skills, availability, and travel radius

### Analytics Dashboard
- **Resource Overview**: Real-time counts of open needs, in-pipeline work, resolved tasks, and available volunteers
- **Skill Gap Analysis**: Identify which skills are scarce vs abundant across all volunteers
- **Category Breakdown**: See trends in which types of needs (Medical, Logistics, Education, etc.) are rising
- **Location Hotspots**: Identify the top 3 geographic areas with the highest open needs
- **Historical Data**: Load past resolved needs for pattern analysis and forecasting
- **AI Predictions**: Generate forecasts of upcoming needs based on historical patterns and current trends

## How the Optimization Works

The **Resource Draft** feature uses global optimization (not simple greedy matching):
- Considers all needs and all available volunteers together
- Prioritizes CRITICAL urgency needs first
- Assigns each volunteer to at most one need
- Respects skill requirements (unless urgency overrides)
- Avoids wasting specialized skills on low-complexity tasks
- Returns percentage coverage: e.g., "7 / 10 needs assigned using 6 volunteers"

This is fundamentally different from running the matcher sequentially—it finds the best overall assignment combination, not just locally optimal matches.

## Data Resilience & Deduplication

Needs Protocol is designed to be resilient, even with manual data entry and repeated extractions:

### Volunteer Deduplication
- Volunteers are matched by name + location (case-insensitive)
- Extracting the same volunteer multiple times won't create duplicates
- Reuses existing volunteer IDs when possible to maintain historical continuity
- Firebase sync automatically deduplicates across coordinators

### Smart State Merging
- Firebase sync merges remote data with local unsaved changes (never overwrites)
- Recently written items are protected from immediate re-sync conflicts
- All state changes are persistent to Firebase (when configured) and tracked in real-time

### Demo Mode
- Click **"Initialize Demo State"** to load 6 pre-configured volunteers and 4 sample needs
- Clicking multiple times is safe—the system detects existing demo data and doesn't duplicate
- Perfect for testing features without Firebase configuration

## Modes of Operation

### Cloud-Connected with Firebase (Primary - Currently Active)
- Real-time sync across all coordinators accessing the same project
- Persistent data stored in Firestore with server timestamps
- Multi-coordinator workflows with automatic conflict resolution
- Firebase config is in `.env` and active by default
- Data is synced in real-time when changes are made

### Local-Only Mode (Fallback)
- Automatically activates if Firebase config is missing or initialization fails
- Data stored only in browser's local React state
- Perfect for offline development or testing without cloud setup
- Data persists during the session but is lost on page refresh
- To enable: Remove or clear `VITE_FIREBASE_*` variables from `.env` and restart
