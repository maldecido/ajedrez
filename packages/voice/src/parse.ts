import type { PieceSymbol, PromotionPiece, Square } from "@ajedrez/chess-engine";

import { PIECE_TOKEN_PREFIX, joinSquares, tokenize } from "./normalize";

/** Lo que el jugador quiso decir, antes de contrastarlo con la posicion. */
export type VoiceCommand =
  | {
      kind: "move";
      piece?: PieceSymbol;
      /** Casilla de salida, si se dicto ("de e2 a e4"). */
      from?: Square;
      to: Square;
      promotion?: PromotionPiece;
      isCapture: boolean;
    }
  | { kind: "castle"; side: "k" | "q" }
  | { kind: "resign" }
  | { kind: "offer_draw" }
  | { kind: "accept_draw" }
  | { kind: "unknown" };

const SQUARE_PATTERN = /^[a-h][1-8]$/;

/** Palabras que indican captura. "por" es como se dice al dictar: "torre por d5". */
const CAPTURE_WORDS = new Set(["captura", "capturo", "come", "toma", "por", "x"]);

function isSquare(token: string): token is Square {
  return SQUARE_PATTERN.test(token);
}

/**
 * Interpreta una transcripcion.
 *
 * Devuelve la intencion, no una jugada validada: quien decide si es legal es
 * `resolveCommand`, contrastandola con la posicion.
 */
export function parseTranscript(transcript: string): VoiceCommand {
  const tokens = joinSquares(tokenize(transcript));
  if (tokens.length === 0) return { kind: "unknown" };

  const text = tokens.join(" ");

  // --- comandos de partida, antes que nada -------------------------------
  if (/\brindo\b|\babandono\b|\bme rindo\b/.test(text)) return { kind: "resign" };
  if (/\bacepto\b/.test(text) && /\btablas\b/.test(text)) {
    return { kind: "accept_draw" };
  }
  if (/\btablas\b/.test(text)) return { kind: "offer_draw" };

  // --- enroque ------------------------------------------------------------
  if (/\benroque\b|\benroco\b|\benrocar\b/.test(text)) {
    // "enroque de dama" es el largo. Ojo: para entonces "dama" ya se
    // normalizo a token de pieza, asi que hay que buscarlo como tal y no
    // como palabra, que era lo que fallaba.
    const side =
      /\blargo\b/.test(text) || text.includes(`${PIECE_TOKEN_PREFIX}q`) ? "q" : "k";
    return { kind: "castle", side };
  }

  // --- jugada normal ------------------------------------------------------
  const squares = tokens.filter(isSquare);
  if (squares.length === 0) return { kind: "unknown" };

  const pieceTokens = tokens.filter((t) => t.startsWith(PIECE_TOKEN_PREFIX));
  const piece = pieceTokens[0]?.slice(PIECE_TOKEN_PREFIX.length) as
    | PieceSymbol
    | undefined;

  // "corona a dama": la pieza de coronacion es la ULTIMA mencionada, porque la
  // primera puede ser la que mueve ("peon e8 corona a dama").
  const promotion = /\bcorona\b|\bcoronar\b|\bpromociona\b/.test(text)
    ? (pieceTokens.at(-1)?.slice(PIECE_TOKEN_PREFIX.length) as PromotionPiece | undefined)
    : undefined;

  // La casilla de destino es siempre la ultima dictada.
  const to = squares[squares.length - 1];
  const from = squares.length >= 2 ? squares[squares.length - 2] : undefined;

  return {
    kind: "move",
    // Si hay coronacion, la pieza mencionada describe a que corona, no que
    // mueve: mueve un peon por definicion.
    piece: promotion ? "p" : piece,
    from,
    to,
    promotion,
    isCapture: tokens.some((t) => CAPTURE_WORDS.has(t)),
  };
}
