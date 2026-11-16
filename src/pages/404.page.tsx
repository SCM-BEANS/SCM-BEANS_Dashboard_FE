import Head from "next/head";
import Link from "next/link";
import { FileSearch, ArrowLeft } from "lucide-react";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButton } from "@/components/navigation/back-button";
import { PATH_HOME } from "@/routes/path";
import styles from "./not-found.module.css";

export default function NotFoundPage() {
  return <>
    <style jsx global>{`body { margin: 0; }`}</style>
    <Head><title>Không tìm thấy trang | Dolores.</title><meta name="robots" content="noindex" /></Head>
    <div className={styles.page}>
      <header className={styles.header}><Link href={PATH_HOME.ROOT} className={styles.logo} aria-label="Dolores — Trang chủ">dolores.</Link></header>
      <main className={styles.content}>
        <div className={styles.symbol} aria-hidden="true"><FileSearch size={48} strokeWidth={1.4} /></div>
        <span className={styles.code}>404</span>
        <h1>Không tìm thấy trang</h1>
        <p>Trang bạn đang tìm có thể đã được chuyển, không còn sử dụng hoặc đường dẫn chưa chính xác.</p>
        <div className={styles.actions}>
          <BackButton label="Quay lại trang trước" fallbackHref={PATH_HOME.ROOT} />
          <ButtonBar rollingLabel variant="primary" href={PATH_HOME.ROOT}>Về trang chủ</ButtonBar>
        </div>
        <Link className={styles.help} href="/login"><ArrowLeft size={15} aria-hidden="true" />Đăng nhập để tiếp tục quản lý</Link>
      </main>
      <footer className={styles.footer}>Dolores Coffee</footer>
    </div>
  </>;
}
