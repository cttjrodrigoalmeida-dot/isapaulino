import s from "./Dashboard.module.css";

export default function Placeholder({ title, sub }: { title: string; sub: string }) {
  return (
    <div className={s.placeholderPage}>
      <span className={s.soonTag}>Em breve</span>
      <div className={s.placeholderTitle}>{title}</div>
      <p style={{ maxWidth: 420 }}>{sub}</p>
    </div>
  );
}
