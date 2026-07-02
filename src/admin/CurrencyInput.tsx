import { useEffect, useState } from "react";

// Campo de valor em reais com máscara automática (pt-BR). O usuário digita só
// dígitos e eles preenchem da direita p/ esquerda como centavos:
//   "1" → 0,01 · "150" → 1,50 · "150000" → 1.500,00
// Expõe o valor numérico em reais via onChange (null quando vazio).
const NUM = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CurrencyInput({
  value,
  onChange,
  className,
  placeholder = "0,00",
  disabled,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [display, setDisplay] = useState(value == null ? "" : NUM.format(value));

  // Reformatar só quando o valor externo difere do que está no campo (ex.: ao
  // carregar dados). Durante a digitação não reformata (evita pulo de cursor).
  useEffect(() => {
    const digits = display.replace(/\D/g, "");
    const current = digits ? parseInt(digits, 10) / 100 : null;
    if (current !== (value ?? null)) {
      setDisplay(value == null ? "" : NUM.format(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setDisplay("");
      onChange(null);
      return;
    }
    const cents = parseInt(digits, 10);
    setDisplay(NUM.format(cents / 100));
    onChange(cents / 100);
  };

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => handle(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
