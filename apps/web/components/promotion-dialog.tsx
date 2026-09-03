"use client";

import type { Color, PromotionPiece } from "@ajedrez/chess-engine";

const OPTIONS: { piece: PromotionPiece; label: string; glyph: Record<Color, string> }[] = [
  { piece: "q", label: "Dama", glyph: { w: "♕", b: "♛" } },
  { piece: "r", label: "Torre", glyph: { w: "♖", b: "♜" } },
  { piece: "b", label: "Alfil", glyph: { w: "♗", b: "♝" } },
  { piece: "n", label: "Caballo", glyph: { w: "♘", b: "♞" } },
];

interface PromotionDialogProps {
  /** Color que corona: define el glifo que se muestra. */
  color: Color;
  onSelect: (piece: PromotionPiece) => void;
  onCancel: () => void;
}

export function PromotionDialog({ color, onSelect, onCancel }: PromotionDialogProps) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Elegir pieza de coronacion"
    >
      <div className="rounded-lg border bg-card p-4 shadow-lg">
        <p className="mb-3 text-center text-sm font-medium">Corona a:</p>
        <div className="flex gap-2">
          {OPTIONS.map(({ piece, label, glyph }) => (
            <button
              key={piece}
              type="button"
              onClick={() => onSelect(piece)}
              aria-label={label}
              title={label}
              className="flex h-16 w-16 items-center justify-center rounded-md border text-4xl leading-none transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {glyph[color]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full rounded-md py-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
