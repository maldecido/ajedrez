import type { LegalMove } from "@ajedrez/chess-engine";

import type { VoiceCommand } from "./parse";

/** Resultado de contrastar lo dictado con lo que se puede jugar. */
export type VoiceResolution =
  | { status: "move"; move: LegalMove }
  /** Lo dictado encaja con varias jugadas legales: hay que preguntar. */
  | { status: "ambiguous"; candidates: LegalMove[] }
  /** Se entendio, pero esa jugada no es legal en esta posicion. */
  | { status: "illegal" }
  | { status: "resign" }
  | { status: "offer_draw" }
  | { status: "accept_draw" }
  | { status: "unrecognized" };

/**
 * Resuelve un comando contra las jugadas legales.
 *
 * Nunca inventa: si lo dictado no corresponde a ninguna jugada legal lo dice,
 * y si corresponde a varias tampoco elige por su cuenta. Un error de dictado
 * no debe mover una pieza que el jugador no queria.
 */
export function resolveCommand(
  command: VoiceCommand,
  legalMoves: LegalMove[],
): VoiceResolution {
  switch (command.kind) {
    case "unknown":
      return { status: "unrecognized" };
    case "resign":
      return { status: "resign" };
    case "offer_draw":
      return { status: "offer_draw" };
    case "accept_draw":
      return { status: "accept_draw" };

    case "castle": {
      const move = legalMoves.find(
        (candidate) => candidate.isCastling && candidate.castlingSide === command.side,
      );
      return move ? { status: "move", move } : { status: "illegal" };
    }

    case "move": {
      let candidates = legalMoves.filter((move) => move.to === command.to);

      if (command.from) {
        candidates = candidates.filter((move) => move.from === command.from);
      }
      if (command.piece) {
        candidates = candidates.filter((move) => move.piece === command.piece);
      }
      if (command.promotion) {
        candidates = candidates.filter((move) => move.promotion === command.promotion);
      }

      if (candidates.length === 0) return { status: "illegal" };
      if (candidates.length === 1) return { status: "move", move: candidates[0] };

      // Varias coronaciones al mismo destino y no se dijo a que pieza: no se
      // asume dama, se pregunta.
      return { status: "ambiguous", candidates };
    }
  }
}

/** Atajo: interpreta y resuelve en un paso. */
export function resolveTranscript(
  command: VoiceCommand,
  legalMoves: LegalMove[],
): VoiceResolution {
  return resolveCommand(command, legalMoves);
}
