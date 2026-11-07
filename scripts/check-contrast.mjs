// Comprueba el contraste AA de los pares de color de los tokens, en los dos temas: npm run check:contrast.
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/styles/_tokens.scss', import.meta.url), 'utf8');

/** Los valores de un tema, heredando del oscuro lo que el claro no redefine. */
const read = (selector) => {
  const start = source.indexOf(selector);
  const body = source.slice(source.indexOf('{', start) + 1, source.indexOf('\n}', start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, value]) => [
      name,
      value,
    ]),
  );
};
const dark = read(":root[data-theme='dark']");
const themes = { oscuro: dark, claro: { ...dark, ...read(":root[data-theme='light']") } };

const channel = (value) => {
  const unit = value / 255;
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((at) => channel(parseInt(hex.slice(at, at + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const TEXT = 4.5;
const GRAPHIC = 3;
const SURFACES = ['bg', 'surface', 'surface-2', 'surface-3'];
const pairs = [
  ...['text', 'text-soft', 'muted', 'accent', 'red', 'amber', 'green', 'info'].flatMap((color) =>
    SURFACES.map((surface) => [color, surface, TEXT]),
  ),
  ['accent-ink', 'accent', TEXT],
  ['red-ink', 'red-solid', TEXT],
  ['amber-ink', 'amber-solid', TEXT],
  ['info-ink', 'info-solid', TEXT],
  ['plate-ink', 'plate-bg', TEXT],
  ['line-strong', 'surface', GRAPHIC],
  ['needle', 'surface-2', GRAPHIC],
];

let failures = 0;
for (const [name, tokens] of Object.entries(themes)) {
  const results = pairs.map(([front, back, minimum]) => ({
    front,
    back,
    minimum,
    value: ratio(tokens[front], tokens[back]),
  }));
  const failed = results.filter((item) => item.value < item.minimum);
  failures += failed.length;
  const lowest = results.reduce((a, b) => (a.value / a.minimum < b.value / b.minimum ? a : b));
  console.log(
    `${name}: ${results.length - failed.length}/${results.length} pares cumplen. El más justo: ${lowest.front} sobre ${lowest.back}, ${lowest.value.toFixed(2)}:1`,
  );
  for (const item of failed) {
    console.log(
      `  FALLA ${item.front} sobre ${item.back}: ${item.value.toFixed(2)}:1 (mínimo ${item.minimum})`,
    );
  }
}
if (failures > 0) process.exit(1);
