// Avatares ilustrados (flat, coloridos) da Área do Cliente. São SVGs gerados em
// código (sem upload/imagens) — leves e sincronizados: a escolha fica no cadastro
// do cliente e vale nos dois ambientes (área do cliente + painel admin).

export type AvatarGender = "f" | "m" | "n";
export interface AvatarSpec {
  id: string;
  bg: string;
  skin: string;
  hair: string;
  style: "curto" | "longo" | "buzz" | "coque" | "rabo" | "ondulado" | "afro" | "cacheado" | "careca";
  glasses?: boolean;
  beard?: boolean;
  gender: AvatarGender;
  shirt?: string;
}

// Retorna o miolo do SVG (viewBox 0 0 100 100) de um avatar.
export function avatarInner(s: AvatarSpec): string {
  const skin = s.skin, hair = s.hair, shirt = s.shirt || "#2c2c34";
  const dark = "#3a2f2a";
  let out = "";
  out += `<rect width="100" height="100" fill="${s.bg}"/>`;
  if (s.style === "afro" || s.style === "cacheado") {
    out += `<circle cx="50" cy="40" r="27" fill="${hair}"/>`;
    if (s.style === "cacheado") for (const [x, y] of [[27, 30], [73, 30], [24, 46], [76, 46], [34, 20], [66, 20], [50, 15]]) out += `<circle cx="${x}" cy="${y}" r="7" fill="${hair}"/>`;
  }
  if (s.style === "longo" || s.style === "rabo") {
    out += `<path d="M24 46 Q22 16 50 15 Q78 16 76 46 L78 86 Q66 80 65 62 L65 46 Q65 30 50 30 Q35 30 35 46 L35 62 Q34 80 22 86 Z" fill="${hair}"/>`;
  }
  out += `<path d="M16 100 Q16 80 50 80 Q84 80 84 100 Z" fill="${shirt}"/>`;
  out += `<rect x="43" y="64" width="14" height="18" rx="6" fill="${skin}"/>`;
  out += `<circle cx="29" cy="49" r="5" fill="${skin}"/><circle cx="71" cy="49" r="5" fill="${skin}"/>`;
  out += `<ellipse cx="50" cy="47" rx="21" ry="24" fill="${skin}"/>`;
  if (s.style === "curto" || s.style === "coque" || s.style === "rabo" || s.style === "ondulado" || s.style === "longo") {
    out += `<path d="M28 48 Q25 22 50 20 Q75 22 72 48 Q72 33 50 31 Q28 33 28 48 Z" fill="${hair}"/>`;
  }
  if (s.style === "ondulado") out += `<path d="M28 47 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0 l0 -8 l-40 0 Z" fill="${hair}"/>`;
  if (s.style === "buzz") out += `<path d="M30 44 Q30 24 50 23 Q70 24 70 44 Q70 34 50 33 Q30 34 30 44 Z" fill="${hair}" opacity="0.92"/>`;
  if (s.style === "coque") out += `<circle cx="50" cy="17" r="8" fill="${hair}"/>`;
  if (s.style === "rabo") out += `<path d="M72 40 q16 6 12 26 q-2 6 -8 4 q6 -18 -8 -26 Z" fill="${hair}"/>`;
  out += `<path d="M39 41 q3 -2 6 0" stroke="${dark}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M55 41 q3 -2 6 0" stroke="${dark}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  out += `<ellipse cx="42" cy="47" rx="2.5" ry="3.1" fill="${dark}"/><ellipse cx="58" cy="47" rx="2.5" ry="3.1" fill="${dark}"/>`;
  out += `<path d="M50 49 l-1.5 5 q1.5 1.5 3 0" stroke="${dark}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.5"/>`;
  if (s.beard) out += `<path d="M31 50 Q31 74 50 76 Q69 74 69 50 Q69 66 50 66 Q31 66 31 50 Z" fill="${hair}"/>`;
  out += `<path d="M44 58 Q50 63 56 58" stroke="${s.beard ? "#e9c9b8" : "#b56a55"}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  if (s.glasses) out += `<g fill="rgba(255,255,255,0.14)" stroke="#26262b" stroke-width="1.8"><rect x="34" y="43" width="13" height="9.5" rx="4.5"/><rect x="53" y="43" width="13" height="9.5" rx="4.5"/></g><path d="M47 47 h6" stroke="#26262b" stroke-width="1.8"/>`;
  return out;
}

export const AVATARS: AvatarSpec[] = [
  { id: "a01", bg: "#ff8a5c", skin: "#ffd9b8", hair: "#5a3a22", style: "longo", gender: "f", shirt: "#3a3550" },
  { id: "a02", bg: "#5b8def", skin: "#d99a6c", hair: "#2b2320", style: "curto", beard: true, gender: "m", shirt: "#2b2b33" },
  { id: "a03", bg: "#3ec6a0", skin: "#6b4326", hair: "#241d1a", style: "afro", gender: "f", shirt: "#e26a8a" },
  { id: "a04", bg: "#f4a63b", skin: "#a86b45", hair: "#241d1a", style: "buzz", beard: true, gender: "m", shirt: "#333333" },
  { id: "a05", bg: "#ef6f9b", skin: "#f0c19a", hair: "#c74a1a", style: "longo", gender: "f", shirt: "#3a4a6a" },
  { id: "a06", bg: "#a97bf0", skin: "#ffd9b8", hair: "#e0b04a", style: "curto", glasses: true, gender: "m", shirt: "#2f2f38" },
  { id: "a07", bg: "#8bd35a", skin: "#d99a6c", hair: "#2b2320", style: "coque", gender: "f", shirt: "#c05a7a" },
  { id: "a08", bg: "#57c1e8", skin: "#6b4326", hair: "#241d1a", style: "curto", glasses: true, gender: "m", shirt: "#2b2b33" },
  { id: "a09", bg: "#f2c14e", skin: "#f0c19a", hair: "#5a3a22", style: "ondulado", gender: "f", shirt: "#4a6a5a" },
  { id: "a10", bg: "#6c8cff", skin: "#ffd9b8", hair: "#b8b3ad", style: "curto", glasses: true, beard: true, gender: "m", shirt: "#333333" },
  { id: "a11", bg: "#ff8a5c", skin: "#a86b45", hair: "#2b2320", style: "rabo", gender: "f", shirt: "#3a3550" },
  { id: "a12", bg: "#3ec6a0", skin: "#d99a6c", hair: "#2b2320", style: "careca", beard: true, gender: "m", shirt: "#2b2b33" },
  { id: "a13", bg: "#a97bf0", skin: "#6b4326", hair: "#241d1a", style: "cacheado", gender: "f", shirt: "#e0a24a" },
  { id: "a14", bg: "#ef6f9b", skin: "#d99a6c", hair: "#c74a1a", style: "ondulado", beard: true, gender: "m", shirt: "#3a4a6a" },
  { id: "a15", bg: "#8bd35a", skin: "#ffd9b8", hair: "#e0b04a", style: "buzz", gender: "f", shirt: "#c05a7a" },
  { id: "a16", bg: "#f4a63b", skin: "#d99a6c", hair: "#5a3a22", style: "curto", glasses: true, gender: "n", shirt: "#333333" },
  // ── Leva de diversidade: mais tons de pele (incl. bem escuros), cabelos
  //    expressivos/coloridos e mais representações não-binárias. ──
  { id: "a17", bg: "#5b8def", skin: "#4a2f1e", hair: "#241d1a", style: "afro", gender: "n", shirt: "#2b2b33" },
  { id: "a18", bg: "#3ec6a0", skin: "#6b4326", hair: "#ff5fa2", style: "cacheado", gender: "f", shirt: "#3a3550" },
  { id: "a19", bg: "#a97bf0", skin: "#f0c19a", hair: "#4aa3ff", style: "curto", gender: "n", shirt: "#2f2f38" },
  { id: "a20", bg: "#ef6f9b", skin: "#8a5a34", hair: "#9b5de5", style: "coque", gender: "f", shirt: "#3a4a6a" },
  { id: "a21", bg: "#57c1e8", skin: "#a86b45", hair: "#22c1a8", style: "buzz", gender: "m", shirt: "#2b2b33" },
  { id: "a22", bg: "#8bd35a", skin: "#d99a6c", hair: "#7bd452", style: "ondulado", gender: "n", shirt: "#333333" },
  { id: "a23", bg: "#f4a63b", skin: "#6b4326", hair: "#241d1a", style: "buzz", beard: true, gender: "m", shirt: "#2c2c34" },
  { id: "a24", bg: "#6c8cff", skin: "#4a2f1e", hair: "#c77dff", style: "longo", gender: "f", shirt: "#3a3550" },
  { id: "a25", bg: "#ff8a5c", skin: "#c98a5a", hair: "#ff8a3d", style: "curto", glasses: true, gender: "n", shirt: "#2b2b33" },
  { id: "a26", bg: "#f2c14e", skin: "#ffe0c4", hair: "#ff5fa2", style: "rabo", gender: "f", shirt: "#c05a7a" },
  { id: "a27", bg: "#a97bf0", skin: "#8a5a34", hair: "#4aa3ff", style: "cacheado", gender: "n", shirt: "#2f2f38" },
  { id: "a28", bg: "#3ec6a0", skin: "#6b4326", hair: "#e0b04a", style: "coque", gender: "f", shirt: "#e26a8a" },
  { id: "a29", bg: "#5b8def", skin: "#a86b45", hair: "#9b5de5", style: "curto", glasses: true, beard: true, gender: "m", shirt: "#2b2b33" },
  { id: "a30", bg: "#ef6f9b", skin: "#4a2f1e", hair: "#241d1a", style: "afro", glasses: true, gender: "n", shirt: "#3a4a6a" },
  { id: "a31", bg: "#8bd35a", skin: "#d99a6c", hair: "#22c1a8", style: "coque", gender: "n", shirt: "#333333" },
  { id: "a32", bg: "#f4a63b", skin: "#f0c19a", hair: "#7bd452", style: "buzz", gender: "f", shirt: "#c05a7a" },
];

export const avatarById = (id?: string | null): AvatarSpec | undefined =>
  id ? AVATARS.find((a) => a.id === id) : undefined;

/** Avatares ordenados priorizando o gênero informado (mas todos disponíveis). */
export function avatarsForGender(gender?: string | null): AvatarSpec[] {
  const g = gender === "f" || gender === "m" ? gender : null;
  if (!g) return AVATARS;
  return [...AVATARS].sort((a, b) => (a.gender === g ? 0 : 1) - (b.gender === g ? 0 : 1));
}

/** Grade de escolha de avatar (usada no painel e na Área do Cliente). */
export function AvatarPicker({ value, onChange, gender, size = 60 }: {
  value?: string | null;
  onChange: (id: string) => void;
  gender?: string | null;
  size?: number;
}) {
  const list = avatarsForGender(gender);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {list.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onChange(a.id)}
          aria-label={`Avatar ${a.id}`}
          style={{
            padding: 0, borderRadius: "50%", cursor: "pointer", lineHeight: 0, background: "none",
            border: value === a.id ? "3px solid #2f9e44" : "3px solid rgba(128,128,128,0.25)",
            boxShadow: value === a.id ? "0 0 0 3px rgba(47,158,68,0.28)" : "none",
            transition: "border-color .15s, box-shadow .15s",
          }}
        >
          <AvatarSVG id={a.id} size={size} />
        </button>
      ))}
    </div>
  );
}

/** Renderiza um avatar. Se `id` não existir, o chamador cai no fallback (iniciais). */
export function AvatarSVG({ id, size = 64 }: { id?: string | null; size?: number }) {
  const spec = avatarById(id);
  if (!spec) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ display: "block", borderRadius: "50%" }}
      dangerouslySetInnerHTML={{ __html: avatarInner(spec) }}
    />
  );
}
