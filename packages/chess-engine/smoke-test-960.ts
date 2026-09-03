import { Chess } from "chess.js";

import {
  FISCHER960_COUNT,
  STANDARD_SCHARNAGL_NUMBER,
  fischer960BackRank,
  fischer960Fen,
  withoutCastlingRights,
} from "./src/fischer960";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ok    ${name}`);
  } else {
    failures += 1;
    console.log(`  FALLO ${name} ${detail}`);
  }
}

// --- La posicion 518 es la estandar ---------------------------------------
{
  const back = fischer960BackRank(STANDARD_SCHARNAGL_NUMBER);
  check("518 es la posicion estandar", back === "rnbqkbnr", `-> ${back}`);
}

// --- Barrido completo de las 960 ------------------------------------------
{
  const seen = new Set<string>();
  let allValid = true;
  let allBishopsSplit = true;
  let allKingBetweenRooks = true;
  let allPiecesRight = true;
  let firstBad = "";

  for (let n = 0; n < FISCHER960_COUNT; n += 1) {
    const back = fischer960BackRank(n);
    seen.add(back);

    // Recuento de piezas: 1 rey, 1 dama, 2 torres, 2 alfiles, 2 caballos.
    const counts: Record<string, number> = {};
    for (const c of back) counts[c] = (counts[c] ?? 0) + 1;
    if (
      back.length !== 8 ||
      counts.k !== 1 ||
      counts.q !== 1 ||
      counts.r !== 2 ||
      counts.b !== 2 ||
      counts.n !== 2
    ) {
      allPiecesRight = false;
      if (!firstBad) firstBad = `${n}: ${back}`;
    }

    // Los alfiles, en casillas de color opuesto.
    const bishops = [...back]
      .map((c, i) => (c === "b" ? i : -1))
      .filter((i) => i >= 0);
    if (bishops.length !== 2 || bishops[0] % 2 === bishops[1] % 2) {
      allBishopsSplit = false;
      if (!firstBad) firstBad = `${n}: ${back}`;
    }

    // El rey, entre las dos torres.
    const rooks = [...back].map((c, i) => (c === "r" ? i : -1)).filter((i) => i >= 0);
    const king = back.indexOf("k");
    if (!(rooks[0] < king && king < rooks[1])) {
      allKingBetweenRooks = false;
      if (!firstBad) firstBad = `${n}: ${back}`;
    }

    // chess.js debe poder cargar el FEN resultante.
    try {
      new Chess(withoutCastlingRights(fischer960Fen(n)));
    } catch {
      allValid = false;
      if (!firstBad) firstBad = `${n}: ${back}`;
    }
  }

  check("las 960 tienen el recuento correcto de piezas", allPiecesRight, firstBad);
  check("las 960 tienen alfiles en colores opuestos", allBishopsSplit, firstBad);
  check("las 960 tienen el rey entre las torres", allKingBetweenRooks, firstBad);
  check("las 960 las carga chess.js", allValid, firstBad);
  check("las 960 son distintas entre si", seen.size === 960, `-> ${seen.size}`);
}

// --- Rangos invalidos ------------------------------------------------------
{
  const rejects = (n: number) => {
    try {
      fischer960BackRank(n);
      return false;
    } catch {
      return true;
    }
  };
  check("rechaza -1", rejects(-1));
  check("rechaza 960", rejects(960));
  check("rechaza decimales", rejects(1.5));
}

// --- Derechos de enroque ---------------------------------------------------
{
  const fen = fischer960Fen(0);
  check("el FEN canonico trae KQkq", fen.split(" ")[2] === "KQkq", `-> ${fen}`);
  check(
    "withoutCastlingRights los quita",
    withoutCastlingRights(fen).split(" ")[2] === "-",
  );
}

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
