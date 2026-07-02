// Helpers de cálculo financeiro do editor de propostas.
// Valores no modelo são strings tipo "R$ 1.900,00"; aqui convertemos
// para número, somamos, aplicamos desconto e formatamos de volta — além
// de gerar o "valor por extenso" automaticamente.

/** "R$ 1.900,00" → 1900.00 (NaN/não numérico → 0). */
export function parseBRL(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value
    .replace(/[^\d,.-]/g, "") // tira "R$", espaços, letras
    .replace(/\.(?=\d{3}(\D|$))/g, "") // tira separador de milhar
    .replace(",", "."); // vírgula decimal → ponto
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** 1900 → "R$ 1.900,00". */
export function formatBRL(n: number): string {
  return (
    "R$ " +
    n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/** Soma uma lista de valores em string BRL. */
export function sumBRL(values: (string | undefined)[]): number {
  return values.reduce<number>((acc, v) => acc + parseBRL(v), 0);
}

// ── Valor por extenso (pt-BR, reais e centavos) ──────────────
const UNIDADES = [
  "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete",
  "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 20) partes.push(UNIDADES[resto]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const centenas = n % 1000;
  const grupos: { v: number; txt: string }[] = [];
  if (milhoes > 0) grupos.push({ v: milhoes * 1_000_000, txt: milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões` });
  if (milhares > 0) grupos.push({ v: milhares * 1000, txt: milhares === 1 ? "mil" : `${ate999(milhares)} mil` });
  if (centenas > 0) grupos.push({ v: centenas, txt: ate999(centenas) });

  let out = grupos[0]?.txt ?? "";
  for (let i = 1; i < grupos.length; i++) {
    const cur = grupos[i];
    // usa "e" antes de um grupo "redondo" (< 100 ou múltiplo de 100); senão, espaço
    const useE = cur.v < 100 || cur.v % 100 === 0;
    out += (useE ? " e " : " ") + cur.txt;
  }
  return out.replace(/\s+/g, " ").trim();
}

/** 1900 → "mil e novecentos reais"; com centavos quando houver. */
export function valorPorExtenso(n: number): string {
  const reais = Math.floor(n);
  const centavos = Math.round((n - reais) * 100);
  const partes: string[] = [];
  if (reais > 0 || centavos === 0) {
    partes.push(`${inteiroPorExtenso(reais)} ${reais === 1 ? "real" : "reais"}`);
  }
  if (centavos > 0) {
    partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  }
  const texto = partes.join(" e ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Próximo número de proposta a partir de uma lista (com piso). */
export function nextProposalNumber(existing: string[], floor = 2624): string {
  const nums = existing
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
  const max = Math.max(floor, ...nums);
  return String(max + 1);
}
