"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createOpponent, listOpponents, type Opponent } from "@/lib/supabase/repository";
import { ensureSession } from "@/lib/supabase/session";

interface OpponentPickerProps {
  /** `null` significa jugar contra un invitado, sin ficha guardada. */
  value: Opponent | null;
  onChange: (opponent: Opponent | null) => void;
}

export function OpponentPicker({ value, onChange }: OpponentPickerProps) {
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [newName, setNewName] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    void ensureSession().then(async (identity) => {
      if (!active) return;
      if (!identity) {
        setIsReady(true);
        return;
      }
      setOwnerId(identity.profileId);
      const list = await listOpponents(identity.profileId);
      if (active) {
        setOpponents(list);
        setIsReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleCreate() {
    const name = newName.trim();
    if (!name || !ownerId || isSaving) return;

    setIsSaving(true);
    const created = await createOpponent(ownerId, name);
    setIsSaving(false);

    if (!created) return;
    setOpponents((current) =>
      [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setNewName("");
    onChange(created);
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Oponente</h2>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={`rounded-md border px-3 py-2 text-sm transition-colors ${
            value === null
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-accent"
          }`}
        >
          Invitado
        </button>

        {opponents.map((opponent) => (
          <button
            key={opponent.id}
            type="button"
            onClick={() => onChange(opponent)}
            aria-pressed={value?.id === opponent.id}
            className={`rounded-md border px-3 py-2 text-sm transition-colors ${
              value?.id === opponent.id
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            {opponent.name}
          </button>
        ))}
      </div>

      {ownerId && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="Añadir oponente"
            maxLength={60}
            className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreate}
            disabled={!newName.trim() || isSaving}
          >
            Añadir
          </Button>
        </div>
      )}

      {isReady && !ownerId && (
        <p className="text-xs text-muted-foreground">
          Sin conexión con Supabase: se puede jugar, pero la partida no se
          guardará ni se podrán registrar oponentes.
        </p>
      )}
    </section>
  );
}
