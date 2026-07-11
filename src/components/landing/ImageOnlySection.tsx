"use client";

export default function ImageOnlySection() {
  return (
    <div
      className="overflow-hidden h-[56vw] sm:h-[400px] md:h-[500px] lg:h-[580px] xl:h-[640px]"
        style={{
          backgroundImage: 'url(/images/1.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 50%',
        }}
        role="img"
        aria-label="Campo da tennis GST Tennis Academy"
      />
  );
}
