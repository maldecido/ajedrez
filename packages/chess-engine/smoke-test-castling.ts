import { ChessGame } from "./src/game";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ok    ${name}`);
  } else {
    failures += 1;
    console.log(`  FALLO ${name} ${detail}`);
  }
}

/** Torres en c1 y h1, rey en f1. Ninguna en su casilla clasica. */
const BASE = "4k3/8/8/8/8/8/8/2R2K1R w KQ - 0 1";
const placement = (fen: string) => fen.split(" ")[0].split("/")[7];

// --- Enroque corto en una disposicion no estandar --------------------------
{
  const g = new ChessGame(BASE, { chess960: true });
  check(
    "el rey ofrece la torre como destino de enroque",
    g.legalTargets("f1").includes("h1"),
    `-> ${g.legalTargets("f1")}`,
  );

  const move = g.move({ from: "f1", to: "h1" });
  check("el enroque corto se aplica", move?.san === "O-O", `-> ${move?.san}`);
  check(
    "rey a g1 y torre a f1",
    placement(g.fen()) === "2R2RK1",
    `-> ${placement(g.fen())}`,
  );
  check("el turno pasa a las negras", g.turn() === "b");
  check("se pierden los dos derechos", g.fen().split(" ")[2] === "-", `-> ${g.fen()}`);
}

// --- Enroque largo ---------------------------------------------------------
{
  const g = new ChessGame(BASE, { chess960: true });
  const move = g.move({ from: "f1", to: "c1" });
  check("el enroque largo se aplica", move?.san === "O-O-O", `-> ${move?.san}`);
  check(
    "rey a c1 y torre a d1",
    placement(g.fen()) === "2KR3R",
    `-> ${placement(g.fen())}`,
  );
}

// --- Caso en que rey y torre se intercambian -------------------------------
{
  const g = new ChessGame("4k3/8/8/8/8/8/8/1R3KR1 w KQ - 0 1", { chess960: true });
  const move = g.move({ from: "f1", to: "g1" });
  check("enroque con rey y torre adyacentes", move?.san === "O-O", `-> ${move?.san}`);
  check(
    "se intercambian correctamente",
    placement(g.fen()) === "1R3RK1",
    `-> ${placement(g.fen())}`,
  );
}

// --- Camino ocupado --------------------------------------------------------
{
  const g = new ChessGame("4k3/8/8/8/8/8/8/2R2KNR w KQ - 0 1", { chess960: true });
  check("con g1 ocupada no hay enroque corto", !g.legalTargets("f1").includes("h1"));
  check("pero el largo sigue disponible", g.legalTargets("f1").includes("c1"));
  check("y si se pide igual, se rechaza", g.move({ from: "f1", to: "h1" }) === null);
}

// --- Rey en jaque ----------------------------------------------------------
{
  const g = new ChessGame("4kr2/8/8/8/8/8/8/2R2K1R w KQ - 0 1", { chess960: true });
  check("en jaque no se puede enrocar", !g.legalTargets("f1").includes("h1"));
  check("tampoco por el otro flanco", !g.legalTargets("f1").includes("c1"));
}

// --- El rey no puede cruzar una casilla atacada ----------------------------
{
  const g = new ChessGame("4k1r1/8/8/8/8/8/8/2R2K1R w KQ - 0 1", { chess960: true });
  check("con g1 atacada no hay enroque corto", !g.legalTargets("f1").includes("h1"));
  check("el largo, que va por otro lado, si", g.legalTargets("f1").includes("c1"));
}

// --- Perdida de derechos ---------------------------------------------------
{
  const g = new ChessGame(BASE, { chess960: true });
  g.move({ from: "f1", to: "e1" });
  g.move({ from: "e8", to: "d8" });
  check("mover el rey quita los dos derechos", g.fen().split(" ")[2] === "-");
  check("y ya no aparece el enroque", !g.legalTargets("e1").includes("h1"));
}
{
  const g = new ChessGame(BASE, { chess960: true });
  g.move({ from: "h1", to: "g1" });
  g.move({ from: "e8", to: "d8" });
  check(
    "mover una torre solo quita su flanco",
    g.fen().split(" ")[2] === "Q",
    `-> ${g.fen().split(" ")[2]}`,
  );
}
{
  // Torre negra en h8 captura la torre blanca de h1.
  const g = new ChessGame("4k2r/8/8/8/8/8/8/2R2K1R b KQkq - 0 1", { chess960: true });
  g.move({ from: "h8", to: "h1" });
  check(
    "capturar una torre quita el derecho de su dueno",
    // Las negras tambien pierden el suyo: su torre salio de h8, que en este
    // layout es su propia casilla de enroque.
    g.fen().split(" ")[2] === "Qq",
    `-> ${g.fen().split(" ")[2]}`,
  );
}

// --- Deshacer un enroque ---------------------------------------------------
{
  const g = new ChessGame(BASE, { chess960: true });
  const before = g.fen();
  g.move({ from: "f1", to: "h1" });
  check("deshacer devuelve true", g.undo());
  check("vuelve la posicion exacta", g.fen() === before, `-> ${g.fen()}`);
  check("y vuelven los derechos", g.legalTargets("f1").includes("h1"));
  check("el historial queda vacio", g.history().length === 0);
}

// --- PGN de la variante ----------------------------------------------------
{
  const g = new ChessGame(BASE, { chess960: true });
  g.move({ from: "f1", to: "h1" });
  const pgn = g.pgn();
  check("el PGN marca la variante", pgn.includes('[Variant "Chess960"]'), `-> ${pgn}`);
  check("incluye la posicion de partida", pgn.includes('[SetUp "1"]'));
  check("registra el enroque", pgn.includes("1. O-O"), `-> ${pgn}`);
}

// --- El modo estandar no cambia -------------------------------------------
{
  const g = new ChessGame();
  for (const m of [
    { from: "e2", to: "e4" },
    { from: "e7", to: "e5" },
    { from: "g1", to: "f3" },
    { from: "b8", to: "c6" },
    { from: "f1", to: "c4" },
    { from: "f8", to: "c5" },
  ] as const) {
    g.move(m);
  }
  const castle = g.move({ from: "e1", to: "g1" });
  check("el enroque clasico sigue funcionando", castle?.san === "O-O", `-> ${castle?.san}`);
  check(
    "el PGN clasico se numera bien",
    g.pgn().startsWith("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O"),
    `-> ${g.pgn()}`,
  );
  check("y no marca variante", !g.pgn().includes("Variant"));
}

// --- Repeticion, ahora contada por el propio motor -------------------------
{
  const g = new ChessGame();
  const cycle = [
    { from: "g1", to: "f3" },
    { from: "g8", to: "f6" },
    { from: "f3", to: "g1" },
    { from: "f6", to: "g8" },
  ] as const;
  for (const m of cycle) g.move(m);
  check("una vuelta no es repeticion", g.status().reason === null);
  for (const m of cycle) g.move(m);
  check(
    "dos vueltas dan triple repeticion",
    g.status().reason === "repetition",
    `-> ${g.status().reason}`,
  );
}

// --- El enroque solo se ofrece al bando que mueve, y va en ambos colores ---
{
  const g = new ChessGame(
    "2r2k1r/pppppppp/8/8/8/8/PPPPPPPP/2R2K1R w KQkq - 0 1",
    { chess960: true },
  );
  check("las blancas pueden enrocar por ambos flancos", 
    g.legalTargets("f1").includes("h1") && g.legalTargets("f1").includes("c1"));
  check("al rey negro no se le ofrece nada en turno blanco", g.legalTargets("f8").length === 0);

  g.move({ from: "a2", to: "a3" });
  check("ahora las negras pueden enrocar", 
    g.legalTargets("f8").includes("h8") && g.legalTargets("f8").includes("c8"));

  const black = g.move({ from: "f8", to: "h8" });
  check("el enroque negro se aplica", black?.san === "O-O", `-> ${black?.san}`);
  check(
    "rey negro a g8 y torre a f8",
    g.fen().split(" ")[0].split("/")[0] === "2r2rk1",
    `-> ${g.fen().split(" ")[0].split("/")[0]}`,
  );
}

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
