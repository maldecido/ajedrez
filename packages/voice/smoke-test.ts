import { ChessGame } from "@ajedrez/chess-engine";

import { parseTranscript } from "./src/parse";
import { resolveCommand } from "./src/resolve";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(ok ? `  ok    ${name}` : `  FALLO ${name} ${detail}`);
  if (!ok) failures += 1;
};

/** Dicta sobre una posicion y devuelve el SAN resultante, o el estado. */
function say(game: ChessGame, transcript: string): string {
  const resolution = resolveCommand(parseTranscript(transcript), game.legalMoves());
  return resolution.status === "move" ? resolution.move.san : resolution.status;
}

// --- La misma jugada dictada de todas las formas posibles ------------------
{
  const g = new ChessGame();
  for (const phrase of [
    "e4",
    "e cuatro",
    "peon e4",
    "peon a e cuatro",
    "peón a E4",
    "muevo el peon a e cuatro",
  ]) {
    check(`"${phrase}" -> e4`, say(g, phrase) === "e4", `-> ${say(g, phrase)}`);
  }
}

// --- Piezas ----------------------------------------------------------------
{
  const g = new ChessGame();
  check('"caballo f3" -> Nf3', say(g, "caballo f3") === "Nf3", `-> ${say(g, "caballo f3")}`);
  check('"caballo a efe tres" -> Nf3', say(g, "caballo a efe tres") === "Nf3");
  check('"caballito a ce tres" -> Nc3', say(g, "caballito a ce tres") === "Nc3");
}

// --- Desambiguacion por casilla de salida ---------------------------------
{
  // Dos caballos pueden ir a d2: el de b1 y el de f3.
  const g = new ChessGame("rnbqkbnr/pppppppp/8/8/8/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 1");
  check("sin origen, dos caballos a d2 es ambiguo", say(g, "caballo d2") === "ambiguous");
  check(
    "con origen se resuelve",
    say(g, "caballo de b1 a d2") === "Nbd2",
    `-> ${say(g, "caballo de b1 a d2")}`,
  );
  check(
    "y por el otro caballo tambien",
    say(g, "caballo de f3 a d2") === "Nfd2",
    `-> ${say(g, "caballo de f3 a d2")}`,
  );
}

// --- La columna d, que se dicta "de" ---------------------------------------
{
  const g = new ChessGame();
  check('"de cuatro" -> d4', say(g, "de cuatro") === "d4", `-> ${say(g, "de cuatro")}`);
  check(
    '"peon a de cuatro" -> d4',
    say(g, "peon a de cuatro") === "d4",
    `-> ${say(g, "peon a de cuatro")}`,
  );
  check(
    '"de" como preposicion no estorba',
    say(g, "caballo de ge uno a efe tres") === "Nf3",
    `-> ${say(g, "caballo de ge uno a efe tres")}`,
  );
}

// --- Capturas --------------------------------------------------------------
{
  const g = new ChessGame("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1");
  check('"peon por d5" -> exd5', say(g, "peon por d5") === "exd5", `-> ${say(g, "peon por d5")}`);
  check('"captura en d5" -> exd5', say(g, "captura en d5") === "exd5");
}

// --- Enroque ---------------------------------------------------------------
{
  const g = new ChessGame("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  check('"enroque corto" -> O-O', say(g, "enroque corto") === "O-O");
  check('"enroque largo" -> O-O-O', say(g, "enroque largo") === "O-O-O");
  check('"enroco" sin decir flanco asume corto', say(g, "enroco") === "O-O");
}

// --- Enroque en Fischer960 -------------------------------------------------
{
  const g = new ChessGame("4k3/8/8/8/8/8/8/2R2K1R w KQ - 0 1", { chess960: true });
  check('"enroque corto" en 960 -> O-O', say(g, "enroque corto") === "O-O");
  check('"enroque largo" en 960 -> O-O-O', say(g, "enroque largo") === "O-O-O");
}

// --- Coronacion ------------------------------------------------------------
{
  const g = new ChessGame("8/P6k/8/8/8/8/8/K7 w - - 0 1");
  check(
    "sin decir a que corona, es ambiguo",
    say(g, "peon a ocho") === "ambiguous" || say(g, "a8") === "ambiguous",
    `-> ${say(g, "a8")}`,
  );
  check(
    '"a8 corona a dama" -> a8=Q',
    say(g, "a ocho corona a dama") === "a8=Q",
    `-> ${say(g, "a ocho corona a dama")}`,
  );
  check(
    '"corona a caballo" -> a8=N',
    say(g, "a ocho corona a caballo") === "a8=N",
    `-> ${say(g, "a ocho corona a caballo")}`,
  );
}

// --- Comandos de partida ---------------------------------------------------
{
  const g = new ChessGame();
  check('"me rindo"', say(g, "me rindo") === "resign");
  check('"abandono"', say(g, "abandono") === "resign");
  check('"ofrezco tablas"', say(g, "ofrezco tablas") === "offer_draw");
  check('"acepto tablas"', say(g, "acepto tablas") === "accept_draw");
}

// --- Lo que no se debe aceptar --------------------------------------------
{
  const g = new ChessGame();
  check("jugada ilegal se rechaza", say(g, "torre a h5") === "illegal", `-> ${say(g, "torre a h5")}`);
  check("ruido no reconocido", say(g, "hola que tal") === "unrecognized", `-> ${say(g, "hola que tal")}`);
  check("silencio no reconocido", say(g, "") === "unrecognized");
  check(
    "un destino imposible no mueve nada",
    say(g, "peon a e cinco") === "illegal",
    `-> ${say(g, "peon a e cinco")}`,
  );
}

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
