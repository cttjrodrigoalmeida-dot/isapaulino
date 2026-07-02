// Agrupamento por ano para as listas do painel (propostas, briefings, projetos).
// O ano vem do número no formato AANN (ex.: "2624" → ano 2026). Os 2 primeiros
// dígitos são sempre o ano; o restante é o sequencial. Itens sem número numérico
// caem no grupo "Outros".

export interface YearGroup<T> {
  /** Ano por extenso, ex.: "2026". "Outros" para números fora do padrão. */
  year: string;
  items: T[];
}

/** Agrupa itens por ano (derivado do número), com o ano mais recente primeiro. */
export function groupByYear<T extends { number: string }>(items: T[]): YearGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const yy = /^\d{2}/.test(it.number) ? it.number.slice(0, 2) : null;
    const year = yy ? `20${yy}` : "Outros";
    const bucket = map.get(year);
    if (bucket) bucket.push(it);
    else map.set(year, [it]);
  }
  return [...map.entries()]
    .sort((a, b) => {
      // "Outros" sempre por último; demais por ano decrescente.
      if (a[0] === "Outros") return 1;
      if (b[0] === "Outros") return -1;
      return b[0].localeCompare(a[0]);
    })
    .map(([year, list]) => ({ year, items: list }));
}
