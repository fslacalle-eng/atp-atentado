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
};

export const RULES_WITH_EXAMPLES = [
  "En torneos con fase de liguilla, al cerrar la fase de grupos se genera automáticamente el cuadro de eliminación con seeding basado en la clasificación de la liguilla. Ejemplo: en un torneo de 8 jugadores con cuartos de final, el 1º se enfrenta al 8º, el 2º al 7º, etc.",
  "Los resultados de partidos deben ser confirmados por el rival. Cuando un jugador registra un resultado, el oponente verá un aviso pendiente de confirmación al iniciar sesión en la pestaña de Partidos, donde podrá confirmar o disputar el resultado. El administrador puede validar resultados disputados.",
  "Los partidos regulares se clasifican automáticamente como Liga Regular (si suman puntos) o Amistoso (si se ha superado el límite de enfrentamientos). Esta clasificación es visible en la pestaña de Partidos.",
  "Es posible consultar el simulador antes de jugar para conocer cuántos puntos obtendría cada jugador en caso de victoria, teniendo en cuenta la clasificación, el sistema de equidad y el límite de enfrentamientos a la fecha seleccionada.",
  "Un jugador puede retar a otro a un partido oficial. Los retos requieren aceptación del retado y están sujetos al límite temporal de retos configurado. El perdedor de un reto pierde puntos equivalentes a la base.",
  "Las sanciones administrativas deducen puntos de forma directa y permanente. Solo el administrador puede aplicarlas.",
  "El administrador puede suspender a un jugador temporalmente. Un jugador suspendido queda relegado a la última posición del ranking con sus puntos congelados, no puede jugar partidos ni ser retado, y no le afecta la penalización por inactividad. El administrador puede levantar la suspensión en cualquier momento.",
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
      const pmNonTourn = S.matches.filter(
        (m) =>
          !m.annulled &&
          !m.tournamentId &&
          m.status === "confirmed" &&
          (m.player1 === pid || m.player2 === pid) &&
          m.date <= targetDate
      );
      if (pmNonTourn.length === 0) return;
      const last = Math.max(...pmNonTourn.map((m) => m.date));
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
