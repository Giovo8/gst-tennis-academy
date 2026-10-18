const WORDS = ['Gioca.', 'Impara.', 'Vinci'];
const WORD_STAGGER = 0.3; // secondi tra una parola e l'altra (la pallina parte a 1.1s, vedi .hero-ball)

// Pallina del logo GST (la stessa della navbar): usata come punto finale di "Vinci."
function TennisBall() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/logo-tennis-96.png"
      alt=""
      aria-hidden="true"
      draggable={false}
      className="w-full h-full"
    />
  );
}

// Mobile: una parola per riga. Da tablet in su: una sola riga, che scala con lo schermo fino al massimo desktop
const H1_CLASS =
  'text-[16vw] md:text-[length:min(9vw,7rem)] md:whitespace-nowrap font-extrabold mb-5 sm:mb-6 text-secondary leading-[1.05] tracking-tight';
const WORD_CLASS = [
  'block md:inline-block',
  'block md:inline-block',
  'block md:inline-block mt-[0.09em] md:mt-0',
];

// Titolo hero: le parole entrano una alla volta, poi la pallina cade e rimbalza
// fino a fermarsi al posto del punto di "Vinci.". Animazioni in puro CSS
// (.hero-word / .hero-ball in globals.css), disattivate con prefers-reduced-motion.
export default function HeroTitle() {
  return (
    <h1 aria-label="Gioca. Impara. Vinci." className={H1_CLASS}>
      {WORDS.map((word, i) => (
        <span key={word}>
          <span
            aria-hidden="true"
            className={`${WORD_CLASS[i]} hero-word`}
            style={{ animationDelay: `${i * WORD_STAGGER}s` }}
          >
            {word}
            {i === 2 && (
              <span className="inline-block w-[0.24em] h-[0.24em] ml-[0.04em] align-baseline hero-ball">
                <TennisBall />
              </span>
            )}
          </span>
          {i < WORDS.length - 1 && ' '}
        </span>
      ))}
    </h1>
  );
}
