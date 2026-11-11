import Head from "next/head";

export default function IndexPage() {
  return (
    <>
      <Head>
        <title>DOLORES COFFEE | Máy pha và nền tảng quản lý</title>
        <meta
          name="description"
          content="Máy pha cà phê và nền tảng Dolores giúp theo dõi thiết bị, hợp đồng, hóa đơn và yêu cầu hỗ trợ."
        />
      </Head>
      <iframe
        title="Dolores Coffee — Máy pha và nền tảng quản lý"
        src="/digital-twin-landing.html"
        style={{
          position: "fixed",
          inset: 0,
          display: "block",
          width: "100vw",
          height: "100dvh",
          border: 0,
        }}
      />
    </>
  );
}
