import Link from "next/link";
import { ArrowRight, Coffee, ShieldCheck, Store, Wrench } from "lucide-react";

const workspaces = [
  { role: "admin", title: "Admin", text: "Báo cáo vận hành, tài khoản, hợp đồng, kho máy và Global Menu.", icon: ShieldCheck, tag: "Quản trị hệ thống" },
  { role: "moderator", title: "Moderator", text: "Theo dõi khách hàng, hóa đơn, máy IoT và điều phối kỹ thuật.", icon: Store, tag: "Vận hành hợp đồng" },
  { role: "technician", title: "Technician", text: "Nhận việc được giao, xem hồ sơ máy và cập nhật kết quả.", icon: Wrench, tag: "Công việc hiện trường" },
  { role: "customer", title: "Khách hàng", text: "Xem máy, số ly, hóa đơn và menu riêng của cửa hàng.", icon: Coffee, tag: "Không gian cửa hàng" },
];

export default function Home() {
  return (
    <main className="landing-shell">
      <div className="landing-top"><Link href="/" className="brand-word">dolores<span>.</span></Link><span className="preview-pill"><i /> Bản xem trước local</span></div>
      <section className="landing-hero">
        <div className="landing-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> NỀN TẢNG VẬN HÀNH COFFEE IoT</span>
          <h1>Vận hành gọn gàng.<br /><em>Máy luôn trong tầm mắt.</em></h1>
          <p>Chọn không gian làm việc để mở dashboard Dolores. Giao diện được chuyển thể từ prototype Figma và hỗ trợ cả màn hình lớn lẫn điện thoại.</p>
        </div>
        <div className="landing-orbit" aria-hidden="true"><div className="orbit-ring orbit-one" /><div className="orbit-ring orbit-two" /><div className="orbit-core"><Coffee size={54} strokeWidth={1.3} /></div><span className="orbit-dot dot-a" /><span className="orbit-dot dot-b" /><span className="orbit-dot dot-c" /></div>
      </section>
      <section className="workspace-grid" aria-label="Chọn vai trò">
        {workspaces.map((space, index) => {
          const Icon = space.icon;
          return <Link href={`/${space.role}`} key={space.role} className="workspace-link">
            <article className="workspace-card" style={{ animationDelay: `${index * 70}ms` }}>
              <div className="workspace-card-head"><span className="workspace-icon"><Icon size={19} strokeWidth={1.8} /></span><span className="workspace-arrow"><ArrowRight size={17} /></span></div>
              <span className="workspace-tag">{space.tag}</span><h2>{space.title}</h2><p>{space.text}</p>
            </article>
          </Link>;
        })}
      </section>
      <footer className="landing-footer"><span>Dolores · Máy Smart IoT & quản lý hợp đồng</span><span>Chọn một vai trò để bắt đầu <ArrowRight size={13} /></span></footer>
    </main>
  );
}
