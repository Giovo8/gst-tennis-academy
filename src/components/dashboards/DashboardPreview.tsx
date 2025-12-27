type DashboardPreviewProps = {
  title: string;
  description: string;
  highlights: string[];
  cta?: string;
};

export default function DashboardPreview({
  title,
  description,
  highlights,
  cta = "Accesso dedicato",
}: DashboardPreviewProps) {
  return (
    <div className="flex min-h-[320px] flex-col gap-6 rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2">
            Dashboard
          </p>
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {description}
          </p>
        </div>
        <span className="rounded-full bg-accent-15 px-3 py-1 text-xs font-semibold text-[#06101f] accent-gradient">
          {cta}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {highlights.map((item) => (
          <div key={item} className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 px-4 py-3 text-sm text-muted">
            {item}
          </div>
        ))}
      </div>

      <p className="text-xs uppercase tracking-[0.2em] text-muted-2">
        Work in progress • UI pronta per connessione ai dati reali
      </p>
    </div>
  );
}

