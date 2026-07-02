// Geração de slug para URLs públicas (ex.: contratos).

/** Normaliza um texto em slug: minúsculas, sem acentos, hífens. */
export function slugify(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove marcas diacríticas (acentos)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Slug + sufixo curto aleatório, para garantir unicidade. Ex.: "joao-silva-a1b2c3". */
export function uniqueSlug(text: string): string {
  const base = slugify(text) || "contrato";
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
}
