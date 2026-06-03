# World Cup 2026 iOS Widget

An iOS widget that tracks the 2026 FIFA World Cup. It provides real-time updates on upcoming matches, tournament progress, and live scores directly on your home screen.

## Overview

This repository provides the frontend **Scriptable Widget (`widget.js`)** that renders the widget UI on iOS. To optimize performance and battery life, the widget relies on a lightweight Cloudflare Worker backend (code provided below) that fetches the schedule and merges it with real-time scores.

## Features
- **Live Scores**: Automatically updates ongoing matches.
- **Auto-Phase Detection**: Identifies the current tournament phase (Group Stage, Round of 32, Final, etc.) and tracks overall progress.
- **Responsive Layouts**: Supports Small, Medium, and Large iOS widget sizes.
- **Minimalist UI**: Clean, dark-mode optimized design with a subtle gradient background.

## Installation Guide

To run this widget on your device, you need to configure the Scriptable app and deploy a simple backend worker.

### 1. Deploy the Backend (Cloudflare Worker)
1. Log in or sign up at [Cloudflare Workers](https://workers.cloudflare.com/).
2. Create a new Worker (e.g., `wc26-worker`).
3. Replace the default code with the worker code provided in the dropdown below:

<details>
<summary><b>👉 Click here to reveal the Cloudflare Worker Code</b></summary>

```javascript
// World Cup 2026 Widget — Cloudflare Worker
// Data: openfootball (public domain, no API key)
// Live: worldcup26.ir (δωρεάν demo endpoint)

const WC_JSON_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const LIVE_API_URL = "https://worldcup26.ir/get/games";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=120", // cache 2 λεπτά για να ανανεώνεται συχνά
};

// ── Flag emoji map ────────────────────────────────────────
const FLAGS = {
  "Mexico": "🇲🇽", "South Africa": "🇿🇦", "South Korea": "🇰🇷",
  "Czech Republic": "🇨🇿", "Canada": "🇨🇦", "Bosnia & Herzegovina": "🇧🇦",
  "Qatar": "🇶🇦", "Switzerland": "🇨🇭", "Brazil": "🇧🇷",
  "Morocco": "🇲🇦", "Haiti": "🇭🇹", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "USA": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺", "Turkey": "🇹🇷",
  "Germany": "🇩🇪", "Ivory Coast": "🇨🇮", "Ecuador": "🇪🇨",
  "Netherlands": "🇳🇱", "Japan": "🇯🇵", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
  "Belgium": "🇧🇪", "Egypt": "🇪🇬", "Iran": "🇮🇷", "New Zealand": "🇳🇿",
  "Spain": "🇪🇸", "Saudi Arabia": "🇸🇦", "Uruguay": "🇺🇾",
  "France": "🇫🇷", "Senegal": "🇸🇳", "Iraq": "🇮🇶", "Norway": "🇳🇴",
  "Argentina": "🇦🇷", "Algeria": "🇩🇿", "Austria": "🇦🇹", "Jordan": "🇯🇴",
  "Portugal": "🇵🇹", "Colombia": "🇨🇴", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Croatia": "🇭🇷", "Ghana": "🇬🇭", "Panama": "🇵🇦",
  "Cape Verde": "🇨🇻", "Curaçao": "🇨🇼", "DR Congo": "🇨🇩",
  "Uzbekistan": "🇺🇿",
};

function flag(team) {
  return FLAGS[team] || "🏳️";
}

function parseMatchTime(dateStr, timeStr) {
  if (!timeStr) return `${dateStr}T18:00:00Z`;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s+UTC([+-]\d+)/);
  if (!match) return `${dateStr}T18:00:00Z`;

  const [, hh, mm, offsetStr] = match;
  const offset = parseInt(offsetStr, 10);

  const localDate = new Date(`${dateStr}T${hh.padStart(2,"0")}:${mm}:00`);
  const utcTime = new Date(localDate.getTime() - offset * 3600000);
  return utcTime.toISOString();
}

function detectPhase(round) {
  const r = round.toLowerCase();
  if (r.includes("final") && r.includes("third")) return "3rd Place";
  if (r.includes("final"))   return "Final";
  if (r.includes("semi"))    return "Semi-Final";
  if (r.includes("quarter")) return "Quarter-Final";
  if (r.includes("round of 16")) return "Round of 16";
  if (r.includes("round of 32")) return "Round of 32";
  return "Group Stage";
}

// Βοηθητική συνάρτηση για fetching live scores με timeout ώστε να μην κολλάει ο worker
async function fetchLiveScores() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sec timeout
    
    const res = await fetch(LIVE_API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log("Live API fetch failed", e.message);
  }
  return null;
}

export default {
  async fetch(request, env, ctx) {
    try {
      const now = new Date();

      // Παράλληλα requests (Schedule + Live Scores) για ταχύτητα
      const [scheduleRes, liveScoresData] = await Promise.all([
        fetch(WC_JSON_URL).then(res => res.json()).catch(() => ({ matches: [] })),
        fetchLiveScores()
      ]);

      const allMatches = scheduleRes.matches || [];

      const parsed = allMatches.map((m, idx) => {
        const isoTime = parseMatchTime(m.date, m.time);
        const kickoff = new Date(isoTime);
        const isLive  = now >= kickoff && now < new Date(kickoff.getTime() + 105 * 60000);
        const isPast  = now >= new Date(kickoff.getTime() + 105 * 60000);

        let score1 = m.score1 ?? null;
        let score2 = m.score2 ?? null;

        // Συγχώνευση live scores αν υπάρχουν στο live API
        if ((isLive || isPast) && liveScoresData && Array.isArray(liveScoresData.games)) {
           const liveMatch = liveScoresData.games.find(lg => 
              lg.team1?.toLowerCase() === m.team1?.toLowerCase() &&
              lg.team2?.toLowerCase() === m.team2?.toLowerCase()
           );
           if (liveMatch) {
             score1 = liveMatch.score1 ?? score1;
             score2 = liveMatch.score2 ?? score2;
           }
        }

        return {
          id: idx,
          round: m.round || "Unknown",
          phase: detectPhase(m.round || ""),
          group: m.group || null,
          team1: m.team1,
          team2: m.team2,
          flag1: flag(m.team1),
          flag2: flag(m.team2),
          ground: m.ground || "",
          isoTime,
          kickoff: kickoff.toISOString(),
          isLive,
          isPast,
          score1,
          score2,
        };
      });

      const todayStr = now.toISOString().slice(0, 10);
      const todayMatches = parsed.filter(m => m.kickoff.slice(0, 10) === todayStr);

      const upcoming = parsed
        .filter(m => !m.isPast && !m.isLive)
        .slice(0, 8);

      const live = parsed.filter(m => m.isLive);

      // Βρες το επόμενο ματς που ΔΕΝ έχει ξεκινήσει ακόμα
      const nextMatch = parsed.find(m => new Date(m.kickoff) > now) || null;

      const totalPlayed  = parsed.filter(m => m.isPast).length;
      const totalMatches = parsed.length;
      
      // Η τρέχουσα φάση του τουρνουά είναι η φάση του επόμενου ή live αγώνα, 
      // αλλιώς αν παίχτηκαν όλα, finished
      let currentPhase = "Finished";
      if (live.length > 0) currentPhase = live[0].phase;
      else if (nextMatch) currentPhase = nextMatch.phase;

      const response = {
        tournament: "FIFA World Cup 2026",
        hosts: "USA · Canada · Mexico",
        period: "11 Jun – 19 Jul 2026",
        currentPhase,
        totalMatches,
        totalPlayed,
        live,
        today: todayMatches,
        upcoming,
        nextMatch,
        fetchedAt: now.toISOString(),
      };

      return new Response(JSON.stringify(response), {
        headers: CORS_HEADERS,
        status: 200,
      });

    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...CORS_HEADERS }, status: 500 }
      );
    }
  }
};
```
</details>

4. Deploy the worker and copy the provided worker URL (it will look like `https://wc26-worker.<your-username>.workers.dev`).

### 2. Configure the iOS Widget
1. Download the free [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) app from the App Store.
2. Open Scriptable, tap the `+` icon to create a new script, and paste the contents of `widget.js`.
3. Locate line 3 in the script and update the `WORKER_URL` variable with the URL you copied in the previous step:
   ```javascript
   const WORKER_URL = "https://your-worker-url.workers.dev";
   ```
4. Rename the script to `WC26` and save it.

### 3. Add to Home Screen
1. Long-press any empty space on your iOS home screen.
2. Tap the `+` icon in the top left corner and search for **Scriptable**.
3. Select your preferred widget size (Medium or Large is recommended) and tap "Add Widget".
4. Tap the widget you just added, and set the **Script** parameter to `WC26`.

## License
Open-sourced under the MIT License. Match schedule data is provided by the public domain openfootball project.
