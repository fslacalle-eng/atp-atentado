/* ===== CONSTANTS ===== */
export const SURFS = ["Dura", "Tierra", "Hierba"];
export const REACTS = ["❤️", "🔥", "🚀", "👍", "🥶"];

export const DEFAULT_CONFIG = {
  eloBase: 100,
  equityBonusPct: 50,
  equityMatchesGap: 5,
  maxSameOpp: 4,
  sameOppDays: 60,
  inactPct: 15,
  inactDays: 30,
  chCoolDays: 30,
  maxPastDays: 15,
};

export const RULES_WITH_EXAMPLES = [
  "En torneos con fase de liguilla, al cerrar la fase de grupos se genera automáticamente el cuadro de eliminación con seeding basado en la clasificación de la liguilla. Ejemplo: en un torneo de 8 jugadores con cuartos de final, el 1º se enfrenta al 8º, el 2º al 7º, etc.",
  "Los resultados de partidos deben ser confirmados por el rival. Cuando un jugador registra un resultado, el oponente verá un aviso pendiente de confirmación al iniciar sesión en la pestaña de Partidos, donde podrá confirmar o disputar el resultado. El administrador puede validar resultados disputados.",
  "Los partidos regulares se clasifican automáticamente como Liga Regular (si suman puntos) o Amistoso (si se ha superado el límite de enfrentamientos). Esta clasificación es visible en la pestaña de Partidos.",
  "Es posible consultar el simulador antes de jugar para conocer cuántos puntos obtendría cada jugador en caso de victoria, teniendo en cuenta la clasificación, el sistema de equidad y el límite de enfrentamientos a la fecha seleccionada.",
  "Un jugador puede retar a otro a un partido oficial. Los retos requieren aceptación del retado y están sujetos al límite temporal de retos configurado. El perdedor de un reto pierde puntos equivalentes a la base.",
  "Las sanciones administrativas deducen puntos de forma directa y permanente. Solo el administrador puede aplicarlas.",
  "El administrador puede suspender a un jugador temporalmente. Un jugador suspendido queda relegado a la última posición del ranking con sus puntos congelados, no puede jugar partidos ni ser retado, y no le afecta la penalización por inactividad. El administrador puede levantar la suspensión en cualquier momento.",
  "Los jugadores pueden programar partidos futuros sin resultado desde la pestaña de Partidos (filtro Próximamente). No requieren aceptación del rival; sólo cuando se registra el resultado éste debe confirmarlo. Los programados no suman puntos hasta que se juegan, y no cuentan para el límite de enfrentamientos hasta ese momento. Tanto los dos implicados como el admin pueden borrar un partido programado.",
  "Si hay un partido programado pendiente entre dos jugadores, no pueden registrar un resultado entre ellos sin resolver antes ese programado: o bien se registra el resultado sobre el partido programado, o se borra si no llegó a disputarse.",
  "Al registrar un partido con resultado, la fecha no puede ser anterior a los últimos 15 días (configurable). Si alguien se acuerda de un partido más antiguo, debe pedir al admin que lo registre. El admin no tiene ese límite. Los partidos siempre se ordenan cronológicamente por fecha de juego al calcular puntos, de modo que un partido antiguo insertado a posteriori encaja automáticamente en la línea temporal correcta.",
];

/* ===== UTILITY FUNCTIONS ===== */
export const uid = () => Math.random().toString(36).substr(2, 9);
export const now = () => Date.now();
export const fmtD = (ts) =>
  new Date(ts).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
export const mAgo = (m) => {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  return d.getTime();
};
export const dAgo = (d) => Date.now() - d * 86400000;
export const dB = (d) => Date.now() - d * 86400000;
export const daysBetween = (from, to) => Math.floor((to - from) / 86400000);
export const toI = (ts) => new Date(ts).toISOString().slice(0, 10);
export const frI = (s) => new Date(s + "T12:00:00").getTime();

/* ===== SCORE PARSING ===== */
export const parseScore = (sc, wId, p1, p2) => {
  const r = { sW: 0, sL: 0, gW: 0, gL: 0 };
  if (!sc) return r;
  const ip = wId === p1;
  sc.split(",")
    .map((s) => s.trim())
    .forEach((s) => {
      const p = s.split("-").map((n) => parseInt(n.trim()));
      if (p.length !== 2 || isNaN(p[0]) || isNaN(p[1])) return;
      const w = ip ? p[0] : p[1],
        l = ip ? p[1] : p[0];
      r.gW += w;
      r.gL += l;
      if (w > l) r.sW++;
      else r.sL++;
    });
  return r;
};

/* ===== LEAGUE STANDINGS ===== */
export const getLS = (pid, ms) => {
  let w = 0,
    l = 0,
    sW = 0,
    sL = 0,
    gW = 0,
    gL = 0;
  for (const m of ms) {
    if (m.phase && m.phase !== "league") continue;
    if (!(m.player1 === pid || m.player2 === pid) || !m.winner) continue;
    const won = m.winner === pid;
    if (won) w++;
    else l++;
    const s = parseScore(m.score, m.winner, m.player1, m.player2);
    if (won) {
      sW += s.sW;
      sL += s.sL;
      gW += s.gW;
      gL += s.gL;
    } else {
      sW += s.sL;
      sL += s.sW;
      gW += s.gL;
      gL += s.gW;
    }
  }
  return { w, l, sW, sL, sd: sW - sL, gW, gL, gd: gW - gL };
};

export const h2wF = (a, b, ms) => {
  for (const m of ms) {
    if (m.phase && m.phase !== "league") continue;
    if (
      (m.player1 === a && m.player2 === b) ||
      (m.player1 === b && m.player2 === a)
    ) {
      if (m.winner === a) return a;
      if (m.winner === b) return b;
    }
  }
  return null;
};

export const sortLg = (pids, ms) => {
  const st = {};
  for (const p of pids) st[p] = getLS(p, ms);
  return [...pids]
    .sort((a, b) => {
      const sa = st[a],
        sb = st[b];
      if (sb.w !== sa.w) return sb.w - sa.w;
      const h = h2wF(a, b, ms);
      if (h === a) return -1;
      if (h === b) return 1;
      if (sb.sd !== sa.sd) return sb.sd - sa.sd;
      return sb.gd - sa.gd;
    })
    .map((p, i) => ({ playerId: p, ...st[p], pos: i + 1 }));
};

/* ===== EQUITY POINTS CALCULATION =====
 * Bonus based on points difference, not ranking position.
 * Applies only if both players have played before (h2h exists) AND the
 * points difference is >= (equityMatchesGap * eloBase).
 * Bonus is eloBase * (1 + equityBonusPct/100), rounded DOWN.
 */
export const calcPts = (winnerPts, loserPts, base, bonusPct, matchesGap, hasH2H) => {
  if (!hasH2H) return base;
  const threshold = matchesGap * base;
  const gap = loserPts - winnerPts; // positive means winner is the underdog
  if (gap >= threshold) {
    return Math.floor(base * (1 + bonusPct / 100));
  }
  return base;
};

/* ===== TOURNAMENT POINTS ===== */
export const computeTournamentPts = (t) => {
  if (!t.ptsDist) return [];
  const pd = t.ptsDist;
  const bk = t.bracket;
  const res = [];
  const allPlayers = t.players || [];
  if (!bk)
    return allPlayers.map((pid) => ({
      playerId: pid,
      position: "Grupo",
      points: 0,
    }));

  const rounds = ["r16", "qf", "sf", "final"];
  const startRound = t.playoffStart || "qf";
  const startIdx = rounds.indexOf(startRound);
  const lostIn = {};
  const champion =
    bk.final &&
    bk.final[0] &&
    bk.final[0].winner &&
    bk.final[0].status === "confirmed"
      ? bk.final[0].winner
      : null;

  for (const r of rounds) {
    if (!bk[r]) continue;
    for (const m of bk[r]) {
      if (m.winner && m.status === "confirmed") {
        const loser = m.p1 === m.winner ? m.p2 : m.p1;
        if (loser && !lostIn[loser]) lostIn[loser] = r;
      }
    }
  }

  const inBracket = new Set();
  for (const r of rounds) {
    if (!bk[r]) continue;
    for (const m of bk[r]) {
      if (m.p1) inBracket.add(m.p1);
      if (m.p2) inBracket.add(m.p2);
    }
  }

  for (const pid of allPlayers) {
    if (pid === champion) {
      res.push({ playerId: pid, position: "Campeón", points: pd.w || 0 });
    } else if (
      lostIn[pid] === "final" ||
      (!lostIn[pid] &&
        bk.final &&
        bk.final[0] &&
        (bk.final[0].p1 === pid || bk.final[0].p2 === pid) &&
        champion)
    ) {
      res.push({ playerId: pid, position: "Finalista", points: pd.f || 0 });
    } else if (lostIn[pid] === "sf") {
      const earnsSfPts = rounds.indexOf("sf") > startIdx;
      res.push({
        playerId: pid,
        position: "Semifinal",
        points: earnsSfPts ? pd.sf || 0 : 0,
      });
    } else if (lostIn[pid] === "qf") {
      const earnsQfPts = rounds.indexOf("qf") > startIdx;
      res.push({
        playerId: pid,
        position: "Cuartos",
        points: earnsQfPts ? pd.qf || 0 : 0,
      });
    } else if (lostIn[pid] === "r16") {
      const earnsR16Pts = rounds.indexOf("r16") > startIdx;
      res.push({
        playerId: pid,
        position: "Octavos",
        points: earnsR16Pts ? pd.r16 || 0 : 0,
      });
    } else if (inBracket.has(pid)) {
      res.push({ playerId: pid, position: "En juego", points: 0 });
    } else {
      res.push({ playerId: pid, position: "Grupo", points: 0 });
    }
  }
  return res.sort(
    (a, b) => b.points - a.points || (a.position === "Campeón" ? -1 : 0)
  );
};

/* ===== COMPUTE POINTS AT DATE =====
 * Computes points for every player, chronologically, up to a given date.
 * Returns { playerId -> points } representing the state at that instant.
 * Used by both the standings view and the simulator.
 *
 * Suspended players: the inactivity penalty is skipped. Regular match
 * registration and challenges are blocked upstream (in the UI) so no new
 * points are accrued while suspended.
 */
export const computePointsAtDate = (S, targetDate, surface) => {
  if (!S) return {};
  const cfg = S.config;
  const pts = {};
  S.players
    .filter((p) => p.approved)
    .forEach((p) => {
      pts[p.id] = 0;
    });

  const matches = S.matches
    .filter(
      (m) =>
        !m.annulled &&
        m.status === "confirmed" &&
        m.date <= targetDate &&
        (surface === "all" || m.surface === surface)
    )
    .sort((a, b) => a.date - b.date);

  matches.forEach((m) => {
    if (!m.winner) return;
    const loser = m.winner === m.player1 ? m.player2 : m.player1;
    const isTournament = !!m.tournamentId;
    if (isTournament) return;

    if (m.countsForStandings) {
      const h2hExists = S.matches.some(
        (x) =>
          !x.annulled &&
          x.date < m.date &&
          ((x.player1 === m.winner && x.player2 === loser) ||
            (x.player1 === loser && x.player2 === m.winner))
      );
      const basePts = cfg.eloBase;
      const winnerPts = pts[m.winner] || 0;
      const loserPts = pts[loser] || 0;
      const awarded = calcPts(
        winnerPts,
        loserPts,
        basePts,
        cfg.equityBonusPct,
        cfg.equityMatchesGap,
        h2hExists
      );
      pts[m.winner] = (pts[m.winner] || 0) + awarded;
    }
    if (m.isChallenge) {
      const challengeLossPts = cfg.eloBase;
      pts[loser] = Math.max(0, (pts[loser] || 0) - challengeLossPts);
    }
  });

  if (surface === "all") {
    S.tournaments.forEach((t) => {
      const live = computeTournamentPts(t);
      live.forEach((r) => {
        if (pts[r.playerId] !== undefined)
          pts[r.playerId] += r.points || 0;
      });
    });
  }

  if (surface === "all") {
    Object.keys(pts).forEach((pid) => {
      const player = S.players.find((p) => p.id === pid);
      // Suspended players don't get inactivity penalty
      if (player && player.suspended) return;
      // Any confirmed match (regular, challenge, or tournament) counts as activity
      const playerMatches = S.matches.filter(
        (m) =>
          !m.annulled &&
          m.status === "confirmed" &&
          (m.player1 === pid || m.player2 === pid) &&
          m.date <= targetDate
      );
      if (playerMatches.length === 0) return;
      const last = Math.max(...playerMatches.map((m) => m.date));
      const periods = Math.floor(
        (targetDate - last) / (cfg.inactDays * 86400000)
      );
      for (let i = 0; i < periods; i++) {
        const penalty = Math.floor(pts[pid] * (cfg.inactPct / 100));
        pts[pid] = Math.max(0, pts[pid] - penalty);
      }
    });
  }

  if (surface === "all") {
    S.players.forEach((p) => {
      if (p.sanctions && pts[p.id] !== undefined) {
        p.sanctions.forEach((x) => {
          if (!x.date || x.date <= targetDate) {
            if (x.type === "bonus") {
              pts[p.id] += x.amount || 0;
            } else {
              pts[p.id] = Math.max(0, pts[p.id] - (x.amount || 0));
            }
          }
        });
      }
    });
  }

  return pts;
};

/* ===== MATCH CATEGORY ===== */
export const mCat = (m) => {
  if (m.tournamentId)
    return { label: "Torneo", color: "#5a9c5a" };
  if (m.isChallenge) return { label: "Reto", color: "#d4a012" };
  if (!m.countsForStandings)
    return { label: "Amistoso", color: "#d4c9a8" };
  return { label: "Liga Regular", color: "#6b8bc4" };
};

/* ===== NEXT BRACKET ROUND MAP ===== */
export const nRM = { r16: "qf", qf: "sf", sf: "final" };

/* ===== FORUM HELPERS =====
 * The forum uses a single array `S.forum` of message objects:
 * {
 *   id: string,
 *   userId: string,           // author
 *   text: string,             // max 140 chars, can contain @nickname mentions
 *   mentionedIds: string[],   // resolved player ids that were @-mentioned
 *   date: timestamp,          // creation date
 *   editedAt: timestamp|null, // last edit (null if never edited)
 *   pinned: boolean,          // admin can pin
 *   pinnedAt: timestamp|null, // when it was pinned (for ordering pinned msgs)
 *   reactions: { emoji: [userId] },
 *   replies: [                // single level of nesting
 *     { id, userId, text, mentionedIds, date, editedAt, reactions }
 *   ]
 * }
 */

export const MAX_FORUM_CHARS = 140;

/**
 * Parse @mentions from a text and return matched player ids.
 * Longest-nickname-first matching so "@Carlitos" won't be mis-matched as "@Carli".
 */
export const parseMentions = (text, players) => {
  if (!text || !players || players.length === 0) return [];
  const approved = players.filter((p) => p.approved);
  // Sort by nickname length descending so longer names match first
  const sorted = [...approved].sort(
    (a, b) => b.nickname.length - a.nickname.length
  );
  const lower = text.toLowerCase();
  const matched = new Set();
  // Find every @ and check which nickname follows
  for (let i = 0; i < lower.length; i++) {
    if (lower[i] !== "@") continue;
    for (const p of sorted) {
      const nick = p.nickname.toLowerCase();
      // Check nickname follows the @
      if (lower.substr(i + 1, nick.length) === nick) {
        // Make sure the char after the nickname is not a letter/digit (word boundary)
        const nextChar = lower[i + 1 + nick.length];
        if (
          !nextChar ||
          !/[a-z0-9_áéíóúñü]/i.test(nextChar)
        ) {
          matched.add(p.id);
          break; // longest match wins for this @
        }
      }
    }
  }
  return Array.from(matched);
};

/**
 * Given raw text and the list of players, return an array of segments
 * for rendering: [{type:"text",value:"hello "},{type:"mention",playerId:"p1",label:"@Carlitos"}, ...]
 * Used by the UI to render mentions in a different color.
 */
export const renderMentionSegments = (text, players) => {
  if (!text) return [];
  const approved = (players || []).filter((p) => p.approved);
  const sorted = [...approved].sort(
    (a, b) => b.nickname.length - a.nickname.length
  );
  const segments = [];
  let i = 0;
  let buffer = "";
  while (i < text.length) {
    if (text[i] === "@") {
      let matched = null;
      for (const p of sorted) {
        const nick = p.nickname;
        if (
          text.substr(i + 1, nick.length).toLowerCase() === nick.toLowerCase()
        ) {
          const nextChar = text[i + 1 + nick.length];
          if (
            !nextChar ||
            !/[a-z0-9_áéíóúñü]/i.test(nextChar)
          ) {
            matched = { player: p, length: 1 + nick.length };
            break;
          }
        }
      }
      if (matched) {
        if (buffer) {
          segments.push({ type: "text", value: buffer });
          buffer = "";
        }
        segments.push({
          type: "mention",
          playerId: matched.player.id,
          label: "@" + matched.player.nickname,
        });
        i += matched.length;
        continue;
      }
    }
    buffer += text[i];
    i++;
  }
  if (buffer) segments.push({ type: "text", value: buffer });
  return segments;
};

/**
 * Most recent activity timestamp for a match (used for foro ordering).
 * Looks at latest comment, latest reaction timestamp (if stored), or match date.
 */
export const getMatchActivityTs = (m) => {
  if (!m) return 0;
  let ts = m.date || 0;
  const comments = m.comments || [];
  for (const c of comments) {
    if (c.date && c.date > ts) ts = c.date;
  }
  // Reactions don't store per-user timestamps in current schema, so we use
  // the match date as a conservative baseline when reactions exist.
  return ts;
};

/**
 * Returns true if a match has any forum-worthy activity
 * (at least one reaction OR at least one comment).
 */
export const matchHasActivity = (m) => {
  if (!m) return false;
  const hasComments = (m.comments || []).length > 0;
  if (hasComments) return true;
  const rx = m.reactions || {};
  for (const k of Object.keys(rx)) {
    if ((rx[k] || []).length > 0) return true;
  }
  return false;
};

/**
 * Build the unified forum feed:
 *   - all forum messages
 *   - all matches with at least one comment or reaction (as virtual entries)
 *
 * Returns an array of entries:
 *   { kind: "message", message: <forum msg>, activityTs }
 *   { kind: "match",   match:   <match obj>, activityTs }
 *
 * Ordered by activityTs descending, EXCEPT pinned forum messages which are
 * returned first, sorted by pinnedAt descending.
 */
export const getForumActivity = (S) => {
  if (!S) return { pinned: [], feed: [] };
  const messages = S.forum || [];
  const matches = (S.matches || []).filter(
    (m) => !m.annulled && matchHasActivity(m)
  );

  const pinned = messages
    .filter((m) => m.pinned)
    .map((m) => ({
      kind: "message",
      message: m,
      activityTs: m.pinnedAt || m.date,
    }))
    .sort((a, b) => (b.activityTs || 0) - (a.activityTs || 0));

  const unpinnedMsgs = messages
    .filter((m) => !m.pinned)
    .map((m) => {
      // Activity = most recent of: msg date, last reply date, last edit
      let ts = m.date || 0;
      if (m.editedAt && m.editedAt > ts) ts = m.editedAt;
      for (const r of m.replies || []) {
        if (r.date && r.date > ts) ts = r.date;
        if (r.editedAt && r.editedAt > ts) ts = r.editedAt;
      }
      return { kind: "message", message: m, activityTs: ts };
    });

  const matchEntries = matches.map((m) => ({
    kind: "match",
    match: m,
    activityTs: getMatchActivityTs(m),
  }));

  const feed = [...unpinnedMsgs, ...matchEntries].sort(
    (a, b) => (b.activityTs || 0) - (a.activityTs || 0)
  );

  return { pinned, feed };
};

/**
 * Given the full state and the timestamp of the user's last visit to the forum,
 * return true if there is any activity newer than that timestamp. Used to
 * trigger the red dot on the "Foro" tab.
 */
export const hasUnreadForumActivity = (S, lastSeenTs) => {
  if (!S) return false;
  const last = lastSeenTs || 0;
  const messages = S.forum || [];
  for (const m of messages) {
    if ((m.date || 0) > last) return true;
    if ((m.editedAt || 0) > last) return true;
    for (const r of m.replies || []) {
      if ((r.date || 0) > last) return true;
      if ((r.editedAt || 0) > last) return true;
    }
  }
  for (const m of S.matches || []) {
    if (m.annulled) continue;
    if (!matchHasActivity(m)) continue;
    for (const c of m.comments || []) {
      if ((c.date || 0) > last) return true;
    }
  }
  return false;
};

/* ===== SCHEDULED MATCHES HELPERS =====
 * A "scheduled" match has status === "scheduled" and no winner. It sits in
 * S.matches alongside confirmed/pending matches. Its date is in the future
 * (or may be past if nobody has registered the result yet).
 */

/**
 * Returns a pending scheduled match between a and b if one exists, or null.
 * "Pending" means: scheduled + not annulled + no winner.
 */
export const findPendingScheduled = (S, a, b) => {
  if (!S || !a || !b) return null;
  return (
    S.matches.find(
      (m) =>
        !m.annulled &&
        m.status === "scheduled" &&
        !m.winner &&
        !m.tournamentId &&
        ((m.player1 === a && m.player2 === b) ||
          (m.player1 === b && m.player2 === a))
    ) || null
  );
};

/**
 * Is a scheduled match "expired"? (date passed by more than 14 calendar days)
 * Used to show a visual tag; the entry still exists until someone resolves or deletes it.
 */
export const SCHEDULED_EXPIRY_DAYS = 14;
export const isScheduledExpired = (m) => {
  if (!m || m.status !== "scheduled") return false;
  const cutoff = Date.now() - SCHEDULED_EXPIRY_DAYS * 86400000;
  return (m.date || 0) < cutoff;
};

/* ===== WEEK HELPERS (ISO, Monday to Sunday) ===== */

/**
 * Returns the timestamp (ms) for the Monday 00:00 of the ISO week containing ts.
 */
export const weekStart = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.getTime();
};

export const addDays = (ts, n) => ts + n * 86400000;
export const addWeeks = (ts, n) => ts + n * 7 * 86400000;

/**
 * Format a week as "12–18 may" (short, local-friendly).
 */
export const fmtWeekShort = (startTs) => {
  const s = new Date(startTs);
  const e = new Date(startTs + 6 * 86400000);
  const sameMonth = s.getMonth() === e.getMonth();
  const sDay = s.getDate();
  const eDay = e.getDate();
  const monthShort = (d) =>
    d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
  if (sameMonth) return sDay + "–" + eDay + " " + monthShort(e);
  return sDay + " " + monthShort(s) + "–" + eDay + " " + monthShort(e);
};

/**
 * Build weekly history of points and ranking for all approved players.
 * Returns array of weeks (oldest first):
 *   [{ weekStart, label, points: {pid: pts}, rank: {pid: position} }, ...]
 *
 * Range: `weeks` weeks back from today (default 26 = ~6 months).
 */
export const buildWeeklyHistory = (S, weeks) => {
  if (!S) return [];
  const n = weeks || 26;
  const todayWeekStart = weekStart(Date.now());
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const ws = addWeeks(todayWeekStart, -i);
    // Compute points at the END of that week (i.e. Sunday night = next Monday 00:00)
    const snapshotTs = addDays(ws, 7) - 1;
    const pts = computePointsAtDate(S, snapshotTs, "all");
    // Rank: sort approved, non-suspended players by pts desc; suspended go last
    const approvedIds = S.players
      .filter((p) => p.approved)
      .map((p) => p.id);
    const sorted = [...approvedIds].sort((a, b) => {
      const pa = S.players.find((x) => x.id === a);
      const pb = S.players.find((x) => x.id === b);
      const suspA = pa && pa.suspended;
      const suspB = pb && pb.suspended;
      if (suspA !== suspB) return suspA ? 1 : -1;
      return (pts[b] || 0) - (pts[a] || 0);
    });
    const rank = {};
    sorted.forEach((pid, idx) => {
      rank[pid] = idx + 1;
    });
    result.push({
      weekStart: ws,
      label: fmtWeekShort(ws),
      points: pts,
      rank,
    });
  }
  return result;
};

/* ===== PROFILE STATS ===== */

/**
 * Compute extended stats for one player, usable in ProfileView.
 * Uses only non-annulled, confirmed, non-tournament matches by default.
 */
export const computePlayerStats = (S, pid) => {
  if (!S) return null;
  // Includes all confirmed matches (regular, challenges, tournaments) —
  // for stats like streaks, tie-breaks, rival records, long matches.
  const pms = S.matches.filter(
    (m) =>
      !m.annulled &&
      m.status === "confirmed" &&
      (m.player1 === pid || m.player2 === pid) &&
      m.winner
  );

  // Best win streak (chronological scan)
  const chronological = [...pms].sort((a, b) => a.date - b.date);
  let bestStreak = 0;
  let currentStreak = 0;
  for (const m of chronological) {
    if (m.winner === pid) {
      currentStreak++;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  // Current streak (at the tail of the chronological list)
  let curStreakType = null; // "W" or "L"
  let curStreak = 0;
  for (let i = chronological.length - 1; i >= 0; i--) {
    const m = chronological[i];
    const won = m.winner === pid;
    if (curStreakType === null) {
      curStreakType = won ? "W" : "L";
      curStreak = 1;
    } else if ((curStreakType === "W" && won) || (curStreakType === "L" && !won)) {
      curStreak++;
    } else {
      break;
    }
  }

  // Per-rival record: only opponents with at least 3 matches
  const perRival = {};
  for (const m of pms) {
    const rival = m.player1 === pid ? m.player2 : m.player1;
    if (!perRival[rival]) perRival[rival] = { w: 0, l: 0 };
    if (m.winner === pid) perRival[rival].w++;
    else perRival[rival].l++;
  }
  const rivalsWithMin = Object.entries(perRival)
    .filter(([_, r]) => r.w + r.l >= 3)
    .map(([rid, r]) => ({
      rivalId: rid,
      w: r.w,
      l: r.l,
      total: r.w + r.l,
      winPct: (r.w / (r.w + r.l)) * 100,
    }));
  // Best rival (highest win%), ties broken by more wins
  const bestRival = rivalsWithMin.length
    ? [...rivalsWithMin].sort((a, b) => b.winPct - a.winPct || b.w - a.w)[0]
    : null;
  // Nemesis (lowest win%), ties broken by more losses
  const nemesis = rivalsWithMin.length
    ? [...rivalsWithMin].sort((a, b) => a.winPct - b.winPct || b.l - a.l)[0]
    : null;

  // Matches that went the distance (max-set: 3 in best-of-3, 5 in best-of-5).
  // We treat "went the distance" as: total sets played == sets won by winner + sets won by loser,
  // where set scores exist. Conservatively we count a match as "3 setter" if the score string
  // has exactly 3 set chunks, "5 setter" if it has exactly 5.
  let threeSetW = 0;
  let threeSetL = 0;
  let fiveSetW = 0;
  let fiveSetL = 0;
  // Tie-break stats: count sets where the winner's games equal 7 and loser's 6 (or the inverse 6-7).
  let tbW = 0;
  let tbL = 0;
  for (const m of pms) {
    if (!m.score) continue;
    const sets = m.score.split(",").map((s) => s.trim()).filter(Boolean);
    const won = m.winner === pid;
    if (sets.length === 3) {
      if (won) threeSetW++;
      else threeSetL++;
    } else if (sets.length === 5) {
      if (won) fiveSetW++;
      else fiveSetL++;
    }
    // Tie-break detection: set scores with 7-6 or 6-7
    for (const st of sets) {
      const parts = st.split("-").map((n) => parseInt(n.trim()));
      if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) continue;
      const [a, b] = parts;
      const ip = m.winner === m.player1;
      const winnerGames = ip ? a : b;
      const loserGames = ip ? b : a;
      if (
        (winnerGames === 7 && loserGames === 6) ||
        (winnerGames === 6 && loserGames === 7)
      ) {
        // This set went to a tie-break (or deciding games at 7-6). Was it won
        // by our player? That depends on who won this set.
        const setWinner = a > b ? m.player1 : m.player2;
        if (setWinner === pid) tbW++;
        else tbL++;
      }
    }
  }

  return {
    bestStreak,
    currentStreak: curStreak,
    currentStreakType: curStreakType,
    bestRival,
    nemesis,
    threeSetW,
    threeSetL,
    fiveSetW,
    fiveSetL,
    tbW,
    tbL,
  };
};

/* ===== INACTIVITY & FRESH RIVALS =====
 * For the banner and "who should I play?" widget.
 */

/**
 * Days since a player's last non-tournament confirmed match. Returns null if none.
 */
export const daysSinceLastMatch = (S, pid) => {
  if (!S) return null;
  const last = S.matches
    .filter(
      (m) =>
        !m.annulled &&
        m.status === "confirmed" &&
        (m.player1 === pid || m.player2 === pid)
    )
    .reduce((acc, m) => (m.date > acc ? m.date : acc), 0);
  if (!last) return null;
  return Math.floor((Date.now() - last) / 86400000);
};

/**
 * Days until the next inactivity penalty kicks in. Returns null if no matches yet.
 * Positive means penalty is still in the future; 0 or negative means already due.
 */
export const daysUntilInactivityPenalty = (S, pid) => {
  if (!S) return null;
  const dsl = daysSinceLastMatch(S, pid);
  if (dsl === null) return null;
  const inactDays = (S.config && S.config.inactDays) || 30;
  return inactDays - dsl;
};

/**
 * Rivals you haven't played a counting regular match with in the last `sameOppDays`.
 * Excludes yourself, suspended players, and players with whom you've already hit maxSameOpp.
 */
export const findFreshRivals = (S, pid) => {
  if (!S) return [];
  const cfg = S.config || {};
  const windowMs = (cfg.sameOppDays || 60) * 86400000;
  const maxSame = cfg.maxSameOpp || 4;
  const cutoff = Date.now() - windowMs;
  const eligible = S.players.filter(
    (p) => p.approved && !p.suspended && p.id !== pid
  );
  const result = [];
  for (const rival of eligible) {
    const countInWindow = S.matches.filter(
      (m) =>
        !m.annulled &&
        !m.tournamentId &&
        m.status === "confirmed" &&
        m.date >= cutoff &&
        ((m.player1 === pid && m.player2 === rival.id) ||
          (m.player1 === rival.id && m.player2 === pid))
    ).length;
    if (countInWindow >= maxSame) continue;
    // Find most recent match with rival to show "how long ago"
    const lastMatch = S.matches
      .filter(
        (m) =>
          !m.annulled &&
          !m.tournamentId &&
          m.status === "confirmed" &&
          ((m.player1 === pid && m.player2 === rival.id) ||
            (m.player1 === rival.id && m.player2 === pid))
      )
      .reduce((acc, m) => (m.date > (acc ? acc.date : 0) ? m : acc), null);
    const daysSince = lastMatch
      ? Math.floor((Date.now() - lastMatch.date) / 86400000)
      : null;
    result.push({
      rivalId: rival.id,
      countInWindow,
      remainingSlots: maxSame - countInWindow,
      daysSinceLast: daysSince,
    });
  }
  // Sort: never played first (daysSinceLast === null), then longest ago first
  result.sort((a, b) => {
    if (a.daysSinceLast === null && b.daysSinceLast !== null) return -1;
    if (b.daysSinceLast === null && a.daysSinceLast !== null) return 1;
    return (b.daysSinceLast || 0) - (a.daysSinceLast || 0);
  });
  return result;
};

/* ===== HALL OF FAME =====
 * Heavy aggregator that computes all the stats needed for the HoF view.
 * Returns a structured object. Tie handling: every sub-result is an array
 * of players (or pairs) even when a single winner exists — the caller
 * can render the tie note if length > 1.
 *
 * Performance note: some computations iterate historical snapshots
 * (weeks-at-1, peak points, upset scan). With 10 players and 1–2 years
 * of data this is a few thousand ops, fine for a memoized computation.
 */

/**
 * Match filter helpers used internally by HoF.
 * - "played" matches: confirmed, not annulled, non-tournament, has winner.
 * - surface="all" or specific.
 */
const hofFilterPlayed = (S, surface) => {
  return (S.matches || []).filter(
    (m) =>
      !m.annulled &&
      m.status === "confirmed" &&
      m.winner &&
      (surface === "all" || m.surface === surface)
  );
};

/**
 * Weekly snapshot: returns array of { weekStart, topPlayerId, standings:{pid:pts} }
 * one entry per Monday from the earliest confirmed match to the current week.
 */
export const getWeeklySnapshots = (S) => {
  if (!S) return [];
  const all = (S.matches || []).filter(
    (m) => !m.annulled && m.status === "confirmed"
  );
  if (all.length === 0) {
    // No history — return just current week
    return [
      {
        weekStart: weekStart(Date.now()),
        standings: computePointsAtDate(S, Date.now(), "all"),
        topPlayerId: null,
      },
    ];
  }
  const earliest = all.reduce(
    (acc, m) => (m.date < acc ? m.date : acc),
    all[0].date
  );
  const earliestMonday = weekStart(earliest);
  const todayMonday = weekStart(Date.now());
  const snapshots = [];
  let cursor = earliestMonday;
  while (cursor <= todayMonday) {
    // Snapshot at the END of that week (Sunday 23:59:59)
    const snapTs = addDays(cursor, 7) - 1;
    const pts = computePointsAtDate(S, snapTs, "all");
    // Top player (excluding suspended; ties → first by id)
    const candidates = S.players
      .filter((p) => p.approved && !p.suspended)
      .map((p) => ({ id: p.id, pts: pts[p.id] || 0 }));
    candidates.sort((a, b) => b.pts - a.pts);
    const topPlayerId =
      candidates.length > 0 && candidates[0].pts > 0 ? candidates[0].id : null;
    snapshots.push({
      weekStart: cursor,
      standings: pts,
      topPlayerId,
    });
    cursor = addWeeks(cursor, 1);
  }
  return snapshots;
};

/**
 * Returns array of { playerId, weeks } sorted descending by weeks.
 */
export const getWeeksAtNumberOne = (S) => {
  const snaps = getWeeklySnapshots(S);
  const counts = {};
  for (const s of snaps) {
    if (s.topPlayerId) {
      counts[s.topPlayerId] = (counts[s.topPlayerId] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([playerId, weeks]) => ({ playerId, weeks }))
    .sort((a, b) => b.weeks - a.weeks);
};

/**
 * Returns { playerId, peak } with the highest points any player has ever reached.
 * Ties can happen; returns the highest points and then the list of players tied at that peak.
 */
export const getPeakPointsRecord = (S) => {
  const snaps = getWeeklySnapshots(S);
  let peak = 0;
  const whoReachedPeak = {}; // pid → true if this player ever hit current peak
  for (const s of snaps) {
    for (const pid of Object.keys(s.standings)) {
      const v = s.standings[pid] || 0;
      if (v > peak) {
        peak = v;
        // Reset: only players at this exact peak count
        Object.keys(whoReachedPeak).forEach((k) => delete whoReachedPeak[k]);
        whoReachedPeak[pid] = true;
      } else if (v === peak && v > 0) {
        whoReachedPeak[pid] = true;
      }
    }
  }
  const tied = Object.keys(whoReachedPeak);
  return { peak, playerIds: tied };
};

/**
 * Close racers: groups of consecutive players in the current standings
 * whose point differences from neighbor to neighbor are all <= threshold.
 * threshold defaults to eloBase * (1 + bonusPct/100), i.e. the max gain from one win.
 * Returns array of groups, each group is array of {playerId, points, position}.
 */
export const getCloseRacers = (S) => {
  if (!S) return [];
  const cfg = S.config || {};
  const threshold = Math.floor(
    (cfg.eloBase || 100) * (1 + (cfg.equityBonusPct || 0) / 100)
  );
  const pts = computePointsAtDate(S, Date.now(), "all");
  const players = S.players
    .filter((p) => p.approved && !p.suspended)
    .map((p) => ({ playerId: p.id, points: pts[p.id] || 0 }))
    .sort((a, b) => b.points - a.points);
  players.forEach((p, i) => {
    p.position = i + 1;
  });
  const groups = [];
  let current = [];
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (current.length === 0) {
      current.push(p);
      continue;
    }
    const prev = current[current.length - 1];
    if (prev.points - p.points <= threshold) {
      current.push(p);
    } else {
      if (current.length >= 2) groups.push(current);
      current = [p];
    }
  }
  if (current.length >= 2) groups.push(current);
  return { threshold, groups };
};

/**
 * Longest win streak ever (any player).
 * Returns { playerIds: [...], streak }. Ties keep all players.
 */
export const getBestWinStreakEver = (S) => {
  if (!S) return { playerIds: [], streak: 0 };
  let best = 0;
  const ids = new Set();
  for (const p of S.players || []) {
    if (!p.approved) continue;
    const stats = computePlayerStats(S, p.id);
    if (!stats) continue;
    if (stats.bestStreak > best) {
      best = stats.bestStreak;
      ids.clear();
      ids.add(p.id);
    } else if (stats.bestStreak === best && best > 0) {
      ids.add(p.id);
    }
  }
  return { playerIds: Array.from(ids), streak: best };
};

/**
 * Longest loss streak ever. Symmetric to win streak.
 */
export const getWorstLossStreakEver = (S) => {
  if (!S) return { playerIds: [], streak: 0 };
  let worst = 0;
  const ids = new Set();
  for (const p of S.players || []) {
    if (!p.approved) continue;
    const pms = (S.matches || [])
      .filter(
        (m) =>
          !m.annulled &&
          m.status === "confirmed" &&
          (m.player1 === p.id || m.player2 === p.id) &&
          m.winner
      )
      .sort((a, b) => a.date - b.date);
    let cur = 0;
    let best = 0;
    for (const m of pms) {
      if (m.winner === p.id) {
        cur = 0;
      } else {
        cur++;
        if (cur > best) best = cur;
      }
    }
    if (best > worst) {
      worst = best;
      ids.clear();
      ids.add(p.id);
    } else if (best === worst && best > 0) {
      ids.add(p.id);
    }
  }
  return { playerIds: Array.from(ids), streak: worst };
};

/**
 * Wins/losses/matches counts per player, optionally filtered by surface.
 * Does not include tournament matches.
 * Returns { wins:{pid:n}, losses:{pid:n}, total:{pid:n} }.
 */
export const getCountsPerPlayer = (S, surface) => {
  const wins = {};
  const losses = {};
  const total = {};
  const played = hofFilterPlayed(S, surface);
  for (const m of played) {
    const loser = m.winner === m.player1 ? m.player2 : m.player1;
    wins[m.winner] = (wins[m.winner] || 0) + 1;
    losses[loser] = (losses[loser] || 0) + 1;
    total[m.winner] = (total[m.winner] || 0) + 1;
    total[loser] = (total[loser] || 0) + 1;
  }
  return { wins, losses, total };
};

/**
 * Challenge counts per player (jugados/ganados/perdidos), optional surface filter.
 */
export const getChallengeCountsPerPlayer = (S, surface) => {
  const played = {};
  const won = {};
  const lost = {};
  for (const m of S.matches || []) {
    if (m.annulled) continue;
    if (m.status !== "confirmed") continue;
    if (!m.isChallenge) continue;
    if (!m.winner) continue;
    if (m.tournamentId) continue;
    if (surface !== "all" && m.surface !== surface) continue;
    const loser = m.winner === m.player1 ? m.player2 : m.player1;
    played[m.player1] = (played[m.player1] || 0) + 1;
    played[m.player2] = (played[m.player2] || 0) + 1;
    won[m.winner] = (won[m.winner] || 0) + 1;
    lost[loser] = (lost[loser] || 0) + 1;
  }
  return { played, won, lost };
};

/**
 * Tournament championship counts per player.
 * A player wins a tournament when `bracket.final[0].winner === player` and status "confirmed".
 */
export const getTournamentWinsPerPlayer = (S) => {
  const wins = {};
  for (const t of S.tournaments || []) {
    const bk = t.bracket;
    if (!bk || !bk.final || bk.final.length === 0) continue;
    const f = bk.final[0];
    if (f && f.winner && f.status === "confirmed") {
      wins[f.winner] = (wins[f.winner] || 0) + 1;
    }
  }
  return wins;
};

/**
 * Most-repeated matchup (regular + challenge, non-tournament).
 * Returns { pair:[pidA,pidB], count, h2h:{a:n,b:n} } of the most-played pair.
 * Ties: returns the first but flagged with allTied.
 */
export const getMostRepeatedMatchup = (S) => {
  const counter = {};
  for (const m of S.matches || []) {
    if (m.annulled) continue;
    if (m.status !== "confirmed") continue;
    if (!m.winner) continue;
    // Includes tournament matches — if two players have met in 3 tournaments
    // that is also part of their rivalry.
    const [a, b] = [m.player1, m.player2].sort();
    const key = a + "|" + b;
    if (!counter[key])
      counter[key] = { a, b, count: 0, winsA: 0, winsB: 0 };
    counter[key].count++;
    if (m.winner === a) counter[key].winsA++;
    else counter[key].winsB++;
  }
  const all = Object.values(counter);
  if (all.length === 0) return null;
  const max = Math.max(...all.map((x) => x.count));
  const tied = all.filter((x) => x.count === max);
  return {
    pairs: tied.map((t) => ({
      pair: [t.a, t.b],
      count: t.count,
      h2h: { a: t.winsA, b: t.winsB },
    })),
  };
};

/**
 * Biggest upset. For each victory in a non-tournament confirmed match with a
 * winner, compute (loserPts - winnerPts) AT the moment of the match. Positive
 * gap means underdog won. Returns top match(es).
 */
export const getBiggestUpset = (S) => {
  if (!S) return null;
  const played = hofFilterPlayed(S, "all").sort((a, b) => a.date - b.date);
  let bestGap = 0;
  const matches = [];
  for (const m of played) {
    const pts = computePointsAtDate(S, m.date - 1, "all");
    const winnerPts = pts[m.winner] || 0;
    const loser = m.winner === m.player1 ? m.player2 : m.player1;
    const loserPts = pts[loser] || 0;
    const gap = loserPts - winnerPts;
    if (gap > bestGap) {
      bestGap = gap;
      matches.length = 0;
      matches.push({ match: m, winnerPts, loserPts, gap });
    } else if (gap === bestGap && gap > 0) {
      matches.push({ match: m, winnerPts, loserPts, gap });
    }
  }
  if (bestGap <= 0) return null;
  return { matches, gap: bestGap };
};

/**
 * Pick top entries from a { pid → value } map, returning players (with ties).
 * `minTotal` optional: min value of `totals[pid]` to qualify (for min-matches rule).
 * `mode`: "max" or "min" (lowest wins are also a thing — we'll need it for worst-%).
 * Returns { playerIds: [...], value }.
 */
export const pickTop = (map, mode, minTotalsMap, minTotalsVal) => {
  const entries = Object.entries(map).filter(([pid]) => {
    if (!minTotalsMap) return true;
    return (minTotalsMap[pid] || 0) >= minTotalsVal;
  });
  if (entries.length === 0) return { playerIds: [], value: null };
  const cmp =
    mode === "min"
      ? (a, b) => a[1] - b[1]
      : (a, b) => b[1] - a[1];
  entries.sort(cmp);
  const best = entries[0][1];
  const tied = entries.filter(([, v]) => v === best).map(([pid]) => pid);
  return { playerIds: tied, value: best };
};

/**
 * Main aggregator. Returns a single object with everything the HoF view
 * needs. Sections that admit surface filter are returned as functions
 * the caller can invoke lazily, so filtering a single card doesn't
 * re-trigger the heavy global work.
 *
 * Actually we'll just return precomputed raw maps per surface here; caller
 * picks. Simpler.
 */
export const computeHallOfFame = (S) => {
  if (!S) return null;

  // Current standings (derived from current points)
  const currentPts = computePointsAtDate(S, Date.now(), "all");
  const currentStanding = S.players
    .filter((p) => p.approved && !p.suspended)
    .map((p) => ({ playerId: p.id, points: currentPts[p.id] || 0 }))
    .sort((a, b) => b.points - a.points);
  const currentNumber1 =
    currentStanding.length > 0 && currentStanding[0].points > 0
      ? {
          playerIds: currentStanding
            .filter((x) => x.points === currentStanding[0].points)
            .map((x) => x.playerId),
          value: currentStanding[0].points,
        }
      : { playerIds: [], value: 0 };

  // Close racers
  const closeRacers = getCloseRacers(S);

  // Peak points record
  const peak = getPeakPointsRecord(S);

  // Weeks at #1
  const weeksAt1 = getWeeksAtNumberOne(S);

  // Per-surface aggregates
  const surfaces = ["all", "Dura", "Tierra", "Hierba"];
  const perSurface = {};
  for (const sf of surfaces) {
    const counts = getCountsPerPlayer(S, sf);
    const chCounts = getChallengeCountsPerPlayer(S, sf);
    perSurface[sf] = { counts, chCounts };
  }

  // Tournaments (no surface filter per the user's decision)
  const tournamentWins = getTournamentWinsPerPlayer(S);

  // Streaks (not filtered by surface by design — they are narrative moments)
  const bestStreak = getBestWinStreakEver(S);
  const worstStreak = getWorstLossStreakEver(S);

  // Most repeated matchup (single, global)
  const mostRepeated = getMostRepeatedMatchup(S);

  // Biggest upset (single, global)
  const biggestUpset = getBiggestUpset(S);

  // Totals across all surfaces for the "min 10 matches" rule
  const totalAll = perSurface.all.counts.total;

  return {
    currentNumber1,
    closeRacers,
    peak,
    weeksAt1,
    perSurface,
    tournamentWins,
    bestStreak,
    worstStreak,
    mostRepeated,
    biggestUpset,
    totalAll,
  };
};
