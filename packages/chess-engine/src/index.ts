export { ChessGame, DEFAULT_FEN } from "./game";
export type { ChessGameOptions, LegalMove } from "./game";
export type { CastlingSide } from "./castling960";
export {
  FISCHER960_COUNT,
  STANDARD_SCHARNAGL_NUMBER,
  fischer960BackRank,
  fischer960Fen,
  randomFischer960,
  withoutCastlingRights,
} from "./fischer960";
export type {
  Color,
  EngineEndReason,
  GameEndReason,
  GameMove,
  GameResult,
  GameStatus,
  MoveInput,
  PieceSymbol,
  PromotionPiece,
  Square,
} from "./types";
