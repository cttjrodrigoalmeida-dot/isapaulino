// Validações compartilhadas pelos handlers de clientes (e futuros módulos).
// CPF/CNPJ com dígitos verificadores; e-mail por regex simples.

/** Mantém só os dígitos de uma string (ex.: "123.456.789-09" → "12345678909"). */
export function onlyDigits(s: string): string {
  return (s || "").replace(/\D+/g, "");
}

/** Valida e-mail (formato básico, suficiente para cadastro). */
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

/** Aceita CPF (11 dígitos) ou CNPJ (14 dígitos), validando os verificadores. */
export function isValidCpfCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}
