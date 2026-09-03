import { chromium } from "playwright";

const URL = process.argv[2] ?? "https://ajedrez-web-one.vercel.app/";
const browser = await chromium.launch();
const page = await browser.newPage();

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: "networkidle" });

console.log("=== ERRORES DE JS ===");
console.log(errors.length ? errors.join("\n") : "(ninguno)");

// Estado inicial de los botones de ritmo.
const readTimeButtons = () =>
  page.$$eval("button", (els) =>
    els
      .filter((e) => /Clásica|Rápida|Blitz|Bullet|Personalizado|Sin reloj/.test(e.textContent))
      .map((e) => ({ txt: e.textContent.trim(), pressed: e.getAttribute("aria-pressed") })),
  );

console.log("\n=== BOTONES DE RITMO (inicial) ===");
console.log(await readTimeButtons());

// Se hace clic en "Bullet 1+0" y se mira si cambia la seleccion.
const bullet = page.locator("button", { hasText: "Bullet 1+0" }).first();
await bullet.click();
await page.waitForTimeout(400);
console.log("\n=== TRAS CLIC EN 'Bullet 1+0' ===");
console.log(await readTimeButtons());

// Oponente: indica si Supabase respondio.
const aviso = await page.locator("text=Sin conexión con Supabase").count();
console.log(`\naviso 'Sin conexion con Supabase': ${aviso ? "PRESENTE" : "no aparece"}`);
const inputOponente = await page.locator('input[placeholder="Añadir oponente"]').count();
console.log(`campo 'Añadir oponente': ${inputOponente ? "presente" : "AUSENTE"}`);

// Empezar partida y comprobar que aparece el tablero y la voz.
await page.locator("button", { hasText: "Empezar partida" }).first().click();
await page.waitForTimeout(2500);
console.log("\n=== TRAS 'Empezar partida' ===");
for (const t of ["Iniciar reloj", "Dictar jugada", "Juegan las blancas", "Jugadas"]) {
  console.log(`  ${t}: ${(await page.locator(`text=${t}`).count()) ? "presente" : "AUSENTE"}`);
}
console.log(`  tablero (piezas): ${await page.locator('[data-piece], img[alt*="pawn"], svg').count()} elementos`);

await page.screenshot({ path: "/tmp/ajedrez-partida.png", fullPage: true });

console.log("\n=== ERRORES ACUMULADOS ===");
console.log(errors.length ? errors.join("\n") : "(ninguno)");

await browser.close();
