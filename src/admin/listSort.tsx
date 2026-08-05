import { useMemo, useState } from "react";

// Ordenação clicável das listas do painel (Nº, Cliente, Título, Valor, Status, Data).
// Uso: const { sorted, sort, toggle } = useSort(filtered, getVal); nos <th> usar <SortTh>.

export type SortDir = "asc" | "desc";
export interface SortState { key: string; dir: SortDir }
export type SortValue = string | number | null;

/** Normaliza p/ busca: minúsculas e sem acentos. */
export function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Converte "DD/MM/AAAA" (ou ISO) num número comparável; null se vazio. */
export function dateKey(s?: string | null): number | null {
  if (!s) return null;
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

export function useSort<T>(
  rows: T[],
  getVal: (row: T, key: string) => SortValue,
  initial: SortState | null = null,
) {
  const [sort, setSort] = useState<SortState | null>(initial);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const { key, dir } = sort;
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = getVal(a, key);
      const vb = getVal(b, key);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;   // vazios sempre por último
      if (vb == null) return -1;
      let cmp: number;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb), "pt-BR", { numeric: true, sensitivity: "base" });
      return dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [rows, sort, getVal]);

  const toggle = (key: string, defaultDir: SortDir = "asc") =>
    setSort((cur) => (cur?.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: defaultDir }));

  return { sorted, sort, toggle };
}

/** Cabeçalho clicável com indicador de ordenação. */
export function SortTh({
  label, k, sort, onSort, defaultDir = "asc", align = "left",
}: {
  label: string;
  k: string;
  sort: SortState | null;
  onSort: (key: string, defaultDir?: SortDir) => void;
  defaultDir?: SortDir;
  align?: "left" | "right";
}) {
  const active = sort?.key === k;
  return (
    <th
      onClick={() => onSort(k, defaultDir)}
      title="Clique para ordenar"
      style={{ cursor: "pointer", userSelect: "none", textAlign: align, whiteSpace: "nowrap" }}
    >
      {label}{" "}
      <span style={{ opacity: active ? 0.9 : 0.28, fontSize: 10 }}>{active ? (sort!.dir === "asc" ? "▲" : "▼") : "↕"}</span>
    </th>
  );
}
