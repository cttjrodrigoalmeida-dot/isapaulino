// Geração de PDF no navegador (1 clique baixa, sem abrir a tela de impressão).
// As libs (html2canvas + jsPDF) são carregadas SOB DEMANDA (import dinâmico),
// então não pesam no carregamento inicial do site.
//
// Rasteriza o elemento do documento numa imagem e monta um A4 multipágina.
// Ignora automaticamente os elementos fixos (cursor, botões flutuantes, etc.)
// e qualquer elemento marcado com data-pdf-ignore.

export async function exportElementToPdf(
  el: HTMLElement,
  filename: string,
  opts: { background?: string; skipImages?: boolean } = {}
): Promise<void> {
  const [{ default: html2canvas }, jspdf] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const JsPDF = jspdf.jsPDF;

  const background =
    opts.background ||
    getComputedStyle(el).backgroundColor ||
    getComputedStyle(document.body).backgroundColor ||
    "#ffffff";

  const canvas = await html2canvas(el, {
    backgroundColor: background,
    scale: Math.min(2, Math.max(1.5, window.devicePixelRatio || 1.5)),
    useCORS: true,
    logging: false,
    windowWidth: el.scrollWidth,
    imageTimeout: 15000,
    ignoreElements: (node) => {
      if (node.hasAttribute?.("data-pdf-ignore")) return true;
      // Retry sem imagens: pula <img> (evita canvas "tainted" por imagem externa).
      if (opts.skipImages && node.tagName === "IMG") return true;
      const pos = getComputedStyle(node).position;
      return pos === "fixed" || pos === "sticky";
    },
  });

  // A4 retrato em mm. Fatiamos o canvas em páginas de altura de página; a ÚLTIMA
  // página é recortada na altura exata do conteúdo — assim não sobra aquele espaço
  // de fundo (preto/branco) embaixo. Páginas cheias mantêm A4; só a última encurta.
  const pageWmm = 210;
  const pageHmm = 297;
  const pxPerMm = canvas.width / pageWmm;
  const pageHpx = Math.max(1, Math.floor(pageHmm * pxPerMm));

  let pdf: InstanceType<typeof JsPDF> | null = null;
  let y = 0;
  while (y < canvas.height) {
    const sliceHpx = Math.min(pageHpx, canvas.height - y);
    const sliceHmm = sliceHpx / pxPerMm;

    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHpx;
    const ctx = slice.getContext("2d");
    if (ctx) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, y, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);
    }
    const data = slice.toDataURL("image/jpeg", 0.92);

    if (!pdf) {
      pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: [pageWmm, sliceHmm] });
    } else {
      pdf.addPage([pageWmm, sliceHmm], "portrait");
    }
    pdf.addImage(data, "JPEG", 0, 0, pageWmm, sliceHmm);
    y += sliceHpx;
  }

  if (pdf) pdf.save(filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`);
}

// Aguarda fontes + 2 frames para garantir o layout final antes de capturar.
export async function waitForRenderReady(): Promise<void> {
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
  } catch {
    /* ignore */
  }
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}
