import Footer from './Footer';

// Footer per le pagine pubbliche a tutta larghezza (privacy, termini, ecc.):
// sfondo grigio ai lati come il contenitore delle altre pagine pubbliche.
// Va messo come ultimo figlio di un contenitore `min-h-screen flex flex-col`:
// `mt-auto` lo tiene in fondo anche quando il contenuto è corto.
export default function SiteFooter() {
  return (
    <div className="mt-auto bg-gray-50">
      <div className="max-w-[1400px] mx-auto">
        <Footer flush />
      </div>
    </div>
  );
}
