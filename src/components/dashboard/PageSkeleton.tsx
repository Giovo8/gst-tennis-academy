/**
 * Segnaposto mostrato da `loading.tsx` durante la navigazione tra pagine della
 * dashboard: la sidebar resta visibile e l'area contenuti risponde subito al clic.
 */
export default function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse pt-3" aria-busy="true" aria-label="Caricamento">
      <div className="h-10 w-1/3 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-200 rounded-xl" />
      <div className="h-40 bg-gray-200 rounded-xl" />
    </div>
  );
}
