import { readFileSync } from "node:fs";

// Comprobacion end-to-end contra el proyecto real de Supabase: esquema, RLS,
// restricciones y politicas. Crea datos de prueba y los borra al terminar.
//
//   npx tsx scripts/supabase-e2e-check.ts
//
// Vive fuera de apps/web para que no entre en el build de la app.
//
// Verificacion contra la base real usando la API REST directamente. El SDK de
// Supabase necesita WebSocket nativo, que Node 20 no trae; el navegador si.
const env = Object.fromEntries(
  readFileSync("apps/web/.env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(ok ? `  ok    ${name}` : `  FALLO ${name} ${detail}`);
  if (!ok) failures += 1;
};

let token = KEY;

async function rest(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<{ status: number; body: any; range: string | null }> {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body, range: res.headers.get("content-range") };
}

async function main() {
  // 1. Catalogos: lectura publica, sin sesion.
  const positions = await rest("fischer960_positions?select=scharnagl_number&limit=1", {
    prefer: "count=exact",
  });
  check(
    "las 960 posiciones estan sembradas",
    positions.range?.endsWith("/960") ?? false,
    `-> ${positions.range}`,
  );

  const standard = await rest("fischer960_positions?scharnagl_number=eq.518&select=start_fen");
  check(
    "la 518 es la posicion estandar",
    standard.body?.[0]?.start_fen?.startsWith("rnbqkbnr/"),
    `-> ${standard.body?.[0]?.start_fen}`,
  );

  const controls = await rest("time_controls?select=name,category");
  check("los ritmos FIDE estan sembrados", (controls.body?.length ?? 0) >= 5,
    `-> ${controls.body?.length}`);

  // 2. Sin sesion, RLS debe cerrar las tablas privadas.
  const anonGames = await rest("games?select=id");
  check("sin sesion no se ven partidas", (anonGames.body?.length ?? 0) === 0,
    `-> ${JSON.stringify(anonGames.body)}`);

  // 3. Sesion anonima.
  const signup = await fetch(`${URL_BASE}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const session = await signup.json();
  if (!session.access_token) {
    check("sesion anonima", false,
      `-> ${session.msg ?? session.error_description ?? JSON.stringify(session)}`);
    console.log(`\n${failures} FALLOS`);
    process.exit(1);
  }
  token = session.access_token;
  const uid = session.user.id;
  check("sesion anonima creada", true);

  // 4. Perfil.
  const profile = await rest("profiles", {
    method: "POST", body: JSON.stringify({ id: uid }),
    prefer: "resolution=merge-duplicates,return=representation",
  });
  check("perfil creado", profile.status < 300, `-> ${JSON.stringify(profile.body)}`);

  // 5. Oponente.
  const opp = await rest("opponents", {
    method: "POST", body: JSON.stringify({ owner_id: uid, name: "Rival de prueba" }),
    prefer: "return=representation",
  });
  const oppId = opp.body?.[0]?.id;
  check("oponente creado", !!oppId, `-> ${JSON.stringify(opp.body)}`);

  // 6. Partida Fischer960.
  const game = await rest("games", {
    method: "POST",
    body: JSON.stringify({
      owner_id: uid, mode: "fischer960",
      start_fen: "bqnbnrkr/pppppppp/8/8/8/8/PPPPPPPP/BQNBNRKR w KQkq - 0 1",
      scharnagl_number: 0, white_player_id: uid, black_player_id: oppId,
      white_is_registered: true, black_is_registered: false, status: "in_progress",
    }),
    prefer: "return=representation",
  });
  const gameId = game.body?.[0]?.id;
  check("partida creada", !!gameId, `-> ${JSON.stringify(game.body)}`);

  // 7. Jugada con los dos relojes.
  const move = await rest("moves", {
    method: "POST",
    body: JSON.stringify({
      game_id: gameId, ply: 1, san: "O-O",
      fen_after: "bqnbnrkr/pppppppp/8/8/8/8/PPPPPPPP/BQNBNRRK b kq - 1 1",
      white_clock_ms: 297000, black_clock_ms: 300000,
    }),
  });
  check("jugada guardada con relojes", move.status < 300, `-> ${JSON.stringify(move.body)}`);

  // 8. Cierre con el motivo que el enum original NO tenia.
  const finish = await rest(`games?id=eq.${gameId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "finished", result: "draw", result_reason: "fifty_move",
      pgn: '[Variant "Chess960"]\n\n1. O-O 1/2-1/2', ended_at: new Date().toISOString(),
    }),
  });
  check("se acepta result_reason 'fifty_move'", finish.status < 300,
    `-> ${JSON.stringify(finish.body)}`);

  // 9. La restriccion de coherencia debe rechazar una partida mal cerrada.
  const bad = await rest("games", {
    method: "POST",
    body: JSON.stringify({
      owner_id: uid, mode: "standard", start_fen: "x", status: "finished",
      white_is_registered: true, black_is_registered: false,
    }),
  });
  check("rechaza partida terminada sin resultado", bad.status >= 400, "-> se aceptó");

  // 10. Un ritmo oficial falso debe rechazarse por la politica.
  const fakeOfficial = await rest("time_controls", {
    method: "POST",
    body: JSON.stringify({
      name: "Falso 1+1", category: "blitz", initial_seconds: 60,
      increment_seconds: 1, is_official: true,
    }),
  });
  check("no se puede colar un ritmo como oficial", fakeOfficial.status >= 400, "-> se aceptó");

  // 11. Un ritmo personalizado si.
  const custom = await rest("time_controls", {
    method: "POST",
    body: JSON.stringify({
      name: `Personalizado prueba ${Date.now()}`, category: "custom",
      initial_seconds: 600, increment_seconds: 5, is_official: false,
    }),
    prefer: "return=representation",
  });
  const customId = custom.body?.[0]?.id;
  check("se puede crear un ritmo personalizado", !!customId,
    `-> ${JSON.stringify(custom.body)}`);

  // 12. Historial y vista de estadisticas.
  const finished = await rest("games?status=eq.finished&select=id,result,result_reason");
  check("el historial se lee", (finished.body?.length ?? 0) === 1, `-> ${finished.body?.length}`);

  const stats = await rest("player_stats?select=*");
  check("player_stats se consulta", stats.status < 300, `-> ${JSON.stringify(stats.body)}`);
  check("player_stats solo devuelve lo propio (security_invoker)",
    (stats.body?.length ?? 0) <= 1, `-> ${stats.body?.length}`);

  // 13. Limpieza.
  await rest(`games?id=eq.${gameId}`, { method: "DELETE" });
  if (oppId) await rest(`opponents?id=eq.${oppId}`, { method: "DELETE" });
  const left = await rest("games?select=id");
  check("limpieza completada", (left.body?.length ?? 0) === 0, `-> ${left.body?.length}`);
  const movesLeft = await rest(`moves?game_id=eq.${gameId}&select=id`);
  check("las jugadas se borran en cascada", (movesLeft.body?.length ?? 0) === 0,
    `-> ${movesLeft.body?.length}`);

  console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLOS`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
