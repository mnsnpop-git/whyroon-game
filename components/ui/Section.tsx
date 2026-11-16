export function Section({
  title,
  icon,
  right,
  children,
  className = "",
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-3d rounded-3xl bg-panel p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white/95">
          {icon}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Chip({
  active,
  onClick,
  children,
  color,
  disabled,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={active && color ? { backgroundColor: color } : undefined}
      className={`btn-3d rounded-2xl px-3.5 py-2 text-base font-semibold ${
        active
          ? color
            ? "text-ink"
            : "glow-sky border-sky/50 bg-sky text-ink"
          : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        className="btn-3d h-10 w-10 rounded-xl border-white/10 bg-white/5 text-2xl font-bold hover:bg-white/10"
        aria-label="ลด"
      >
        −
      </button>
      <span className="w-8 text-center text-2xl font-bold tabular-nums">{value}</span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        className="btn-3d h-10 w-10 rounded-xl border-white/10 bg-white/5 text-2xl font-bold hover:bg-white/10"
        aria-label="เพิ่ม"
      >
        +
      </button>
    </div>
  );
}
