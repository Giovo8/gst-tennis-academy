import { Bug, Lightbulb, MessageCircle } from 'lucide-react';

const STILE = {
  suggerimento: { icon: Lightbulb, color: '#023047' },
  problema: { icon: Bug, color: '#023b52' },
  altro: { icon: MessageCircle, color: 'var(--color-frozen-lake-900)' },
} as const;

/** Intestazione del dettaglio feedback, sul modello di quella delle competizioni. */
export default function FeedbackBanner({
  categoria,
  titolo,
}: {
  categoria: keyof typeof STILE;
  titolo: string | null;
}) {
  const { icon: Icon, color } = STILE[categoria] ?? STILE.altro;

  return (
    <div
      className="rounded-lg border border-black/10 p-6 border-l-4"
      style={{ backgroundColor: color, borderLeftColor: color }}
    >
      <div className="flex items-start gap-6">
        <Icon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white break-words">{titolo || 'Feedback'}</h2>
        </div>
      </div>
    </div>
  );
}
