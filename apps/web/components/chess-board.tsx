"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import type { PromotionPiece, Square } from "@ajedrez/chess-engine";

import { PromotionDialog } from "@/components/promotion-dialog";
import { useGameStore } from "@/store/game-store";

// react-chessboard mide el contenedor al montar, asi que necesita el DOM real.
// Sin ssr:false el marcado del servidor no coincide con el del cliente.
const Chessboard = dynamic(
  () => import("react-chessboard").then((mod) => mod.Chessboard),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-square w-full animate-pulse rounded-md bg-muted" />
    ),
  },
);

const SELECTED_STYLE = { background: "rgba(255, 216, 102, 0.55)" };
const TARGET_STYLE = {
  background:
    "radial-gradient(circle, rgba(20, 85, 30, 0.35) 22%, transparent 25%)",
};
const CAPTURE_STYLE = {
  background:
    "radial-gradient(circle, transparent 52%, rgba(20, 85, 30, 0.35) 55%)",
};

export function ChessBoard() {
  const fen = useGameStore((state) => state.fen);
  const selectedSquare = useGameStore((state) => state.selectedSquare);
  const legalTargets = useGameStore((state) => state.legalTargets);
  const boardOrientation = useGameStore((state) => state.boardOrientation);
  const pendingPromotion = useGameStore((state) => state.pendingPromotion);
  const selectSquare = useGameStore((state) => state.selectSquare);
  const tryMove = useGameStore((state) => state.tryMove);
  const confirmPromotion = useGameStore((state) => state.confirmPromotion);
  const cancelPromotion = useGameStore((state) => state.cancelPromotion);
  const turn = useGameStore((state) => state.status.turn);

  // La casilla ocupada se marca con un anillo y la vacia con un punto, que es
  // la convencion habitual en las apps de ajedrez.
  const squareStyles = useMemo(() => {
    if (!selectedSquare) return {};

    const styles: Record<string, React.CSSProperties> = {
      [selectedSquare]: SELECTED_STYLE,
    };
    const occupied = new Set(
      fen
        .split(" ")[0]
        .split("/")
        .flatMap((row, rowIndex) => {
          const squares: string[] = [];
          let file = 0;
          for (const char of row) {
            if (/\d/.test(char)) {
              file += Number(char);
              continue;
            }
            squares.push(`${"abcdefgh"[file]}${8 - rowIndex}`);
            file += 1;
          }
          return squares;
        }),
    );

    for (const target of legalTargets) {
      styles[target] = occupied.has(target) ? CAPTURE_STYLE : TARGET_STYLE;
    }
    return styles;
  }, [selectedSquare, legalTargets, fen]);

  return (
    <div className="relative w-full max-w-[560px]">
      <Chessboard
        position={fen}
        boardOrientation={boardOrientation}
        onSquareClick={(square) => selectSquare(square as Square)}
        onPieceDrop={(from, to) => tryMove(from as Square, to as Square)}
        // La coronacion la gestiona el store, para que arrastrar y hacer clic
        // abran el mismo dialogo en lugar de dos distintos.
        onPromotionCheck={() => false}
        customSquareStyles={squareStyles}
        customBoardStyle={{
          borderRadius: "0.5rem",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.18)",
        }}
        customDarkSquareStyle={{ backgroundColor: "#779952" }}
        customLightSquareStyle={{ backgroundColor: "#edeed1" }}
      />

      {pendingPromotion && (
        <PromotionDialog
          color={turn}
          onSelect={(piece: PromotionPiece) => confirmPromotion(piece)}
          onCancel={cancelPromotion}
        />
      )}
    </div>
  );
}
