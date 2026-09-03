import type { GameEndReason, GameMove, GameResult } from "@ajedrez/chess-engine";

import type { TimeControl } from "@/lib/time-controls";

import { getSupabase } from "./client";

/** Oponente registrado por el jugador local. */
export interface Opponent {
  id: string;
  name: string;
}

/** Una partida ya cerrada, tal como se muestra en el historial. */
export interface GameSummary {
  id: string;
  mode: "standard" | "fischer960";
  scharnaglNumber: number | null;
  startedAt: string;
  result: GameResult | null;
  resultReason: GameEndReason | null;
  whiteName: string;
  blackName: string;
}

/** Quien juega con cada color. `opponentId` null significa jugador sin nombre. */
export interface SeatAssignment {
  /** El dueno de la partida ocupa uno de los dos asientos. */
  ownerColor: "w" | "b";
  opponentId: string | null;
  opponentName: string;
}

export interface CreateGameInput {
  ownerId: string;
  mode: "standard" | "fischer960";
  startFen: string;
  scharnaglNumber: number | null;
  timeControl: TimeControl | null;
  seats: SeatAssignment;
}

// --------------------------------------------------------------- oponentes --

export async function listOpponents(ownerId: string): Promise<Opponent[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("opponents")
    .select("id, name")
    .eq("owner_id", ownerId)
    .order("name");

  if (error) {
    console.warn("No se pudieron leer los oponentes:", error.message);
    return [];
  }
  return (data ?? []) as Opponent[];
}

export async function createOpponent(
  ownerId: string,
  name: string,
): Promise<Opponent | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("opponents")
    .insert({ owner_id: ownerId, name: name.trim() })
    .select("id, name")
    .single();

  if (error) {
    console.warn("No se pudo crear el oponente:", error.message);
    return null;
  }
  return data as Opponent;
}

// ------------------------------------------------------------------ ritmos --

/**
 * Resuelve el uuid del ritmo. Los oficiales ya estan sembrados y se buscan por
 * nombre; los personalizados se crean la primera vez que se usan.
 */
async function resolveTimeControlId(
  timeControl: TimeControl | null,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase || !timeControl) return null;

  const { data: existing } = await supabase
    .from("time_controls")
    .select("id")
    .eq("name", timeControl.name)
    .maybeSingle();

  if (existing) return (existing as { id: string }).id;
  if (timeControl.isOfficial) return null;

  const { data, error } = await supabase
    .from("time_controls")
    .insert({
      name: timeControl.name,
      category: "custom",
      initial_seconds: timeControl.initialSeconds,
      increment_seconds: timeControl.incrementSeconds,
      is_official: false,
    })
    .select("id")
    .single();

  if (error) {
    console.warn("No se pudo guardar el ritmo personalizado:", error.message);
    return null;
  }
  return (data as { id: string }).id;
}

// ---------------------------------------------------------------- partidas --

/** Crea la partida en curso. Devuelve su id, o `null` si no se pudo guardar. */
export async function createGame(input: CreateGameInput): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const timeControlId = await resolveTimeControlId(input.timeControl);
  const ownerIsWhite = input.seats.ownerColor === "w";

  const { data, error } = await supabase
    .from("games")
    .insert({
      owner_id: input.ownerId,
      mode: input.mode,
      start_fen: input.startFen,
      scharnagl_number: input.scharnaglNumber,
      time_control_id: timeControlId,
      white_player_id: ownerIsWhite ? input.ownerId : input.seats.opponentId,
      black_player_id: ownerIsWhite ? input.seats.opponentId : input.ownerId,
      // El dueno siempre esta registrado; el rival solo si tiene ficha propia.
      white_is_registered: ownerIsWhite,
      black_is_registered: !ownerIsWhite,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error) {
    console.warn("No se pudo crear la partida:", error.message);
    return null;
  }
  return (data as { id: string }).id;
}

/** Guarda una jugada con el tiempo que quedaba en ambos relojes. */
export async function appendMove(
  gameId: string,
  move: GameMove,
  clocks: { whiteMs: number | null; blackMs: number | null },
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("moves").insert({
    game_id: gameId,
    ply: move.ply,
    san: move.san,
    fen_after: move.fenAfter,
    white_clock_ms: clocks.whiteMs === null ? null : Math.round(clocks.whiteMs),
    black_clock_ms: clocks.blackMs === null ? null : Math.round(clocks.blackMs),
  });

  if (error) console.warn("No se pudo guardar la jugada:", error.message);
}

/**
 * Al deshacer, la jugada tambien desaparece de la base: si no, el historial
 * guardado dejaria de coincidir con la partida.
 */
export async function deleteMovesFrom(gameId: string, ply: number): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from("moves")
    .delete()
    .eq("game_id", gameId)
    .gte("ply", ply);

  if (error) console.warn("No se pudo borrar la jugada:", error.message);
}

/** Cierra la partida con su resultado y su motivo. */
export async function finishGame(
  gameId: string,
  result: GameResult,
  reason: GameEndReason,
  pgn: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from("games")
    .update({
      status: "finished",
      result,
      result_reason: reason,
      pgn,
      ended_at: new Date().toISOString(),
    })
    .eq("id", gameId);

  if (error) console.warn("No se pudo cerrar la partida:", error.message);
}

/** Historial de partidas terminadas, de la mas reciente a la mas antigua. */
export async function listFinishedGames(
  ownerId: string,
  limit = 20,
): Promise<GameSummary[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("games")
    .select(
      "id, mode, scharnagl_number, started_at, result, result_reason, white_player_id, black_player_id, white_is_registered",
    )
    .eq("owner_id", ownerId)
    .eq("status", "finished")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("No se pudo leer el historial:", error.message);
    return [];
  }

  const opponents = await listOpponents(ownerId);
  const nameById = new Map(opponents.map((o) => [o.id, o.name]));

  return (data ?? []).map((row) => {
    const game = row as {
      id: string;
      mode: "standard" | "fischer960";
      scharnagl_number: number | null;
      started_at: string;
      result: GameResult | null;
      result_reason: GameEndReason | null;
      white_player_id: string | null;
      black_player_id: string | null;
      white_is_registered: boolean;
    };

    const opponentId = game.white_is_registered
      ? game.black_player_id
      : game.white_player_id;
    const opponentName = opponentId
      ? (nameById.get(opponentId) ?? "Oponente")
      : "Invitado";

    return {
      id: game.id,
      mode: game.mode,
      scharnaglNumber: game.scharnagl_number,
      startedAt: game.started_at,
      result: game.result,
      resultReason: game.result_reason,
      whiteName: game.white_is_registered ? "Tú" : opponentName,
      blackName: game.white_is_registered ? opponentName : "Tú",
    };
  });
}
