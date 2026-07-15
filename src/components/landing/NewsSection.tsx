"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const tabs = ["Tin tức", "Blog", "Sự kiện"];
const newsData = [
  {
    category: "Tin tức",
    title: "DEER COFFEE mở rộng dịch vụ ra 5 tỉnh thành mới trong năm 2026",
    date: "JUL 01, 2026",
    dark: true,
  },
  {
    category: "Blog",
    title: "IoT trong ngành cà phê: Cách dữ liệu thời gian thực giúp tối ưu chi phí vận hành",
    date: "JUN 15, 2026",
    dark: false,
  },
  {
    category: "Blog",
    title: "5 lý do tại sao các chuỗi F&B nên thuê máy pha cà phê thay vì mua",
    date: "MAY 28, 2026",
    dark: false,
  },
  {
    category: "Sự kiện",
    title: "DEER COFFEE tham gia Vietnam Coffee Expo 2026 — Booth A12",
    date: "APR 10, 2026",
    dark: true,
  },
];

export function NewsSection() {
  const [activeTab, setActiveTab] = useState("Tin tức");

  const filtered = activeTab === "Tin tức" ? newsData : newsData.filter((n) => n.category === activeTab);

  return (
    <section id="news" className="bg-white py-32 px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-black mb-6">
              Tin tức & Cập nhật
            </h2>
            <div className="flex gap-6 border-b border-black/10">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  id={`news-tab-${tab.replace(" ", "-").toLowerCase()}`}
                  className={`pb-3 text-sm font-bold uppercase tracking-widest transition-colors relative ${
                    activeTab === tab ? "text-black" : "text-black/40 hover:text-black/60"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-black"></span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <a href="#" className="group flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-black">
            Xem tất cả <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((item, idx) => (
            <Link
              key={idx}
              href="#"
              id={`news-card-${idx}`}
              className={`group rounded-2xl p-8 flex flex-col gap-4 min-h-[240px] hover:scale-[1.02] transition-all duration-300 ${
                item.dark ? "bg-black text-white" : "bg-lp-card text-black"
              }`}
            >
              <div className={`text-xs font-bold px-3 py-1 rounded-full w-fit ${
                item.dark ? "bg-white/10 text-white/70" : "bg-black/10 text-black/70"
              }`}>
                {item.category}
              </div>
              <h3 className="text-lg font-bold leading-snug flex-1">{item.title}</h3>
              <div className="flex items-center justify-between mt-auto">
                <span className={`text-xs font-semibold tracking-wider ${
                  item.dark ? "text-white/40" : "text-black/50"
                }`}>
                  {item.date}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform opacity-50" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
