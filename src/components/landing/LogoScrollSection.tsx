export default function LogoScrollSection() {
  const logos = [
    { src: "/images/logo/Dunlop-logo-4C18C47FBA-seeklogo.com-649631757.png", alt: "Dunlop", mobileClass: "w-[100px] h-[38px]" },
    { src: "/images/logo/1729263756_adidas-logo-png-210379511.png", alt: "Adidas", mobileClass: "w-[80px] h-[32px]" },
    { src: "/images/logo/FITP-LOGO-2501270168.png", alt: "FITP", mobileClass: "w-[96px] h-[38px]" },
  ];

  return (
    <section className="py-10" style={{ backgroundColor: '#023047' }}>
      <div className="flex items-center justify-center gap-8 sm:gap-16 flex-nowrap px-6 sm:px-8">
        {logos.map((logo, i) => (
          <div key={i} className={`flex items-center justify-center sm:w-[130px] sm:h-[48px] ${logo.mobileClass}`}>
            <img
              src={logo.src}
              alt={logo.alt}
              className="w-full h-full object-contain brightness-0 invert opacity-80"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
