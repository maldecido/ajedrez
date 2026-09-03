"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LegalMove } from "@ajedrez/chess-engine";
import { parseTranscript, resolveCommand, type VoiceResolution } from "@ajedrez/voice";

import { Button } from "@/components/ui/button";
import {
  SPEECH_LANG,
  getSpeechRecognition,
  type SpeechRecognitionErrorEvent,
  type SpeechRecognitionEvent,
  type SpeechRecognitionLike,
} from "@/lib/speech";
import { useGameStore } from "@/store/game-store";

type Feedback =
  | { kind: "idle" }
  | { kind: "listening" }
  | { kind: "resolved"; transcript: string; resolution: VoiceResolution }
  | { kind: "error"; message: string };

export function VoiceControl() {
  const phase = useGameStore((state) => state.phase);
  const legalMoves = useGameStore((state) => state.legalMoves);
  const tryMove = useGameStore((state) => state.tryMove);
  const resign = useGameStore((state) => state.resign);
  const agreeDraw = useGameStore((state) => state.agreeDraw);
  const turn = useGameStore((state) => state.status.turn);

  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle" });
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // El resolutor necesita las jugadas del momento en que se habla, no las de
  // cuando se creo el reconocedor.
  const legalMovesRef = useRef<LegalMove[]>(legalMoves);
  legalMovesRef.current = legalMoves;

  useEffect(() => {
    const Recognition = getSpeechRecognition();
    setIsSupported(Recognition !== null);
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = SPEECH_LANG;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];

      // Se prueban todas las alternativas y se usa la primera que dé una
      // jugada legal: el reconocedor acierta a menudo en la segunda opción.
      let best: { transcript: string; resolution: VoiceResolution } | null = null;
      for (let i = 0; i < result.length; i += 1) {
        const transcript = result[i].transcript;
        const resolution = resolveCommand(
          parseTranscript(transcript),
          legalMovesRef.current,
        );
        if (!best) best = { transcript, resolution };
        if (resolution.status !== "unrecognized" && resolution.status !== "illegal") {
          best = { transcript, resolution };
          break;
        }
      }

      if (best) {
        setFeedback({ kind: "resolved", ...best });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const message =
        event.error === "not-allowed"
          ? "Falta permiso para usar el micrófono."
          : event.error === "no-speech"
            ? "No se escuchó nada."
            : `Error de reconocimiento: ${event.error}`;
      setFeedback({ kind: "error", message });
    };

    recognition.onend = () => {
      setFeedback((current) =>
        current.kind === "listening" ? { kind: "idle" } : current,
      );
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      setFeedback({ kind: "listening" });
      recognition.start();
    } catch {
      // start() lanza si ya estaba escuchando; no es un error que mostrar.
    }
  }, []);

  function applyResolution(resolution: VoiceResolution, move?: LegalMove) {
    if (resolution.status === "resign") {
      resign(turn);
    } else if (resolution.status === "offer_draw" || resolution.status === "accept_draw") {
      agreeDraw();
    } else if (move) {
      tryMove(move.from, move.to, move.promotion);
    }
    setFeedback({ kind: "idle" });
  }

  if (phase !== "playing") return null;

  if (isSupported === false) {
    return (
      <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        Este navegador no reconoce voz (funciona en Chrome y Edge). Se puede
        jugar con el tablero con normalidad.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={feedback.kind === "listening" ? "default" : "outline"}
        size="sm"
        onClick={startListening}
        disabled={feedback.kind === "listening"}
      >
        {feedback.kind === "listening" ? "Escuchando…" : "Dictar jugada"}
      </Button>

      {feedback.kind === "error" && (
        <p className="text-xs text-destructive">{feedback.message}</p>
      )}

      {feedback.kind === "resolved" && (
        <ResolutionPanel
          transcript={feedback.transcript}
          resolution={feedback.resolution}
          onConfirm={applyResolution}
          onDismiss={() => setFeedback({ kind: "idle" })}
        />
      )}
    </div>
  );
}

interface ResolutionPanelProps {
  transcript: string;
  resolution: VoiceResolution;
  onConfirm: (resolution: VoiceResolution, move?: LegalMove) => void;
  onDismiss: () => void;
}

/**
 * Nada se aplica solo: un error de dictado no debe mover una pieza que el
 * jugador no queria, asi que siempre se confirma antes.
 */
function ResolutionPanel({
  transcript,
  resolution,
  onConfirm,
  onDismiss,
}: ResolutionPanelProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">
        Se escuchó: <span className="italic">“{transcript}”</span>
      </p>

      {resolution.status === "move" && (
        <>
          <p className="text-sm font-semibold">{resolution.move.san}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onConfirm(resolution, resolution.move)}>
              Confirmar
            </Button>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Descartar
            </Button>
          </div>
        </>
      )}

      {resolution.status === "ambiguous" && (
        <>
          <p className="text-sm">¿Cuál de estas?</p>
          <div className="flex flex-wrap gap-2">
            {resolution.candidates.map((candidate) => (
              <Button
                key={candidate.san}
                variant="outline"
                size="sm"
                onClick={() => onConfirm(resolution, candidate)}
              >
                {candidate.san}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Descartar
            </Button>
          </div>
        </>
      )}

      {(resolution.status === "resign" ||
        resolution.status === "offer_draw" ||
        resolution.status === "accept_draw") && (
        <>
          <p className="text-sm font-semibold">
            {resolution.status === "resign" ? "Abandonar la partida" : "Tablas acordadas"}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onConfirm(resolution)}>
              Confirmar
            </Button>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Descartar
            </Button>
          </div>
        </>
      )}

      {(resolution.status === "illegal" || resolution.status === "unrecognized") && (
        <>
          <p className="text-sm">
            {resolution.status === "illegal"
              ? "Esa jugada no es legal en esta posición."
              : "No se entendió la jugada."}
          </p>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Cerrar
          </Button>
        </>
      )}
    </div>
  );
}
