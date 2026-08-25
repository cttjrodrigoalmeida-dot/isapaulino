import { useEffect, useState } from "react";
import type { BriefingSection } from "../components/briefing/types";
import SectionFigure from "../components/briefing/SectionFigure";
import { api, ApiError, type BriefingResponse } from "./api";
import { exportElementToPdf, waitForRenderReady } from "../lib/pdfExport";
import { confirmDialog } from "./confirmDialog";
import styles from "./Admin.module.css";

// Respostas no MESMO formato do template do cliente: seção por seção, com a
// imagem do ambiente (pinos numerados) e as perguntas numeradas na ordem —
// assim dá pra ver exatamente a que ponto da foto cada resposta se refere.
export default function BriefingResponses({
  number,
  onBack,
}: {
  number: string;
  onBack: () => void;
}) {
  const [responses, setResponses] = useState<BriefingResponse[]>([]);
  const [sections, setSections] = useState<BriefingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  // Edição das respostas pelo admin (sobrescreve).
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  // Anexos em edição (admin adiciona imagem/vídeo/link a cada resposta).
  const [draftRefs, setDraftRefs] = useState<Record<string, string[]>>({});
  const [linkDraft, setLinkDraft] = useState<Record<string, string>>({});
  const [refBusy, setRefBusy] = useState<string | null>(null); // qid enviando
  const [saving, setSaving] = useState(false);
  // Bloqueio manual das respostas (preserva o briefing após iniciar os trabalhos).
  const [locked, setLocked] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);
  const [pdfId, setPdfId] = useState<number | null>(null); // resposta gerando PDF
  const [lightbox, setLightbox] = useState<string | null>(null); // imagem ampliada na mesma tela

  // Normaliza refImages (string legada OU array) para { qid: url[] }.
  const refsToMap = (r: BriefingResponse): Record<string, string[]> => {
    const out: Record<string, string[]> = {};
    for (const [qid, v] of Object.entries(r.refImages ?? {})) {
      const list = Array.isArray(v) ? v.filter(Boolean) : v ? [v as string] : [];
      if (list.length) out[qid] = list;
    }
    return out;
  };
  const startEdit = (r: BriefingResponse) => {
    setEditingId(r.id); setDraft({ ...r.answers }); setDraftRefs(refsToMap(r)); setLinkDraft({});
    setNotice(null); setError(null);
  };
  const cancelEdit = () => { setEditingId(null); setDraft({}); setDraftRefs({}); setLinkDraft({}); };

  // Adiciona um anexo (imagem/vídeo/arquivo) a uma pergunta em edição.
  const addRefFile = async (qid: string, files: File[]) => {
    if (!files.length || editingId == null) return;
    setRefBusy(qid); setError(null);
    try {
      const urls: string[] = [];
      for (const f of files) { const { url } = await api.uploadBriefingRef(number, f); urls.push(url); }
      setDraftRefs((prev) => ({ ...prev, [qid]: [...(prev[qid] ?? []), ...urls] }));
    } catch (err) { setError(err instanceof ApiError ? err.message : "Erro ao enviar anexo."); }
    finally { setRefBusy(null); }
  };
  const addRefLink = (qid: string) => {
    const raw = (linkDraft[qid] ?? "").trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setDraftRefs((prev) => ({ ...prev, [qid]: [...(prev[qid] ?? []), url] }));
    setLinkDraft((prev) => ({ ...prev, [qid]: "" }));
  };
  const removeRefAt = (qid: string, i: number) => {
    setDraftRefs((prev) => {
      const list = (prev[qid] ?? []).filter((_, k) => k !== i);
      const next = { ...prev };
      if (list.length) next[qid] = list; else delete next[qid];
      return next;
    });
  };

  const saveEdit = async (r: BriefingResponse) => {
    setSaving(true); setError(null);
    try {
      await api.updateBriefingResponse(number, r.id, draft, draftRefs);
      setResponses((prev) => prev.map((x) => (x.id === r.id ? { ...x, answers: { ...draft }, refImages: { ...draftRefs } } : x)));
      setEditingId(null); setDraft({}); setDraftRefs({}); setLinkDraft({});
      setNotice("Respostas atualizadas.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  };

  const toggleLock = async () => {
    const next = !locked;
    if (next && !(await confirmDialog({
      title: "Bloquear a edição do briefing?",
      message: "O cliente continuará VISUALIZANDO, mas não poderá mais alterar as respostas. Você (admin) ainda pode editar por aqui. Use isso ao iniciar os trabalhos, para preservar o briefing que embasou o projeto.",
      confirmLabel: "Bloquear edição",
      cancelLabel: "Cancelar",
      danger: true,
    }))) return;
    setLockBusy(true); setError(null); setNotice(null);
    try {
      await api.lockBriefing(number, next);
      setLocked(next);
      setNotice(next ? "Briefing bloqueado — o cliente agora só visualiza." : "Briefing desbloqueado — o cliente pode editar novamente.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao alterar o bloqueio.");
    } finally { setLockBusy(false); }
  };

  // Esc fecha a imagem ampliada (lightbox).
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ briefing, locked }, { responses }] = await Promise.all([
          api.getBriefing(number),
          api.listBriefingResponses(number),
        ]);
        if (!alive) return;
        setSections(briefing.sections);
        setResponses(responses);
        setLocked(!!locked);
      } catch (err) {
        if (alive) setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [number]);

  const answered = (answers: Record<string, string>, qid: string) =>
    (answers[qid] ?? "").trim() !== "";

  // Uma pergunta pode ter vários anexos (imagens/PDFs). Normaliza o formato
  // guardado (string legada OU array) para uma lista de URLs.
  const refList = (r: BriefingResponse, qid: string): string[] => {
    const v = r.refImages[qid];
    return Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [];
  };

  // ids cobertos pelas seções (para detectar respostas/anexos "órfãos")
  const knownIds = new Set(sections.flatMap((s) => s.questions.map((q) => q.id)));

  // bloco de continuação = seção ambiente com o MESMO título da anterior
  const isContinuation = (i: number) => {
    const s = sections[i];
    const p = sections[i - 1];
    return (
      !!p && s.kind === "ambiente" && p.kind === "ambiente" &&
      s.title.trim().toLowerCase() === p.title.trim().toLowerCase()
    );
  };

  // ── Exportação (CSV / PDF / Arquivos) ──
  // Monta as linhas (seção · pergunta · resposta · anexo) de uma resposta.
  const rowsFor = (r: BriefingResponse) => {
    const rows: { section: string; question: string; answer: string; attachment: string }[] = [];
    for (const section of sections) {
      for (const q of section.questions) {
        if (!(answered(r.answers, q.id) || refList(r, q.id).length)) continue;
        rows.push({ section: section.title, question: q.text, answer: r.answers[q.id] ?? "", attachment: refList(r, q.id).join(" | ") });
      }
    }
    for (const qid of [...new Set([...Object.keys(r.answers), ...Object.keys(r.refImages)])]) {
      if (knownIds.has(qid) || !(answered(r.answers, qid) || refList(r, qid).length)) continue;
      rows.push({ section: "Outras respostas", question: qid, answer: r.answers[qid] ?? "", attachment: refList(r, qid).join(" | ") });
    }
    return rows;
  };
  const fileBase = (r: BriefingResponse) => `briefing-${number}-${(r.client || "cliente").replace(/[^\w-]+/g, "_")}`;
  const submittedLabel = (r: BriefingResponse) => new Date(r.submittedAt.replace(" ", "T") + "Z").toLocaleString("pt-BR");

  const buildCsv = (r: BriefingResponse) => {
    const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
    const header = ["Seção", "Pergunta", "Resposta", "Anexo"].map(esc).join(",");
    const lines = rowsFor(r).map((row) => [row.section, row.question, row.answer, row.attachment].map(esc).join(","));
    return "﻿" + [header, ...lines].join("\r\n"); // BOM p/ Excel abrir acentos certo
  };

  const exportCsv = (r: BriefingResponse) => {
    const blob = new Blob([buildCsv(r)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase(r)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const isImgUrl = (url: string) => /\.(jpe?g|png|webp|avif|gif)$/i.test(url);
  const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|ogv|mov|m4v)$/i.test(url);

  // PDF no formato do template: imagem do ambiente com pinos numerados,
  // perguntas numeradas e anexos do cliente embutidos como imagem.
  // Baixa AUTOMÁTICO em A4 (1 clique, sem abrir a tela de impressão) — mesmo
  // padrão da página do cliente. Renderiza num iframe oculto (estilos isolados)
  // e rasteriza com o utilitário compartilhado exportElementToPdf.
  const exportPdf = async (r: BriefingResponse) => {
    if (pdfId !== null) return;
    setPdfId(r.id);
    setError(null);
    const esc = (s: string) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let body = "";
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      const hasAny = section.questions.length > 0 || (section.kind === "ambiente" && section.image);
      if (!hasAny) continue;
      const contLabel = isContinuation(si) ? " · continuação" : "";
      body += `<h2>${section.kind === "ambiente" ? "Ambiente · " : ""}${esc(section.title)}${contLabel}</h2>`;
      if (section.kind === "ambiente" && section.image) {
        const pins = section.questions
          .map((q, i) =>
            q.pin
              ? `<span class="pin" style="left:${q.pin.x}%;top:${q.pin.y}%"><span class="pinN">${i + 1}</span>${q.pin.label ? `<span class="pinL">${esc(q.pin.label)}</span>` : ""}</span>`
              : ""
          )
          .join("");
        body += `<div class="fig"><div class="figIn"><img src="${esc(section.image)}" alt="" crossorigin="anonymous">${pins}</div></div>`;
      }
      section.questions.forEach((q, i) => {
        const val = (r.answers[q.id] ?? "").trim();
        body += `<div class="q"><span class="qn">${String(i + 1).padStart(2, "0")}</span> ${esc(q.text)}</div>`;
        body += `<div class="a${val ? "" : " empty"}">${val ? esc(val) : "— sem resposta"}</div>`;
        for (const att of refList(r, q.id)) {
          body += isImgUrl(att)
            ? `<img class="att" src="${esc(att)}" alt="Anexo" crossorigin="anonymous">`
            : `<div class="a">📎 ${esc(att)}</div>`;
        }
      });
    }
    const orphans = [...new Set([...Object.keys(r.answers), ...Object.keys(r.refImages)])].filter(
      (qid) => !knownIds.has(qid) && (answered(r.answers, qid) || refList(r, qid).length)
    );
    if (orphans.length > 0) {
      body += `<h2>Outras respostas</h2>`;
      for (const qid of orphans) {
        body += `<div class="q">${esc(qid)}</div><div class="a">${esc(r.answers[qid] ?? "")}</div>`;
        for (const att of refList(r, qid)) {
          body += isImgUrl(att) ? `<img class="att" src="${esc(att)}" alt="Anexo" crossorigin="anonymous">` : `<div class="a">📎 ${esc(att)}</div>`;
        }
      }
    }
    // Estilos ESCOPADOS na raiz (.ipsPdfRoot) — não vazam para o painel.
    const P = ".ipsPdfRoot";
    const css = `
${P}{font-family:Inter,Arial,sans-serif;color:#1a1a1a;background:#fff;padding:32px 36px;width:722px;box-sizing:border-box}
${P} h1{font-size:20px;margin:0}
${P} h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#8a6d3b;margin:26px 0 8px;border-bottom:1px solid #e5e0d8;padding-bottom:4px}
${P} .meta{color:#666;font-size:12px;margin-bottom:8px}
${P} .fig{text-align:center;margin:10px 0 16px}
${P} .figIn{position:relative;display:inline-block;line-height:0}
${P} .figIn img{max-width:100%;max-height:430px;width:auto;height:auto;border-radius:10px;border:1px solid #e2ddd4}
${P} .pin{position:absolute;transform:translate(-50%,-50%);display:inline-flex;flex-direction:column;align-items:center;gap:2px;line-height:1}
${P} .pinN{width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font:700 10px/1 monospace;color:#fff;background:#f0506e;border:1px solid #fff;border-radius:50%}
${P} .pinL{font:700 7px/1.4 monospace;letter-spacing:.05em;text-transform:uppercase;color:#fff;background:rgba(240,80,110,.92);padding:1px 4px;border-radius:3px;white-space:nowrap}
${P} .q{font-weight:600;font-size:13px;margin-top:12px}
${P} .qn{font:700 10px/1 monospace;color:#a08d6a;margin-right:4px}
${P} .a{font-size:13px;white-space:pre-wrap;margin-top:2px;color:#333}
${P} .a.empty{color:#b3aca0;font-style:italic}
${P} .att{display:block;max-width:320px;max-height:260px;border-radius:8px;border:1px solid #e2ddd4;margin:6px 0 2px}`;

    // Container fora da tela, MAS renderizado (html2canvas precisa de layout).
    // Mesmo caminho da página do cliente: elemento no documento principal.
    const root = document.createElement("div");
    root.className = "ipsPdfRoot";
    // absolute (NÃO fixed/sticky) — o exportElementToPdf ignora fixed/sticky,
    // então um container fixed sumiria da captura ("cloned iframe" error).
    root.style.cssText = "position:absolute;left:-10000px;top:0;z-index:-1;pointer-events:none";
    const styleEl = document.createElement("style");
    styleEl.textContent = css;
    root.appendChild(styleEl);
    const content = document.createElement("div");
    content.innerHTML = `<h1>Briefing Nº ${number}</h1><div class="meta">${esc(r.client || "Cliente")} · ${esc(submittedLabel(r))}</div>${body}`;
    root.appendChild(content);
    document.body.appendChild(root);
    try {
      // espera imagens (anexos/ambiente) carregarem, com teto de 6s
      const imgs = Array.from(root.querySelectorAll("img"));
      await Promise.race([
        Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })))),
        new Promise<void>((res) => setTimeout(res, 6000)),
      ]);
      await waitForRenderReady();
      await exportElementToPdf(root, fileBase(r), { background: "#ffffff" });
    } catch {
      setError("Não foi possível gerar o PDF. Tente novamente ou use Exportar CSV.");
    } finally {
      root.remove();
      setPdfId(null);
    }
  };

  const saveToArquivos = async (r: BriefingResponse) => {
    const folder = window.prompt("Salvar a resposta (CSV) em qual pasta de Arquivos?", "briefings");
    if (folder === null) return;
    setBusyId(r.id);
    setError(null);
    setNotice(null);
    try {
      const file = new File([buildCsv(r)], `${fileBase(r)}.csv`, { type: "text/csv" });
      const res = await api.uploadDocument(file, folder.trim() || "briefings");
      setNotice(`Resposta salva em Arquivos → pasta “${res.folder}”.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar em Arquivos.");
    } finally {
      setBusyId(null);
    }
  };

  // Anexo: imagem → miniatura; link externo (http/https, não é /api/files) →
  // chip clicável com o domínio; PDF/arquivo interno → link de download.
  const Attachment = ({ url }: { url: string }) => {
    const isExternal = /^https?:\/\//i.test(url) && !url.startsWith("/api/files/");
    if (isImgUrl(url)) {
      // Abre a imagem ampliada AQUI na tela (lightbox), não em outra aba.
      return (
        <button
          type="button"
          onClick={() => setLightbox(url)}
          className={styles.refThumbLink}
          title="Clique para ampliar aqui na tela"
          style={{ border: "none", background: "none", padding: 0, cursor: "zoom-in" }}
        >
          <img src={url} alt="Anexo enviado" className={styles.refThumb} />
        </button>
      );
    }
    if (isVideoUrl(url)) {
      return <video src={url} className={styles.refThumb} controls preload="metadata" playsInline />;
    }
    if (isExternal) {
      const label = url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className={styles.answerView} title={url}>
          🔗 {label.length > 46 ? label.slice(0, 46) + "…" : label}
        </a>
      );
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={styles.answerView}>
        📎 {/\.pdf$/i.test(url) ? "Baixar PDF" : "Baixar anexo"}
      </a>
    );
  };
  // Lista de anexos de uma pergunta (vários possíveis).
  const Attachments = ({ urls }: { urls: string[] }) =>
    urls.length ? (
      <span className={styles.refThumbRow}>
        {urls.map((u, i) => (
          <Attachment key={i} url={u} />
        ))}
      </span>
    ) : null;

  // Editor de anexos (modo edição): mostra os atuais com "×" e permite anexar
  // imagem/vídeo/arquivo ou colar um link — igual ao que o cliente pode fazer.
  const refEditor = (qid: string) => {
    const list = draftRefs[qid] ?? [];
    return (
      <div style={{ marginTop: 8 }}>
        {list.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {list.map((u, i) => {
              const ext = /^https?:\/\//i.test(u) && !u.startsWith("/api/files/");
              return (
                <span key={i} style={{ position: "relative", display: "inline-flex", alignItems: "center", border: "1px solid var(--color-border)", borderRadius: 8, padding: isImgUrl(u) || isVideoUrl(u) ? 0 : "4px 8px", background: "var(--color-surface-2)" }}>
                  {isImgUrl(u) ? (
                    <img src={u} alt="Anexo" className={styles.refThumb} />
                  ) : isVideoUrl(u) ? (
                    <video src={u} className={styles.refThumb} controls preload="metadata" playsInline />
                  ) : (
                    <a href={u} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--color-text-secondary)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ext ? `🔗 ${u.replace(/^https?:\/\//i, "").slice(0, 40)}` : "📎 anexo"}
                    </a>
                  )}
                  <button type="button" onClick={() => removeRefAt(qid, i)} aria-label="Remover anexo"
                    style={{ position: "absolute", top: -7, right: -7, width: 18, height: 18, borderRadius: "50%", border: "none", background: "#f0506e", color: "#fff", fontSize: 11, lineHeight: 1, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </span>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label className={`${styles.btn} ${styles.btnGhost}`} style={{ cursor: refBusy === qid ? "default" : "pointer", fontSize: 12, opacity: refBusy === qid ? 0.6 : 1 }}>
            {refBusy === qid ? "Enviando…" : "📎 Anexar imagem/vídeo"}
            <input type="file" accept="image/*,video/*,audio/*,.pdf,.gif,.dwg,.skp,.zip" multiple style={{ display: "none" }} disabled={refBusy === qid}
              onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length) addRefFile(qid, fs); e.target.value = ""; }} />
          </label>
          <input className={styles.input} style={{ maxWidth: 240, fontSize: 12 }} placeholder="🔗 Colar link (Drive, Pinterest…)"
            value={linkDraft[qid] ?? ""} onChange={(e) => setLinkDraft((p) => ({ ...p, [qid]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRefLink(qid); } }} />
          <button type="button" className={styles.btn} style={{ fontSize: 12 }} onClick={() => addRefLink(qid)} disabled={!(linkDraft[qid] ?? "").trim()}>+ Link</button>
        </div>
      </div>
    );
  };

  const numBadge = (i: number) => (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        fontWeight: 700,
        color: "var(--color-accent)",
        minWidth: 22,
        display: "inline-block",
      }}
    >
      {String(i + 1).padStart(2, "0")}
    </span>
  );

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>
            Respostas · Briefing Nº {number}
            {locked && <span className={`${styles.badge} ${styles.badgeAmber}`} style={{ marginLeft: 10, verticalAlign: "middle" }}>🔒 Bloqueado</span>}
          </div>
          <div className={styles.pageHint}>
            {responses.length} envio(s) recebido(s). As respostas seguem o template do cliente —
            a imagem de cada ambiente aparece com os pinos numerados.
            {locked
              ? " Edição bloqueada: o cliente só visualiza (você ainda edita por aqui)."
              : " O cliente pode editar e reenviar até você bloquear."}
          </div>
        </div>
        <div className={styles.rowActions}>
          <button
            className={`${styles.btn} ${locked ? styles.btnPrimary : styles.btnGhost}`}
            onClick={toggleLock}
            disabled={lockBusy}
            title={locked ? "Permitir que o cliente edite novamente" : "Impedir novas edições do cliente (preserva o briefing)"}
          >
            {lockBusy ? "…" : locked ? "🔓 Desbloquear edição" : "🔒 Bloquear edição"}
          </button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>← Voltar</button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.notice}>{notice}</div>}

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : responses.length === 0 ? (
        <div className={styles.empty}>Nenhuma resposta recebida ainda.</div>
      ) : (
        <div className={styles.editorGrid}>
          {responses.map((r) => {
            const hasContent = (qid: string) => answered(r.answers, qid) || refList(r, qid).length > 0;
            const orphanIds = [
              ...new Set([...Object.keys(r.answers), ...Object.keys(r.refImages)]),
            ].filter((qid) => hasContent(qid) && !knownIds.has(qid));
            return (
              <div key={r.id} className={styles.card}>
                <div className={styles.blockHead}>
                  <div className={styles.cardTitle} style={{ margin: 0 }}>
                    {r.client || "Cliente"} · #{r.id}
                  </div>
                  <span className={styles.userTag}>{submittedLabel(r)}</span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {editingId === r.id ? (
                    <>
                      <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => saveEdit(r)} disabled={saving}>
                        {saving ? "Salvando…" : "Salvar respostas"}
                      </button>
                      <button className={`${styles.btn} ${styles.btnGhost}`} onClick={cancelEdit} disabled={saving}>Cancelar</button>
                    </>
                  ) : (
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => startEdit(r)} disabled={editingId !== null}>
                      ✏ Editar respostas
                    </button>
                  )}
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => exportCsv(r)}>
                    ⬇ Exportar CSV
                  </button>
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => exportPdf(r)} disabled={pdfId === r.id}>
                    {pdfId === r.id ? "Gerando PDF…" : "⬇ Baixar PDF"}
                  </button>
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => saveToArquivos(r)} disabled={busyId === r.id}>
                    {busyId === r.id ? "Salvando…" : "📁 Salvar em Arquivos"}
                  </button>
                </div>

                {sections.map((section, si) => {
                  const showSection =
                    section.questions.length > 0 || (section.kind === "ambiente" && !!section.image);
                  if (!showSection) return null;
                  return (
                    <div key={section.id} className={styles.respGroup}>
                      <div className={styles.respGroupTitle}>
                        {section.kind === "ambiente" ? "Ambiente · " : ""}
                        {section.title}
                        {isContinuation(si) ? " · continuação" : ""}
                      </div>

                      {/* imagem do ambiente com os pinos numerados (igual o cliente vê) */}
                      {section.kind === "ambiente" && section.image && (
                        <SectionFigure section={section} />
                      )}

                      {section.questions.map((q, i) => {
                        const editing = editingId === r.id;
                        const val = (r.answers[q.id] ?? "").trim();
                        return (
                          <div key={q.id} className={styles.field} style={{ marginBottom: 12 }}>
                            <label className={styles.label}>
                              {numBadge(i)} {q.text}
                            </label>
                            {editing ? (
                              <textarea
                                className={styles.textarea}
                                rows={2}
                                value={draft[q.id] ?? ""}
                                placeholder="— sem resposta"
                                onChange={(e) => setDraft((d) => ({ ...d, [q.id]: e.target.value }))}
                              />
                            ) : val ? (
                              <div className={styles.answerView}>{val}</div>
                            ) : refList(r, q.id).length ? null : (
                              <div
                                className={styles.answerView}
                                style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}
                              >
                                — sem resposta
                              </div>
                            )}
                            {editing ? refEditor(q.id) : <Attachments urls={refList(r, q.id)} />}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {orphanIds.length > 0 && (
                  <div className={styles.respGroup}>
                    <div className={styles.respGroupTitle}>Outras respostas</div>
                    {orphanIds.map((qid) => (
                      <div key={qid} className={styles.field} style={{ marginBottom: 12 }}>
                        <label className={styles.label}>{qid}</label>
                        {answered(r.answers, qid) && (
                          <div className={styles.answerView}>{r.answers[qid]}</div>
                        )}
                        <Attachments urls={refList(r, qid)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox — imagem ampliada na MESMA tela (fecha ao clicar fora / no ✕). */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center",
            justifyContent: "center", padding: 24, cursor: "zoom-out",
          }}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Fechar"
            style={{
              position: "absolute", top: 18, right: 20, width: 40, height: 40,
              borderRadius: "0 7px 0 7px", border: "1px solid rgba(255,255,255,0.4)",
              background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 20, cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
          <img
            src={lightbox}
            alt="Anexo ampliado"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "94vw", maxHeight: "92vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          />
        </div>
      )}
    </div>
  );
}
