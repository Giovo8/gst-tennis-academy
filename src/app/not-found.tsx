import Link from 'next/link';
import PublicNavbar from '@/components/layout/PublicNavbar';
import Footer from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto bg-white min-h-screen flex flex-col">
        <PublicNavbar home flush />
        <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3 text-secondary">
            Errore 404
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            Pagina non trovata
          </h1>
          <p className="text-base sm:text-lg max-w-md text-gray-500 mb-8">
            La pagina che cerchi non esiste o è stata spostata.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-secondary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Torna alla home
          </Link>
        </main>
        <Footer flush />
      </div>
    </div>
  );
}
