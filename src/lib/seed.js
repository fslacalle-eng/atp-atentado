import { dB, sortLg, RULES_WITH_EXAMPLES, DEFAULT_CONFIG } from "./logic";

const mkM = (id, a, b, w, sc, da, pts, ct, ch, tid, sf) => ({
  id,
  player1: a,
  player2: b,
  winner: w,
  score: sc,
  date: dB(da),
  points: pts,
  countsForStandings: ct,
  isChallenge: ch || false,
  tournamentId: tid || null,
  annulled: false,
  surface: sf || "Dura",
  status: "confirmed",
  reactions: {},
  comments: [],
});

export const seedPlayers = [
  { id: "p1", firstName: "Carlos", lastName: "Martinez", nickname: "Carlitos", age: 28, hand: "right", backhand: "two", password: "1234", email: "carlos@mail.com", photo: "", approved: true, sanctions: [], joinedAt: dB(120) },
  { id: "p2", firstName: "Pablo", lastName: "Garcia", nickname: "Pablito", age: 31, hand: "right", backhand: "one", password: "1234", email: "pablo@mail.com", photo: "", approved: true, sanctions: [], joinedAt: dB(120) },
  { id: "p3", firstName: "Miguel", lastName: "Lopez", nickname: "Migue", age: 26, hand: "left", backhand: "two", password: "1234", email: "miguel@mail.com", photo: "", approved: true, sanctions: [], joinedAt: dB(115) },
  { id: "p4", firstName: "Javier", lastName: "Fernandez", nickname: "Javi", age: 34, hand: "right", backhand: "two", password: "1234", email: "javi@mail.com", photo: "", approved: true, sanctions: [], joinedAt: dB(110) },
  { id: "p5", firstName: "Daniel", lastName: "Ruiz", nickname: "Dani", age: 29, hand: "right", backhand: "one", password: "1234", email: "dani@mail.com", photo: "", approved: true, sanctions: [], joinedAt: dB(108) },
  { id: "p6", firstName: "Adrian", lastName: "Moreno", nickname: "Adri", age: 27, hand: "left", backhand: "two", password: "1234", email: "adri@mail.com", photo: "", approved: true, sanctions: [], joinedAt: dB(105) },
  { id: "p7", firstName: "Sergio", lastName: "Jimenez", nickname: "Sergi", age: 30, hand: "right", backhand: "two", password: "1234", email: "sergi@mail.com", photo: "", approved: true, sanctions: [], joinedAt: dB(100) },
  { id: "p8", firstName: "Alvaro", lastName: "Diaz", nickname: "Alva", age: 25, hand: "right", backhand: "one", password: "1234", email: "alva@mail.com", photo: "", approved: true, sanctions: [], joinedAt: dB(98) },
  { id: "p9", firstName: "Raul", lastName: "Hernandez", nickname: "Rauli", age: 33, hand: "right", backhand: "two", password: "1234", email: "raul@mail.com", photo: "", approved: true, sanctions: [], joinedAt: dB(95) },
  { id: "p10", firstName: "Lucas", lastName: "Sanchez", nickname: "Luqui", age: 24, hand: "left", backhand: "two", password: "1234", email: "lucas@mail.com", photo: "", approved: true, sanctions: [], joinedAt: dB(90) },
];

export const seedMatches = [
  mkM("m1", "p1", "p2", "p1", "6-3, 6-4", 100, 100, true),
  mkM("m2", "p3", "p4", "p3", "7-5, 6-2", 98, 100, true, false, null, "Tierra"),
  mkM("m3", "p5", "p6", "p5", "6-4, 3-6, 7-5", 95, 100, true, false, null, "Hierba"),
  mkM("m4", "p7", "p8", "p8", "6-7, 6-3, 6-4", 93, 100, true),
  mkM("m5", "p9", "p10", "p10", "6-2, 6-4", 90, 100, true, false, null, "Tierra"),
  mkM("m6", "p1", "p3", "p1", "6-1, 6-3", 88, 100, true),
  mkM("m7", "p2", "p5", "p2", "7-6, 6-4", 85, 100, true, false, null, "Tierra"),
  mkM("m8", "p4", "p6", "p6", "6-3, 4-6, 7-6", 83, 100, true),
  mkM("m9", "p7", "p9", "p7", "6-2, 6-1", 80, 100, true, false, null, "Hierba"),
  mkM("m10", "p8", "p10", "p10", "6-4, 6-3", 78, 100, true),
  mkM("m11", "p1", "p5", "p1", "6-0, 6-2", 75, 100, true, false, null, "Tierra"),
  mkM("m12", "p2", "p3", "p3", "3-6, 7-5, 6-3", 73, 100, true),
  mkM("m13", "p4", "p7", "p7", "6-4, 6-4", 70, 100, true),
  mkM("m14", "p6", "p9", "p6", "6-3, 6-2", 68, 100, true, false, null, "Tierra"),
  mkM("m15", "p8", "p1", "p1", "6-3, 6-7, 7-5", 65, 100, true, false, null, "Hierba"),
  mkM("m16", "p10", "p3", "p3", "6-4, 6-2", 63, 100, true),
  mkM("m17", "p2", "p4", "p2", "6-1, 6-4", 60, 100, true, false, null, "Tierra"),
  mkM("m18", "p5", "p7", "p5", "7-6, 3-6, 6-2", 58, 100, true),
  mkM("m19", "p6", "p8", "p6", "6-3, 6-1", 55, 100, true),
  mkM("m20", "p9", "p1", "p1", "6-4, 6-3", 53, 100, true, false, null, "Tierra"),
  mkM("m21", "p10", "p2", "p2", "7-5, 6-4", 50, 100, true, false, null, "Hierba"),
  mkM("m22", "p3", "p5", "p3", "6-2, 6-3", 48, 100, true),
  mkM("m23", "p4", "p8", "p4", "6-4, 6-7, 7-5", 46, 100, true, false, null, "Tierra"),
  mkM("m24", "p6", "p10", "p10", "6-3, 3-6, 7-6", 44, 100, true),
  mkM("m25", "p7", "p1", "p1", "6-2, 7-5", 42, 100, true),
  mkM("m26", "p9", "p3", "p3", "6-1, 6-4", 40, 100, true, false, null, "Hierba"),
  mkM("m27", "p2", "p6", "p2", "6-4, 6-2", 38, 100, true, false, null, "Tierra"),
  mkM("m28", "p5", "p9", "p5", "6-3, 6-4", 36, 100, true),
  mkM("m29", "p4", "p10", "p4", "7-6, 6-3", 34, 100, true),
  mkM("m30", "p8", "p3", "p3", "6-2, 6-4", 32, 100, true, false, null, "Tierra"),
  mkM("m31", "p1", "p6", "p6", "4-6, 6-3, 7-5", 30, 100, true, false, null, "Hierba"),
  mkM("m32", "p7", "p2", "p7", "6-3, 6-4", 28, 100, true),
  mkM("m33", "p10", "p5", "p5", "3-6, 6-2, 6-4", 26, 100, true, false, null, "Tierra"),
  mkM("m34", "p3", "p7", "p3", "6-4, 7-6", 24, 100, true),
  mkM("m35", "p1", "p4", "p1", "6-1, 6-2", 22, 100, true),
  mkM("m36", "p2", "p8", "p2", "6-3, 6-1", 20, 100, true, false, null, "Tierra"),
  mkM("m37", "p5", "p6", "p5", "6-4, 6-3", 18, 100, true, false, null, "Hierba"),
  mkM("m38", "p9", "p4", "p9", "6-7, 7-5, 6-4", 16, 100, true),
  mkM("m39", "p10", "p7", "p7", "6-3, 6-2", 14, 100, true, false, null, "Tierra"),
  mkM("m40", "p1", "p10", "p1", "6-0, 6-3", 12, 100, true),
  mkM("m41", "p10", "p1", "p1", "6-4, 7-6", 14, 100, true, true),
  // Tournament matches (league phase + playoffs)
  ...[
    ["tl1", "p1", "p2", "p1", "6-4, 6-3", 9], ["tl2", "p3", "p4", "p3", "6-2, 6-1", 9],
    ["tl3", "p5", "p6", "p5", "7-5, 6-4", 9], ["tl4", "p7", "p8", "p7", "6-3, 6-4", 9],
    ["tl5", "p9", "p10", "p10", "6-4, 7-6", 9], ["tl6", "p1", "p3", "p1", "6-3, 6-2", 8],
    ["tl7", "p2", "p5", "p5", "6-7, 6-3, 6-4", 8], ["tl8", "p4", "p7", "p7", "6-4, 3-6, 7-5", 8],
    ["tl9", "p6", "p9", "p6", "6-2, 6-3", 8], ["tl10", "p8", "p10", "p10", "7-6, 6-4", 8],
    ["tl11", "p1", "p5", "p1", "6-1, 6-3", 7], ["tl12", "p3", "p7", "p3", "6-4, 6-3", 7],
    ["tl13", "p2", "p6", "p2", "6-3, 6-4", 7], ["tl14", "p4", "p10", "p4", "6-2, 6-1", 7],
    ["tl15", "p8", "p9", "p8", "6-4, 6-7, 7-5", 7],
    ["tq1", "p1", "p8", "p1", "6-2, 6-3", 5], ["tq2", "p3", "p6", "p3", "6-4, 6-1", 5],
    ["tq3", "p5", "p4", "p5", "7-5, 6-4", 5], ["tq4", "p7", "p2", "p7", "6-3, 7-6", 5],
    ["ts1", "p1", "p7", "p1", "6-4, 3-6, 7-5", 3], ["ts2", "p3", "p5", "p3", "6-2, 6-4", 3],
    ["tf1", "p1", "p3", "p1", "7-6, 4-6, 7-5", 1],
  ].map(([id, a, b, w, sc, da]) =>
    mkM(id, a, b, w, sc, da, 0, false, false, "t1", "Dura")
  ),
];

const sLS = sortLg(
  seedPlayers.map((p) => p.id),
  seedMatches
    .filter((m) => m.tournamentId === "t1" && m.id.startsWith("tl"))
    .map((m) => ({ ...m, phase: "league" }))
);

export const seedTournament = {
  id: "t1",
  name: "Masters Primavera 2026",
  format: "league",
  playoffStart: "qf",
  status: "finished",
  ptsDist: { w: 500, f: 300, sf: 150, qf: 75 },
  players: seedPlayers.map((p) => p.id),
  createdAt: dB(10),
  leagueStandings: sLS,
  leagueFinished: true,
  bracket: {
    qf: [
      { p1: "p1", p2: "p8", winner: "p1", score: "6-2, 6-3", status: "confirmed" },
      { p1: "p3", p2: "p6", winner: "p3", score: "6-4, 6-1", status: "confirmed" },
      { p1: "p2", p2: "p7", winner: "p7", score: "6-3, 7-6", status: "confirmed" },
      { p1: "p4", p2: "p5", winner: "p5", score: "7-5, 6-4", status: "confirmed" },
    ],
    sf: [
      { p1: "p1", p2: "p3", winner: "p1", score: "6-4, 3-6, 7-5", status: "confirmed" },
      { p1: "p7", p2: "p5", winner: "p3", score: "6-2, 6-4", status: "confirmed" },
    ],
    final: [
      { p1: "p1", p2: "p3", winner: "p1", score: "7-6, 4-6, 7-5", status: "confirmed" },
    ],
  },
  matches: seedMatches
    .filter((m) => m.tournamentId === "t1")
    .map((m) => ({
      id: m.id,
      player1: m.player1,
      player2: m.player2,
      winner: m.winner,
      score: m.score,
      date: m.date,
      phase: m.id.startsWith("tl")
        ? "league"
        : m.id.startsWith("tq")
        ? "qf"
        : m.id.startsWith("ts")
        ? "sf"
        : "final",
      status: "confirmed",
    })),
};

export const DEFAULT_STATE = {
  players: [],
  matches: [],
  tournaments: [],
  challenges: [],
  pending: [],
  config: { ...DEFAULT_CONFIG },
  adminPw: "admin123",
  rules: RULES_WITH_EXAMPLES,
};

export const DEMO_STATE = {
  ...DEFAULT_STATE,
  players: seedPlayers,
  matches: seedMatches,
  tournaments: [seedTournament],
};
