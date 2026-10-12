"use client";

import { motion, useReducedMotion } from "framer-motion";

const WORDS = ["Gioca.", "Impara.", "Vinci"];
const WORD_STAGGER = 0.3; // secondi tra una parola e l'altra
const BALL_DELAY = WORDS.length * WORD_STAGGER + 0.2;

// Pallina del logo GST (la stessa della navbar): usata come punto finale di "Vinci."
function TennisBall() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/images/logo-tennis-96.png" alt="" aria-hidden="true" draggable={false} className="w-full h-full" />
  );
}

// Mobile: una parola per riga. Da tablet in su: una sola riga, che scala con lo schermo fino al massimo desktop
const H1_CLASS =
  "text-[16vw] md:text-[length:min(9vw,7rem)] md:whitespace-nowrap font-extrabold mb-5 sm:mb-6 text-secondary leading-[1.05] tracking-tight";
const WORD_CLASS = ["block md:inline-block", "block md:inline-block", "block md:inline-block mt-[0.09em] md:mt-0"];

// Titolo hero: le parole entrano una alla volta, poi la pallina cade e rimbalza
// fino a fermarsi al posto del punto di "Vinci.".
export default function HeroTitle() {
  const reduceMotion = useReducedMotion();

  const ball = (
    <span className="inline-block w-[0.24em] h-[0.24em] ml-[0.04em] align-baseline">
      <TennisBall />
    </span>
  );

  if (reduceMotion) {
    return (
      <h1 className={H1_CLASS}>
        <span className={WORD_CLASS[0]}>Gioca.</span>{" "}
        <span className={WORD_CLASS[1]}>Impara.</span>{" "}
        <span className={WORD_CLASS[2]}>Vinci{ball}</span>
      </h1>
    );
  }

  return (
    <h1 aria-label="Gioca. Impara. Vinci." className={H1_CLASS}>
      {WORDS.map((word, i) => (
        <span key={word}>
          <motion.span
            aria-hidden="true"
            className={WORD_CLASS[i]}
            initial={{ opacity: 0, y: "0.35em" }}
            animate={{ opacity: 1, y: "0em" }}
            transition={{ duration: 0.6, delay: i * WORD_STAGGER, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {word}
            {i === 2 && (
              <motion.span
                className="inline-block w-[0.24em] h-[0.24em] ml-[0.04em] align-baseline origin-bottom"
                initial={{ opacity: 0, y: "-3em" }}
                animate={{
                  opacity: 1,
                  y: ["-3em", "0em", "-1.1em", "0em", "-0.4em", "0em", "-0.12em", "0em"],
                  scaleY: [1, 0.75, 1.05, 0.85, 1, 0.93, 1, 1],
                  scaleX: [1, 1.2, 0.97, 1.1, 1, 1.05, 1, 1],
                }}
                transition={{
                  default: {
                    delay: BALL_DELAY,
                    duration: 1.4,
                    times: [0, 0.28, 0.48, 0.64, 0.76, 0.86, 0.93, 1],
                    ease: ["easeIn", "easeOut", "easeIn", "easeOut", "easeIn", "easeOut", "easeIn"],
                  },
                  opacity: { delay: BALL_DELAY, duration: 0.15 },
                }}
              >
                <TennisBall />
              </motion.span>
            )}
          </motion.span>
          {i < WORDS.length - 1 && " "}
        </span>
      ))}
    </h1>
  );
}
