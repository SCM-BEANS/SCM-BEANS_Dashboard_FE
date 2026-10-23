import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import { ActionButton } from "@/components/button/action-button";
import { SectionHeading } from "@/components/heading/section-heading";
import coffeeMachineImage from "@/assets/coffee-machine-float.png";

export function ProductSection() {
  return (
    <section id="solutions" className="section product-section">
      <div className="wrap product-grid">
        <div className="product-image">
          <Image
            src={coffeeMachineImage}
            alt="Máy pha cà phê thông minh DOLORES COFFEE"
            width={760}
            height={760}
          />
          <span className="product-label">Thiết bị kết nối IoT</span>
        </div>

        <div id="products" className="product-copy">
          <SectionHeading
            eyebrow="Sản phẩm & giải pháp"
            title="Thiết bị phù hợp với nhịp vận hành của bạn"
            description="Từ máy pha chuyên nghiệp đến nền tảng quản lý tập trung, mọi thành phần được thiết kế để hoạt động cùng nhau."
          />
          <h3>Vận hành đơn giản. Trải nghiệm nhất quán.</h3>
          <p>
            Theo dõi thiết bị, kiểm soát hoạt động và quản lý dịch vụ trên cùng
            một nền tảng, dù bạn có một cửa hàng hay cả chuỗi.
          </p>
          <ul className="benefit-list">
            <li><span className="check-mark"><Check size={13} /></span>Giám sát tình trạng máy theo thời gian thực.</li>
            <li><span className="check-mark"><Check size={13} /></span>Chủ động lên lịch bảo trì và giảm thời gian gián đoạn.</li>
            <li><span className="check-mark"><Check size={13} /></span>Mở rộng hệ thống theo quy mô kinh doanh.</li>
          </ul>
          <ActionButton href="#technology" variant="text" icon={<ArrowRight size={15} />}>
            Tìm hiểu công nghệ
          </ActionButton>
        </div>
      </div>
    </section>
  );
}
