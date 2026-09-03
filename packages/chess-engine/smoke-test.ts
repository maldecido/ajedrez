import { ChessGame } from "@ajedrez/chess-engine";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ok    ${name}`);
  } else {
    failures += 1;
    console.log(`  FALLO ${name} ${detail}`);
  }
}

// --- Jugada legal e ilegal -------------------------------------------------
{
  const g = new ChessGame();
  const good = g.move({ from: "e2", to: "e4" });
  check("e4 es legal y devuelve SAN", good?.san === "e4", `-> ${good?.san}`);

  const bad = g.move({ from: "e4", to: "e7" });
  check("jugada ilegal devuelve null (no lanza)", bad === null);
  check(
    "el tablero no se ensucia tras la ilegal",
    g.history().length === 1,
    `-> ${g.history().length}`,
  );
}

// --- Destinos legales ------------------------------------------------------
{
  const g = new ChessGame();
  check(
    "el caballo b1 tiene 2 destinos",
    g.legalTargets("b1").sort().join(",") === "a3,c3",
    `-> ${g.legalTargets("b1")}`,
  );
  check("una casilla vacia no tiene destinos", g.legalTargets("e5").length === 0);
  check("una pieza rival no tiene destinos en tu turno", g.legalTargets("e7").length === 0);
}

// --- Jaque mate del loco ---------------------------------------------------
{
  const g = new ChessGame();
  for (const m of [
    { from: "f2", to: "f3" },
    { from: "e7", to: "e5" },
    { from: "g2", to: "g4" },
    { from: "d8", to: "h4" },
  ] as const) {
    g.move(m);
  }
  const s = g.status();
  check("mate detectado", s.isGameOver && s.reason === "checkmate", `-> ${s.reason}`);
  check("ganan las negras", s.result === "black", `-> ${s.result}`);
  check("el PGN registra el mate", g.pgn().includes("Qh4#"), `-> ${g.pgn()}`);
}

// --- Ahogado ---------------------------------------------------------------
{
  const g = new ChessGame("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  const s = g.status();
  check("ahogado detectado", s.reason === "stalemate", `-> ${s.reason}`);
  check("ahogado son tablas", s.result === "draw", `-> ${s.result}`);
  check("ahogado no es jaque", !s.isCheck);
}

// --- Material insuficiente -------------------------------------------------
{
  const s = new ChessGame("8/8/8/4k3/8/8/4K3/8 w - - 0 1").status();
  check("rey contra rey es tablas", s.reason === "insufficient_material", `-> ${s.reason}`);
}

// --- Coronacion ------------------------------------------------------------
{
  const g = new ChessGame("8/P6k/8/8/8/8/8/K7 w - - 0 1");
  check("a7-a8 se detecta como coronacion", g.isPromotion("a7", "a8"));
  check("a1-a2 no es coronacion", !g.isPromotion("a1", "a2"));
  check("el destino de coronacion no se duplica", g.legalTargets("a7").length === 1);

  const promoted = g.move({ from: "a7", to: "a8", promotion: "n" });
  check("corona a caballo", promoted?.san === "a8=N", `-> ${promoted?.san}`);
  check("la promocion queda registrada", promoted?.promotion === "n");
}

// --- Enroque ---------------------------------------------------------------
{
  const g = new ChessGame("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  const castle = g.move({ from: "e1", to: "g1" });
  check("enroque corto en SAN", castle?.san === "O-O", `-> ${castle?.san}`);
}

// --- Deshacer --------------------------------------------------------------
{
  const g = new ChessGame();
  const startFen = g.fen();
  g.move({ from: "e2", to: "e4" });
  check("deshacer devuelve true", g.undo());
  check("vuelve a la posicion inicial", g.fen() === startFen);
  check("sin jugadas, deshacer devuelve false", !g.undo());
}

// --- Turno y jaque ---------------------------------------------------------
{
  const g = new ChessGame();
  check("empiezan las blancas", g.turn() === "w");
  g.move({ from: "e2", to: "e4" });
  check("pasa el turno a las negras", g.turn() === "b");

  const check_ = new ChessGame("rnbqkbnr/ppp2ppp/8/1B1pp3/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 0 1");
  check("jaque detectado sin ser mate", check_.status().isCheck && !check_.status().isGameOver);
}

// --- Historial y FEN por jugada -------------------------------------------
{
  const g = new ChessGame();
  g.move({ from: "e2", to: "e4" });
  g.move({ from: "e7", to: "e5" });
  const h = g.history();
  check("historial con 2 jugadas", h.length === 2);
  check("ply numerado desde 1", h[0].ply === 1 && h[1].ply === 2);
  check("cada jugada guarda su FEN", h[1].fenAfter === g.fen());
  check("colores correctos", h[0].color === "w" && h[1].color === "b");
}

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
