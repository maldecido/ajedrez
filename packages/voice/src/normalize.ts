/**
 * Normalizacion de lo que devuelve el reconocimiento de voz.
 *
 * El dictado en espanol llega de formas muy distintas para la misma jugada:
 * "alfil a efe cuatro", "alfil af4", "Alfil a F4", "alfil a efe 4". Aqui todo
 * eso se reduce a una misma cadena de tokens antes de intentar interpretarla.
 */

/** Quita acentos y pasa a minusculas. */
export function stripAccents(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Numeros dictados a digito. Solo hacen falta del uno al ocho. */
const NUMBER_WORDS: Record<string, string> = {
  uno: "1", una: "1", un: "1",
  dos: "2",
  tres: "3",
  cuatro: "4",
  cinco: "5",
  seis: "6",
  siete: "7",
  ocho: "8",
};

/**
 * Nombres de las columnas tal como se pronuncian. Se incluyen las confusiones
 * mas habituales del reconocedor: "hache" suele salir como "ache", y la "b"
 * dictada aparece como "be", "ve" o "uve".
 */
const FILE_WORDS: Record<string, string> = {
  a: "a",
  b: "b", be: "b", ve: "b", uve: "b",
  c: "c", ce: "c", se: "c",
  d: "d", de: "d",
  e: "e",
  f: "f", efe: "f",
  g: "g", ge: "g", je: "g",
  h: "h", hache: "h", ache: "h",
};

/** Palabras que no aportan nada y estorban al interpretar. */
// Ojo: "de" NO puede ir aqui. Es a la vez preposicion y el nombre de la
// columna d; si se descarta, "torre a de cuatro" pierde la letra. Se deja
// pasar a FILE_WORDS: cuando es preposicion queda como token suelto y se
// ignora igual, porque una letra solo forma casilla si le sigue un digito.
const FILLER = new Set([
  "el", "la", "los", "las", "un", "una", "del", "al", "y", "que",
  "por favor", "juego", "muevo", "mover", "va", "vamos", "pues", "eh",
]);

const PIECE_WORDS: Record<string, string> = {
  rey: "k",
  dama: "q", reina: "q",
  torre: "r",
  alfil: "b",
  caballo: "n", caballito: "n",
  peon: "p",
};

export const PIECE_TOKEN_PREFIX = "pieza:";

/**
 * Convierte la transcripcion en tokens normalizados.
 *
 * Las piezas se marcan con prefijo para que no se confundan con columnas: sin
 * eso, la "b" de alfil y la columna b serian el mismo token.
 */
export function tokenize(transcript: string): string[] {
  const cleaned = stripAccents(transcript)
    // "a f4" y "af4" deben dar lo mismo: se separan letras de digitos.
    .replace(/([a-h])\s*([1-8])/g, " $1$2 ")
    .replace(/[^a-z0-9\s]/g, " ");

  const tokens: string[] = [];

  for (const raw of cleaned.split(/\s+/)) {
    if (!raw || FILLER.has(raw)) continue;

    if (raw in PIECE_WORDS) {
      tokens.push(`${PIECE_TOKEN_PREFIX}${PIECE_WORDS[raw]}`);
      continue;
    }
    if (raw in NUMBER_WORDS) {
      tokens.push(NUMBER_WORDS[raw]);
      continue;
    }
    if (raw in FILE_WORDS) {
      tokens.push(FILE_WORDS[raw]);
      continue;
    }
    // Casilla ya pegada ("f4") o palabra suelta que se conserva por si es
    // parte de un comando ("enroque", "corto", "rindo"...).
    tokens.push(raw);
  }

  return tokens;
}

/**
 * Une los tokens sueltos de columna y fila en casillas: ["f", "4"] -> ["f4"].
 * Se hace en una pasada aparte porque el reconocedor separa casi siempre la
 * letra del numero.
 */
export function joinSquares(tokens: string[]): string[] {
  const result: string[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const next = tokens[i + 1];

    if (/^[a-h]$/.test(token) && next && /^[1-8]$/.test(next)) {
      result.push(token + next);
      i += 1;
      continue;
    }
    result.push(token);
  }

  return result;
}
