"use client";

export default function ImageOnlySection() {
  return (
    <section className="w-full">
      <div className="relative w-full h-[400px] sm:h-[600px] md:h-[700px] lg:h-[800px] xl:h-[900px] flex items-center justify-center overflow-hidden">
        <img
          src="/images/1.jpeg"
          alt="Campo da tennis GST Tennis Academy"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    </section>
  );
}
