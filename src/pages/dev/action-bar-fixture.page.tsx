import type { GetServerSideProps } from "next";
import { ActionBarLayout } from "@/components/action-bar/action-bar";
import { PageActions, type PageAction } from "@/components/action-bar/page-actions";

const actions: PageAction[] = [
  { id: "primary", label: "Lưu thay đổi", variant: "primary" },
  { id: "danger", label: "Xóa mục", variant: "danger" },
  { id: "edit", label: "Mở chi tiết", variant: "secondary" },
  {
    id: "confirm",
    label: "Tiếp tục",
    confirm: {
      title: "Xác nhận thao tác",
      description: "Bạn có muốn tiếp tục không?",
      confirmLabel: "Thực hiện",
    },
    href: "/",
  },
  {
    id: "disabled",
    label: "Tác vụ bị khóa",
    disabled: true,
    disabledReason: "Cần quyền quản lý để tiếp tục.",
  },
  { id: "extra", label: "Xem thêm" },
];

export default function ActionBarFixturePage() {
  return (
    <ActionBarLayout label="Thao tác kiểm thử">
      <main>
        <section>
          <h1>Kiểm thử thanh thao tác</h1>
          <p>Trang fixture chỉ phục vụ kiểm thử giao diện trong môi trường phát triển.</p>
        </section>
      </main>
      <PageActions actions={actions} />
    </ActionBarLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === "production") return { notFound: true };
  return { props: {} };
};
