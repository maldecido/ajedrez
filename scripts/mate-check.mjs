import { chromium } from "playwright";
// Comprobacion de regresion: juega el mate del loco en un navegador real y
// verifica que la partida se cierra sola, sin pedir motivo.
//
//   node scripts/mate-check.mjs [url]
const URL = process.argv[2] ?? "http://localhost:3000/";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 1000 } });
await p.goto(URL, { waitUntil: "networkidle" });
await p.locator("button", { hasText: "Sin reloj" }).first().click();
await p.locator("button", { hasText: "Empezar partida" }).first().click();
await p.waitForTimeout(2000);

// Como marca react-chessboard las casillas
const attrs = await p.evaluate(() => {
  const el = document.querySelector("[data-square]");
  return el ? Object.keys(el.dataset) : "sin data-square";
});
console.log("atributos de casilla:", attrs);

const click = async (sq) => {
  await p.locator(`[data-square="${sq}"]`).first().click();
  await p.waitForTimeout(350);
};

// Mate del loco: 1. f3 e5 2. g4 Qh4#
for (const [from, to] of [["f2","f3"],["e7","e5"],["g2","g4"],["d8","h4"]]) {
  await click(from); await click(to);
}
await p.waitForTimeout(800);

const texto = await p.locator("body").innerText();
console.log("\n=== ESTADO TRAS EL MATE ===");
for (const t of ["Jaque mate", "Ganan las negras", "Terminar partida", "Abandonan blancas", "Nueva partida"]) {
  console.log(`  "${t}": ${texto.includes(t) ? "PRESENTE" : "ausente"}`);
}
console.log("\njugadas registradas:", (await p.locator("text=jugadas").first().innerText().catch(()=>"?")));
await p.screenshot({ path: "/tmp/mate.png", fullPage: true });
await b.close();
