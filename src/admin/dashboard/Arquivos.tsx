import { useEffect, useState, useCallback, useRef } from "react";
import { api, ApiError, type DocumentFile, type Client } from "../api";
import s from "./Dashboard.module.css";
import admin from "../Admin.module.css";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}
function fileIcon(name: string, type: string | null): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (type?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📕";
  if (["doc", "docx"].includes(ext)) return "📘";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📗";
  if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
  if (["dwg", "dxf"].includes(ext)) return "📐";
  return "📄";
}

export default function Arquivos() {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [folder, setFolder] = useState("");
  const [uploadClient, setUploadClient] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [filterFolder, setFilterFolder] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ files }, { clients }] = await Promise.all([api.listDocuments(), api.listClients()]);
      setFiles(files);
      setClients(clients);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doUpload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      await api.uploadDocument(file, folder || undefined, uploadClient || undefined);
      if (fileInput.current) fileInput.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (f: DocumentFile) => {
    if (!confirm(`Excluir "${f.name}"? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    try {
      await api.deleteDocument(f.key);
      setFiles((prev) => prev.filter((x) => x.key !== f.key));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao excluir.");
    } finally {
      setBusy(false);
    }
  };

  const folders = Array.from(new Set(files.map((f) => f.folder))).sort();
  const shown = files.filter(
    (f) =>
      (!filterFolder || f.folder === filterFolder) &&
      (!search || f.name.toLowerCase().includes(search.toLowerCase()))
  );
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <>
      <div className={s.greeting}>
        <div>
          <h1 className={s.greetTitle}>Arquivos</h1>
          <p className={s.greetSub}>Documentos do estúdio no armazenamento seguro (R2). {files.length} arquivo(s) · {formatBytes(totalBytes)}.</p>
        </div>
        <button className={`${admin.btn} ${admin.btnGhost}`} onClick={load} disabled={loading}>Atualizar</button>
      </div>

      {error && <div className={admin.error}>{error}</div>}

      {/* Upload */}
      <div className={s.card} style={{ marginBottom: 16 }}>
        <div className={s.cardTitleX}>Enviar arquivo</div>
        <div className={s.cardSub} style={{ marginBottom: 12 }}>PDFs, imagens, plantas, planilhas… até 25 MB. Vincule a um cliente para ele ver na Área do Cliente dele.</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className={admin.input}
            style={{ maxWidth: 200 }}
            placeholder="Pasta (opcional)"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            disabled={busy}
          />
          <select className={admin.input} style={{ maxWidth: 220 }} value={uploadClient} onChange={(e) => setUploadClient(e.target.value)} disabled={busy}>
            <option value="">Sem cliente (interno)</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input
            ref={fileInput}
            type="file"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doUpload(f);
            }}
          />
          {busy && <span className={s.emptyMini} style={{ margin: 0 }}>Enviando…</span>}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <input className={admin.input} style={{ maxWidth: 260 }} placeholder="Buscar por nome…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={admin.input} style={{ maxWidth: 200 }} value={filterFolder} onChange={(e) => setFilterFolder(e.target.value)}>
          <option value="">Todas as pastas</option>
          {folders.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {loading ? (
        <div className={s.emptyMini}>Carregando…</div>
      ) : shown.length === 0 ? (
        <div className={admin.empty}>
          {files.length === 0 ? "Nenhum arquivo ainda. Envie o primeiro acima." : "Nenhum arquivo neste filtro."}
        </div>
      ) : (
        <table className={admin.table}>
          <thead>
            <tr><th>Arquivo</th><th>Pasta</th><th>Cliente</th><th>Tamanho</th><th>Enviado</th><th style={{ textAlign: "right" }}>Ações</th></tr>
          </thead>
          <tbody>
            {shown.map((f) => (
              <tr key={f.key}>
                <td>{fileIcon(f.name, f.contentType)} {f.name}</td>
                <td><span className={`${admin.badge} ${admin.badgeDraft}`}>{f.folder}</span></td>
                <td>{f.clientName ? <span className={`${admin.badge} ${admin.badgeSigned}`}>{f.clientName}</span> : <span style={{ opacity: 0.5 }}>—</span>}</td>
                <td className={admin.mono}>{formatBytes(f.size)}</td>
                <td>{fmtDate(f.uploaded)}</td>
                <td>
                  <div className={admin.rowActions}>
                    <a className={`${admin.btn} ${admin.btnGhost}`} href={api.documentDownloadUrl(f.key)} target="_blank" rel="noopener noreferrer">Baixar</a>
                    <button className={`${admin.btn} ${admin.btnDanger}`} onClick={() => remove(f)} disabled={busy}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
