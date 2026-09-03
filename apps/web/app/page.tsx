import { GameScreen } from "@/components/game-screen";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ajedrez</h1>
        <p className="text-sm text-muted-foreground">
          Fase 2 — cronómetro oficial y Fischer960.
        </p>
      </header>

      <GameScreen />
    </main>
  );
}
