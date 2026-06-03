// ⚽ World Cup 2026 Widget — Scriptable
// Άλλαξε ΜΟΝΟ αυτή τη γραμμή:
const WORKER_URL = "https://wc26-widget.YOUR-USERNAME.workers.dev"; // Πρέπει να το αλλάξει ο χρήστης με το δικό του worker link

// ── Χρώματα & Γραφικά ───────────────────────────────────────
const C = {
  gold:    new Color("#f2c94c"),
  white:   new Color("#ffffff"),
  gray:    new Color("#8e9eab"),
  green:   new Color("#00e676"),
  red:     new Color("#ff3b30"),
  dim:     new Color("#394a5e"),
};

// ── Helpers ───────────────────────────────────────────────
function countdown(isoStr) {
  const diff = new Date(isoStr) - new Date();
  if (diff < 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0)  return `${d}μ ${h}ω`;
  if (h > 0)  return `${h}ω ${m}λ`;
  return `${m}λ`;
}

function localTime(iso) {
  return new Date(iso).toLocaleTimeString("el-GR", {
    hour: "2-digit", minute: "2-digit"
  });
}

function localDate(iso) {
  return new Date(iso).toLocaleDateString("el-GR", {
    weekday: "short", day: "numeric", month: "short"
  });
}

// ── Fetch δεδομένων ───────────────────────────────────────
async function fetchData() {
  const req = new Request(WORKER_URL);
  req.timeoutInterval = 10; // timeout αν αργήσει
  return await req.loadJSON();
}

// ── Render match row ──────────────────────────────────────
function addMatchRow(widget, match, isHighlight, size) {
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.setPadding(4, 4, 4, 4);
  
  // Αν είναι Highlight (Live ή Επόμενο), δώσε λίγο background
  if (isHighlight && match.isLive) {
    row.backgroundColor = new Color("#ffffff", 0.05);
    row.cornerRadius = 6;
  }

  // Team 1
  const t1Stack = row.addStack();
  t1Stack.layoutHorizontally();
  t1Stack.centerAlignContent();
  const flag1 = t1Stack.addText(match.flag1);
  flag1.font = Font.systemFont(14);
  t1Stack.addSpacer(4);
  const t1 = t1Stack.addText(match.team1);
  t1.font = isHighlight ? Font.boldSystemFont(12) : Font.mediumSystemFont(11);
  t1.textColor = isHighlight ? C.white : C.gray;
  t1.lineLimit = 1;
  t1.minimumScaleFactor = 0.7;

  row.addSpacer();

  // Score or Time
  const centerStack = row.addStack();
  centerStack.layoutVertically();
  centerStack.centerAlignContent();
  
  let centerText;
  if (match.isLive) {
    centerText = centerStack.addText(`${match.score1 ?? 0} - ${match.score2 ?? 0}`);
    centerText.font = Font.heavySystemFont(13);
    centerText.textColor = C.white;
    centerText.centerAlignText();
    
    // Live indicator
    const liveInd = centerStack.addText("🔴 LIVE");
    liveInd.font = Font.boldSystemFont(8);
    liveInd.textColor = C.red;
    liveInd.centerAlignText();
    
  } else if (match.isPast && match.score1 !== null) {
    centerText = centerStack.addText(`${match.score1} - ${match.score2}`);
    centerText.font = Font.boldSystemFont(13);
    centerText.textColor = C.gold;
    centerText.centerAlignText();
  } else {
    const timeStr = localTime(match.kickoff);
    centerText = centerStack.addText(timeStr);
    centerText.font = isHighlight ? Font.boldSystemFont(12) : Font.systemFont(11);
    centerText.textColor = isHighlight ? C.white : C.gray;
    centerText.centerAlignText();
  }

  row.addSpacer();

  // Team 2
  const t2Stack = row.addStack();
  t2Stack.layoutHorizontally();
  t2Stack.centerAlignContent();
  const t2 = t2Stack.addText(match.team2);
  t2.font = isHighlight ? Font.boldSystemFont(12) : Font.mediumSystemFont(11);
  t2.textColor = isHighlight ? C.white : C.gray;
  t2.lineLimit = 1;
  t2.minimumScaleFactor = 0.7;
  t2Stack.addSpacer(4);
  const flag2 = t2Stack.addText(match.flag2);
  flag2.font = Font.systemFont(14);
}

// ── Build Widget ──────────────────────────────────────────
async function buildWidget(size) {
  const w = new ListWidget();
  
  // Όμορφο Premium Gradient Background
  const gradient = new LinearGradient();
  gradient.colors = [new Color("#121f38"), new Color("#080c14")];
  gradient.locations = [0.0, 1.0];
  w.backgroundGradient = gradient;
  
  w.setPadding(14, 16, 14, 16);
  w.url = "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026";

  let data;
  try {
    data = await fetchData();
  } catch (e) {
    const errStack = w.addStack();
    errStack.layoutVertically();
    const err = errStack.addText("⚠️ Σφάλμα σύνδεσης");
    err.textColor = C.red;
    err.font = Font.boldSystemFont(14);
    const hint = errStack.addText("Ελέγξτε το WORKER_URL σας");
    hint.textColor = C.gray;
    hint.font = Font.systemFont(10);
    return w;
  }

  // ── HEADER ────────────────────────────────────────────
  const hdr = w.addStack();
  hdr.layoutHorizontally();
  hdr.centerAlignContent();

  const trophy = hdr.addText("🏆 ");
  trophy.font = Font.systemFont(14);

  const title = hdr.addText("WORLD CUP '26");
  title.font = Font.heavySystemFont(12);
  title.textColor = C.gold;

  hdr.addSpacer();

  // Phase & Progress badge (σε στοίβαγμα για να φαίνεται όμορφο)
  const badgeStack = hdr.addStack();
  badgeStack.backgroundColor = new Color("#ffffff", 0.1);
  badgeStack.cornerRadius = 4;
  badgeStack.setPadding(2, 6, 2, 6);
  
  const phaseLabel = badgeStack.addText(`${data.currentPhase} | ${data.totalPlayed}/${data.totalMatches}`);
  phaseLabel.font = Font.boldSystemFont(9);
  phaseLabel.textColor = C.white;

  w.addSpacer(6);

  // ── LIVE αγώνες ──────────────────────────────────────
  let displayedCount = 0;
  if (data.live && data.live.length > 0) {
    for (const m of data.live.slice(0, 2)) {
      addMatchRow(w, m, true, size);
      displayedCount++;
    }
    w.addSpacer(4);
  }

  // ── Σημερινοί / Επόμενοι αγώνες ──────────────────────
  const displayMatches = data.today.length > 0
    ? data.today.filter(m => !m.isLive) 
    : data.upcoming;

  const maxRows = size === "large" ? 6 : (size === "medium" ? (3 - displayedCount) : (1 - displayedCount));
  const isSmall = size === "small";

  if (maxRows > 0) {
    for (let i = 0; i < Math.min(displayMatches.length, maxRows); i++) {
      const m = displayMatches[i];
      const isNext = (displayedCount === 0 && i === 0 && !m.isPast);
      addMatchRow(w, m, isNext, size);

      // Ημερομηνία σε νέο format για large widget
      if (size === "large" && !isSmall) {
        const sub = w.addStack();
        sub.layoutHorizontally();
        sub.addSpacer(20);
        const subText = sub.addText(`${m.group || m.phase} · ${m.ground} · ${localDate(m.kickoff)}`);
        subText.font = Font.systemFont(9);
        subText.textColor = C.dim;
      }
      w.addSpacer(2);
    }
  }

  w.addSpacer();

  // ── FOOTER: Countdown στον επόμενο αγώνα ─────────────
  if (data.nextMatch && !data.nextMatch.isLive) {
    const cd = countdown(data.nextMatch.kickoff);
    if (cd) {
      const footerStack = w.addStack();
      footerStack.layoutHorizontally();
      footerStack.addSpacer();
      const footer = footerStack.addText(`Επόμενος: ${cd}`);
      footer.font = Font.italicSystemFont(9);
      footer.textColor = new Color("#ffffff", 0.5);
      footerStack.addSpacer();
    }
  }

  return w;
}

// ── Entry Point ───────────────────────────────────────────
const size = config.widgetFamily || "medium";
const widget = await buildWidget(size);

if (config.runInWidget) {
  Script.setWidget(widget);
} else {
  if (size === "large") await widget.presentLarge();
  else if (size === "small") await widget.presentSmall();
  else await widget.presentMedium();
}
Script.complete();
