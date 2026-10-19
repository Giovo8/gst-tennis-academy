import Image from 'next/image';

// Immagine subito sotto l'hero: è l'elemento più grande della prima schermata,
// quindi viene precaricata (priority) e servita in WebP alla larghezza giusta.
export default function ImageOnlySection() {
  return (
    <div className="relative overflow-hidden h-[56vw] sm:h-[400px] md:h-[500px] lg:h-[580px] xl:h-[640px]">
      <Image
        src="/images/1.jpeg"
        alt="Campo da tennis GST Tennis Academy"
        fill
        priority
        sizes="(max-width: 1400px) 100vw, 1400px"
        className="object-cover object-[center_50%]"
      />
    </div>
  );
}
