"use client";

/**
 * ClientLogos — Marquee strip of partner logos
 * Images: place logo files in /public/logos/partner-1.svg ... partner-6.svg
 * While waiting, displays stylized text placeholders.
 */

const partners = [
  { name: "The Coffee House", short: "TCH" },
  { name: "Highlands Coffee", short: "HLC" },
  { name: "Phúc Long", short: "PHL" },
  { name: "Trung Nguyên Legend", short: "TNL" },
  { name: "Cộng Cà Phê", short: "CCP" },
  { name: "Milano Coffee", short: "MLC" },
  { name: "King Coffee", short: "KNG" },
  { name: "Starbucks VN", short: "SBK" },
];

// Duplicated for seamless infinite marquee
const allLogos = [...partners, ...partners];

export function ClientLogos() {
  return (
    <section className="w-full bg-[#F5F7FA] border-y border-[#ABBED1]/30 py-12 overflow-hidden">
      <div className="max-w-[1320px] mx-auto px-6 mb-8 text-center">
        <p className="text-[#89939E] text-sm font-medium tracking-wider uppercase">
          Được tin dùng bởi các doanh nghiệp hàng đầu
        </p>
      </div>

      {/* Marquee track */}
      <div className="relative pause-marquee">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#F5F7FA] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#F5F7FA] to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee gap-8 w-max">
          {allLogos.map((partner, i) => (
            <div
              key={i}
              className="flex items-center justify-center h-14 px-8 bg-white border border-[#ABBED1]/30 rounded-xl shadow-figma-2 shrink-0 min-w-[160px] group hover:border-[#0671E0]/30 hover:shadow-figma-4 transition-all duration-200"
            >
              {/* 
                PLACEHOLDER — Replace with Next.js <Image> when logo files are ready:
                <Image src={`/logos/partner-${i+1}.svg`} alt={partner.name} width={120} height={32} className="grayscale group-hover:grayscale-0 transition-all" />
              */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#0671E0]/10 flex items-center justify-center shrink-0">
                  <span className="text-[#0671E0] text-[9px] font-black">{partner.short}</span>
                </div>
                <span className="text-[#4D4D4D] text-sm font-semibold whitespace-nowrap group-hover:text-[#18191F] transition-colors">
                  {partner.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
