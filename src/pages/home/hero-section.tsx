import { ArrowDown, ArrowRight } from "lucide-react";
import { ActionButton } from "@/components/button/action-button";

export function HeroSection() {
  return (
    <section className="hero">
      <div className="wrap">
        <div className="hero-content">
          <div className="eyebrow">Giải pháp cà phê thông minh</div>
          <h1>
            Nâng tầm trải nghiệm
            <br />
            <em>cà phê của bạn</em>
          </h1>
          <p className="hero-copy">
            Tối ưu vận hành, kết nối thiết bị và mở rộng kinh doanh với giải pháp
            máy pha cà phê thông minh tích hợp IoT và Cloud từ DOLORES COFFEE.
          </p>
          <div className="button-row">
            <ActionButton href="#contact" variant="primary" icon={<ArrowRight size={16} />}>
              Khám phá giải pháp
            </ActionButton>
            <ActionButton href="#products" variant="outline">Xem sản phẩm</ActionButton>
          </div>
          <a className="hero-note" href="#solutions">
            <ArrowDown size={14} /> Khám phá thêm
          </a>
        </div>
      </div>
    </section>
  );
}
