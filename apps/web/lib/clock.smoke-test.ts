import {
  createClock,
  flaggedColor,
  formatClock,
  remainingMs,
  startClock,
  stopClock,
  switchClock,
} from "./clock";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ok    ${name}`);
  } else {
    failures += 1;
    console.log(`  FALLO ${name} ${detail}`);
  }
}

const T0 = 1_000_000;

// --- Estado inicial --------------------------------------------------------
{
  const c = createClock(300, 3);
  check("ambos empiezan con el tiempo inicial", c.whiteMs === 300_000 && c.blackMs === 300_000);
  check("arranca parado", c.running === null);
  check("guarda el incremento en ms", c.incrementMs === 3000);
}

// --- Descuento por tiempo real, no por ticks --------------------------------
{
  const c = startClock(createClock(300, 0), "w", T0);
  check("a los 10 s quedan 290", remainingMs(c, "w", T0 + 10_000) === 290_000);
  check("el rival no consume", remainingMs(c, "b", T0 + 10_000) === 300_000);
  check(
    "un salto grande se descuenta entero (sin deriva)",
    remainingMs(c, "w", T0 + 120_000) === 180_000,
    `-> ${remainingMs(c, "w", T0 + 120_000)}`,
  );
  check("nunca baja de cero", remainingMs(c, "w", T0 + 999_000) === 0);
}

// --- Incremento Fischer ----------------------------------------------------
{
  const c = startClock(createClock(300, 5), "w", T0);
  const after = switchClock(c, T0 + 10_000);
  check(
    "descuenta 10 s y suma 5 de incremento",
    after.whiteMs === 295_000,
    `-> ${after.whiteMs}`,
  );
  check("el turno pasa a las negras", after.running === "b");
  check("las negras siguen intactas", after.blackMs === 300_000);

  const back = switchClock(after, T0 + 14_000);
  check("las negras consumen 4 s y ganan 5", back.blackMs === 301_000, `-> ${back.blackMs}`);
  check("vuelve el turno a las blancas", back.running === "w");
  check("las blancas no cambian en el turno rival", back.whiteMs === 295_000);
}

// --- El incremento no revive un reloj agotado ------------------------------
{
  const c = startClock(createClock(10, 5), "w", T0);
  const after = switchClock(c, T0 + 10_000);
  check("sin tiempo no hay incremento", after.whiteMs === 0, `-> ${after.whiteMs}`);
}

// --- Parada ----------------------------------------------------------------
{
  const c = startClock(createClock(300, 0), "w", T0);
  const stopped = stopClock(c, T0 + 30_000);
  check("al parar congela el restante", stopped.whiteMs === 270_000);
  check("al parar deja de correr", stopped.running === null && stopped.anchor === null);
  check(
    "parado ya no consume mas",
    remainingMs(stopped, "w", T0 + 999_000) === 270_000,
  );
}

// --- Bandera ---------------------------------------------------------------
{
  const c = startClock(createClock(60, 0), "w", T0);
  check("sin agotar no hay bandera", flaggedColor(c, T0 + 59_000) === null);
  check("al agotarse cae la bandera del que corre", flaggedColor(c, T0 + 60_001) === "w");
  check("un reloj parado nunca cae", flaggedColor(stopClock(c, T0), T0 + 999_000) === null);
}

// --- Formato ---------------------------------------------------------------
{
  check("horas", formatClock(5_400_000) === "1:30:00", `-> ${formatClock(5_400_000)}`);
  check("minutos", formatClock(300_000) === "5:00", `-> ${formatClock(300_000)}`);
  check("segundos con cero", formatClock(65_000) === "1:05", `-> ${formatClock(65_000)}`);
  check("decimas por debajo de 20 s", formatClock(9_400) === "9.4", `-> ${formatClock(9_400)}`);
  check("negativo se muestra como cero", formatClock(-5000) === "0.0", `-> ${formatClock(-5000)}`);
}

console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLOS`);
process.exit(failures === 0 ? 0 : 1);
