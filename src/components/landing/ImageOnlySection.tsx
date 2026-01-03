"use client";

export default function ImageOnlySection() {
  return (
    <section className="w-full" style={{ lineHeight: 0 }}>
      <img
        src="/images/1.jpeg"
        alt="Campo da tennis GST Tennis Academy"
        className="w-full block h-[500px] sm:h-[600px] md:h-[700px] lg:h-[800px] xl:h-[900px]"
        style={{ 
          display: 'block',
          objectFit: 'cover',
          verticalAlign: 'bottom',
          maxHeight: '900px'
        }}
        loading="lazy"
      />
    </section>
  );
}
