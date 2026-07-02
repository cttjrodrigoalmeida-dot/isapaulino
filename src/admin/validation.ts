// Validação e formatação de clientes no front (feedback inline no formulário).
// O servidor revalida (functions/api/_lib/validation.ts) — aqui é só UX.

export function onlyDigits(s: string): string {
  return (s || "").replace(/\D+/g, "");
}

export function isValidEmail(email: string): boolean {
  const e = (email || "").trim();
  if (!e || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += Number(cpf[i]) * (slice + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cnpj[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

export function isValidCpfCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}

/** Formata para exibição: CPF "000.000.000-00" ou CNPJ "00.000.000/0000-00". */
export function formatCpfCnpj(value: string): string {
  const d = onlyDigits(value);
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return value;
}

/** Formata telefone BR: (00) 00000-0000 / (00) 0000-0000. */
export function formatPhone(value: string): string {
  const d = onlyDigits(value);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return value;
}
