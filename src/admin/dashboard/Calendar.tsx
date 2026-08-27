import { useEffect, useMemo, useState } from "react";
import { api, type CalendarEvent, type Task } from "../api";
import admin from "../Admin.module.css";
import s from "./Dashboard.module.css";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayKey(): string {
  const d = new Date();
  return ymd(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function Calendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11
  const [selected, setSelected] = useState<string>(todayKey());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  // Tarefas do módulo Tarefas com prazo no mês (conexão com o Calendário).
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  // formulário de novo evento
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [kind, setKind] = useState<"tarefa" | "compromisso">("tarefa");
  const [saving, setSaving] = useState(false);

  const load = async (y: number, m: number) => {
    const from = ymd(y, m, 1);
    const to = ymd(y, m, new Date(y, m + 1, 0).getDate());
    try {
      const [{ events }, { tasks }] = await Promise.all([
        api.listCalendar(from, to),
        api.listTasks({ from, to }),
      ]);
      setEvents(events);
      setTasks(tasks);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar agenda.");
    }
  };

  useEffect(() => {
    load(year, month);
  }, [year, month]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [events]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const arr = map.get(t.dueDate) ?? [];
      arr.push(t);
      map.set(t.dueDate, arr);
    }
    return map;
  }, [tasks]);

  const toggleTaskDone = async (t: Task) => {
    const next = t.status === "concluida" ? "aberta" : "concluida";
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    try { await api.updateTask(t.id, { status: next }); } catch { load(year, month); }
  };

  // grade 6 semanas
  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: { key: string; day: number; outside: boolean }[] = [];
    // dias do mês anterior
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDow - 1; i >= 0; i--) {
      const d = prevDays - i;
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      out.push({ key: ymd(py, pm, d), day: d, outside: true });
    }
    for (let d = 1; d <= daysInMonth; d++) out.push({ key: ymd(year, month, d), day: d, outside: false });
    while (out.length % 7 !== 0 || out.length < 42) {
      const idx = out.length - (firstDow + daysInMonth);
      const d = idx + 1;
      const nm = month === 11 ? 0 : month + 1;
      const ny = month === 11 ? year + 1 : year;
      out.push({ key: ymd(ny, nm, d), day: d, outside: true });
      if (out.length >= 42) break;
    }
    return out;
  }, [year, month]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const tk = todayKey();
  const dayEvents = byDate.get(selected) ?? [];
  const dayTasks = tasksByDate.get(selected) ?? [];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { event } = await api.createCalendarEvent({
        date: selected, title: title.trim(), time: time || null, kind,
      });
      setEvents((prev) => [...prev, event]);
      setTitle(""); setTime("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (ev: CalendarEvent) => {
    setEvents((prev) => prev.map((x) => (x.id === ev.id ? { ...x, done: !x.done } : x)));
    try { await api.updateCalendarEvent(ev.id, { done: !ev.done }); } catch { load(year, month); }
  };
  const removeEvent = async (ev: CalendarEvent) => {
    setEvents((prev) => prev.filter((x) => x.id !== ev.id));
    try { await api.deleteCalendarEvent(ev.id); } catch { load(year, month); }
  };

  const selectedLabel = (() => {
    const [y, m, d] = selected.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  })();

  return (
    <>
      <div className={s.greeting}>
        <div>
          <h1 className={s.greetTitle}>Calendário</h1>
          <p className={s.greetSub}>Clique num dia para adicionar tarefas e compromissos.</p>
        </div>
      </div>

      {error && <div className={admin.error} style={{ marginBottom: 12 }}>{error}</div>}

      <div className={s.calLayout}>
        {/* grade do mês */}
        <div className={s.card}>
          <div className={s.calHead}>
            <span className={s.calMonth}>{monthLabel}</span>
            <div className={s.calNav}>
              <button className={s.iconButton} onClick={prevMonth} aria-label="Mês anterior">‹</button>
              <button className={s.iconButton} onClick={nextMonth} aria-label="Próximo mês">›</button>
            </div>
          </div>
          <div className={s.calGrid}>
            {DOW.map((d) => <div key={d} className={s.calDow}>{d}</div>)}
            {cells.map((c) => {
              const evs = byDate.get(c.key) ?? [];
              const tks = tasksByDate.get(c.key) ?? [];
              const dots = [
                ...evs.map((e) => ({ id: e.id, kind: e.kind })),
                ...tks.map((t) => ({ id: `task:${t.id}`, kind: "tarefa" as const })),
              ];
              const cls = [
                s.calCell,
                c.outside ? s.calCellOut : "",
                c.key === tk ? s.calCellToday : "",
                c.key === selected ? s.calCellActive : "",
              ].join(" ");
              return (
                <button key={c.key} className={cls} onClick={() => setSelected(c.key)}>
                  <span className={s.calDayNum}>{c.day}</span>
                  {dots.length > 0 && (
                    <span className={s.calDots}>
                      {dots.slice(0, 3).map((e) => (
                        <span key={e.id} className={`${s.calDot} ${e.kind === "compromisso" ? s.calDotCompromisso : ""}`} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* painel do dia */}
        <div className={s.card}>
          <div className={s.dayPanel}>
            <span className={s.dayTitle} style={{ textTransform: "capitalize" }}>{selectedLabel}</span>

            {dayEvents.length === 0 && dayTasks.length === 0 && <div className={s.emptyMini}>Nenhum item nesse dia.</div>}

            {/* Tarefas (do módulo Tarefas) com prazo nesse dia — marcar concluída aqui. */}
            {dayTasks.map((t) => (
              <div key={`task:${t.id}`} className={s.eventItem}>
                <button
                  className={`${s.eventCheck} ${t.status === "concluida" ? s.eventCheckDone : ""}`}
                  onClick={() => toggleTaskDone(t)}
                  aria-label="Concluir tarefa"
                >✓</button>
                <div className={s.eventBody}>
                  <div className={`${s.eventTitle} ${t.status === "concluida" ? s.eventTitleDone : ""}`}>{t.title}</div>
                  <div className={s.eventMeta}>
                    <span className={`${s.eventKind} ${s.kindTarefa}`}>tarefa</span>
                    {t.priority === "alta" ? "prioridade alta" : "em Tarefas"}
                  </div>
                </div>
              </div>
            ))}

            {dayEvents.map((ev) => (
              <div key={ev.id} className={s.eventItem}>
                <button
                  className={`${s.eventCheck} ${ev.done ? s.eventCheckDone : ""}`}
                  onClick={() => toggleDone(ev)}
                  aria-label="Concluir"
                >✓</button>
                <div className={s.eventBody}>
                  <div className={`${s.eventTitle} ${ev.done ? s.eventTitleDone : ""}`}>{ev.title}</div>
                  <div className={s.eventMeta}>
                    <span className={`${s.eventKind} ${ev.kind === "compromisso" ? s.kindCompromisso : s.kindTarefa}`}>{ev.kind}</span>
                    {ev.time ? ev.time : "dia todo"}
                  </div>
                </div>
                <button className={s.eventDel} onClick={() => removeEvent(ev)} aria-label="Excluir">×</button>
              </div>
            ))}

            <form className={s.addForm} onSubmit={addEvent}>
              <div className={s.kindToggle}>
                <button type="button" className={`${s.kindBtn} ${kind === "tarefa" ? s.kindBtnActive : ""}`} onClick={() => setKind("tarefa")}>Tarefa</button>
                <button type="button" className={`${s.kindBtn} ${kind === "compromisso" ? s.kindBtnActive : ""}`} onClick={() => setKind("compromisso")}>Compromisso</button>
              </div>
              <div className={s.addRow}>
                <input className={admin.input} placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1 }} />
                <input className={admin.input} type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: 110 }} />
              </div>
              <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={saving || !title.trim()} style={{ justifyContent: "center" }}>
                {saving ? "Salvando…" : "Adicionar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
