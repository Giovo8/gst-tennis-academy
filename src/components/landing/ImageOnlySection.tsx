"use client";

export default function ImageOnlySection() {
  return (
    <section className="w-full" style={{ lineHeight: 0 }}>
      <img
        src="/images/1.jpeg"
        alt="Campo da tennis GST Tennis Academy"
        className="w-full block"
        style={{ 
          display: 'block',
          height: '500px',
          objectFit: 'cover',
          verticalAlign: 'bottom'
        }}
        loading="lazy"
      />
    </section>
  );
}
