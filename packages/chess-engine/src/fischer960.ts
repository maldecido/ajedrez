/**
 * Generador de posiciones Fischer960 por numeracion de Scharnagl (0..959).
 *
 * El algoritmo descompone el numero en cuatro decisiones sucesivas, y por
 * construccion garantiza las dos reglas de la variante: los alfiles caen en
 * casillas de color opuesto y el rey queda entre las dos torres.
 */

/** Numero de posiciones distintas de la variante. */
export const FISCHER960_COUNT = 960;

/** Numero de Scharnagl de la posicion inicial estandar (RNBQKBNR). */
export const STANDARD_SCHARNAGL_NUMBER = 518;

/** Columnas de casilla clara en la primera fila: b, d, f, h. */
const LIGHT_SQUARE_FILES = [1, 3, 5, 7];
/** Columnas de casilla oscura en la primera fila: a, c, e, g. */
const DARK_SQUARE_FILES = [0, 2, 4, 6];

/**
 * Colocacion de los dos caballos entre las 5 casillas que quedan libres,
 * indexada por el cociente final (0..9). Es la tabla estandar de Scharnagl.
 */
const KNIGHT_PLACEMENTS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 3],
  [2, 4],
  [3, 4],
];

/** Coloca `piece` en la n-esima casilla libre (0-indexada) de la fila. */
function placeInNthEmpty(rank: (string | null)[], n: number, piece: string): void {
  let seen = 0;
  for (let file = 0; file < rank.length; file += 1) {
    if (rank[file] !== null) continue;
    if (seen === n) {
      rank[file] = piece;
      return;
    }
    seen += 1;
  }
  throw new RangeError(`No hay ${n + 1} casillas libres en la fila`);
}

/**
 * Devuelve la primera fila (en minusculas, de la columna a a la h) que
 * corresponde al numero de Scharnagl indicado.
 */
export function fischer960BackRank(scharnaglNumber: number): string {
  if (
    !Number.isInteger(scharnaglNumber) ||
    scharnaglNumber < 0 ||
    scharnaglNumber >= FISCHER960_COUNT
  ) {
    throw new RangeError(
      `El numero de Scharnagl debe ser un entero entre 0 y 959, recibido: ${scharnaglNumber}`,
    );
  }

  const rank: (string | null)[] = new Array(8).fill(null);
  let remainder = scharnaglNumber;

  // 1. Alfil de casillas claras.
  rank[LIGHT_SQUARE_FILES[remainder % 4]] = "b";
  remainder = Math.floor(remainder / 4);

  // 2. Alfil de casillas oscuras. Al ir en columnas del otro color, los dos
  //    alfiles nunca pueden coincidir ni compartir color de casilla.
  rank[DARK_SQUARE_FILES[remainder % 4]] = "b";
  remainder = Math.floor(remainder / 4);

  // 3. Dama, entre las 6 casillas que siguen libres.
  placeInNthEmpty(rank, remainder % 6, "q");
  remainder = Math.floor(remainder / 6);

  // 4. Caballos, entre las 5 libres restantes. Se coloca primero el indice
  //    mayor: al quitar una casilla posterior, el indice menor no se desplaza.
  const [first, second] = KNIGHT_PLACEMENTS[remainder];
  placeInNthEmpty(rank, second, "n");
  placeInNthEmpty(rank, first, "n");

  // 5. Las 3 casillas que quedan reciben torre, rey y torre en ese orden, con
  //    lo que el rey queda siempre entre ambas torres.
  for (const piece of ["r", "k", "r"]) {
    placeInNthEmpty(rank, 0, piece);
  }

  return rank.join("");
}

/**
 * FEN completo de la posicion inicial para el numero de Scharnagl dado.
 *
 * Los derechos de enroque salen como `KQkq`, que es la convencion estandar de
 * la variante. Ojo: chess.js no implementa el enroque de Fischer960, asi que
 * para jugar hay que pasar el FEN por `withoutCastlingRights`.
 */
export function fischer960Fen(scharnaglNumber: number): string {
  const back = fischer960BackRank(scharnaglNumber);
  return `${back}/pppppppp/8/8/8/8/PPPPPPPP/${back.toUpperCase()} w KQkq - 0 1`;
}

/** Elige una posicion de la variante al azar. */
export function randomFischer960(): { scharnaglNumber: number; fen: string } {
  const scharnaglNumber = Math.floor(Math.random() * FISCHER960_COUNT);
  return { scharnaglNumber, fen: fischer960Fen(scharnaglNumber) };
}

/**
 * Quita los derechos de enroque de un FEN.
 *
 * Es un apaño temporal y consciente: chess.js acepta una posicion 960 con
 * `KQkq` pero no genera ningun enroque para ella, asi que dejar el derecho
 * puesto seria mentir sobre el estado de la partida. Se elimina cuando el
 * enroque de la variante este resuelto.
 */
export function withoutCastlingRights(fen: string): string {
  const parts = fen.split(" ");
  if (parts.length < 3) return fen;
  parts[2] = "-";
  return parts.join(" ");
}
