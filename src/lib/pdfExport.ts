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
  opts: { background?: string } = {}
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
    ignoreElements: (node) => {
      if (node.hasAttribute?.("data-pdf-ignore")) return true;
      const pos = getComputedStyle(node).position;
      return pos === "fixed" || pos === "sticky";
    },
  });

  const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  let position = 0;
  let heightLeft = imgH;
  pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
  heightLeft -= pageH;
  while (heightLeft > 0) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;
  }

  pdf.save(filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`);
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
