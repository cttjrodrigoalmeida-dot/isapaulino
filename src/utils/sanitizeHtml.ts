// Sanitizador leve para o HTML do blog (defesa em profundidade). O conteúdo é
// escrito pela Isabela via CMS, mas caso o token do CMS vaze, isto remove os
// vetores clássicos de XSS: <script>, handlers on*, e URLs javascript:.
// Sem dependência externa — usa o DOMParser do navegador.
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined" || !html) return html;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, object, embed").forEach((el) => el.remove());
    doc.querySelectorAll("*").forEach((el) => {
      for (const attr of [...el.attributes]) {
        const name = attr.name.toLowerCase();
        const val = attr.value.replace(/\s+/g, "").toLowerCase();
        if (name.startsWith("on")) el.removeAttribute(attr.name);
        else if ((name === "href" || name === "src" || name === "xlink:href") && val.startsWith("javascript:")) {
          el.removeAttribute(attr.name);
        }
      }
    });
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}
