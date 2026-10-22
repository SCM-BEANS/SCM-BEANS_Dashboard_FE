'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useBuybackCase } from '@/hooks/dolores/useBuybacks';
import {
  useBillingInvoice,
  useBillingInvoices,
  useDownloadPaymentProof,
  useInvoicePaymentProofs,
} from '@/hooks/dolores/useBillingInvoices';
import { useGlobalRecipe, useGlobalRecipes } from '@/hooks/dolores/useGlobalRecipes';
import { BuybackCaseIdSchema } from '@/schemas/dolores/buybacks';
import { InvoiceIdSchema } from '@/schemas/dolores/billing';
import { GlobalRecipeIdSchema } from '@/schemas/dolores/recipes';
import { DoloresPage } from '@/app/_shell/dolores/DoloresShell';
import {
  DoloresButton,
  DoloresField,
  DoloresFieldGrid,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresTable,
} from '@/app/_ui/dolores/DoloresUI';
import { PATH_MODERATOR } from '@/routes/path';
import type { GlobalRecipe } from '@/types/dolores/recipes';
import type { Invoice, PaymentProof } from '@/types/dolores/billing';

type ReadQuery<T> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
};

type Row = ReactNode[];

function normalizePath(path: string) {
  if (path === PATH_MODERATOR.root || path.startsWith(`${PATH_MODERATOR.root}/`)) return path;
  return path ? `${PATH_MODERATOR.root}/${path}` : PATH_MODERATOR.root;
}

function pathParameter(path: string, base: string) {
  const prefix = `${base}/`;
  if (!path.startsWith(prefix)) return null;
  const parameter = path.slice(prefix.length);
  return parameter && !parameter.includes('/') ? parameter : null;
}

function getReadErrorMessage(error: unknown, subject: string) {
  const status = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number'
    ? error.status
    : undefined;
  if (status === 401) return 'Dolores trả về 401: phiên đăng nhập hoặc token chưa được xác thực.';
  if (status === 403) return 'Dolores trả về 403: tài khoản Moderator chưa được cấp quyền đọc dữ liệu này.';
  if (status === 404) return `Dolores trả về 404: không tìm thấy ${subject} theo UUID này.`;
  if (status !== undefined) return `Dolores trả về lỗi HTTP ${status} khi đọc ${subject}.`;
  return `Không thể kết nối hoặc đọc ${subject} từ Dolores.`;
}

function ApiReadStatus<T>({ query, subject }: { query: ReadQuery<T>; subject: string }) {
  if (query.isPending && query.data === undefined) {
    return <div role="status" aria-live="polite"><DoloresNotice title={`Đang tải ${subject}`}>Đang lấy dữ liệu mới nhất từ Dolores.</DoloresNotice></div>;
  }
  if (query.isError) {
    return <div role="alert" aria-live="assertive">
      <DoloresNotice title={query.data === undefined ? `Không thể tải ${subject}` : `Không thể cập nhật ${subject}`}>
        <p>{getReadErrorMessage(query.error, subject)}</p>
        <DoloresButton variant="secondary" onClick={() => { void query.refetch(); }}>Thử lại</DoloresButton>
      </DoloresNotice>
    </div>;
  }
  if (query.isFetching && query.data !== undefined) {
    return <div role="status" aria-live="polite"><DoloresNotice title={`Đang cập nhật ${subject}`}>Đang tải dữ liệu mới từ Dolores.</DoloresNotice></div>;
  }
  return null;
}

function formatApiDate(value: string | null | undefined) {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/.exec(value);
  if (!match) return value;
  const [, year, month, day, time] = match;
  return `${day}/${month}/${year}${time ? ` ${time}` : ''}`;
}

function formatMoney(amount: number | null | undefined, currency: string) {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount);
  } catch {
    return `${new Intl.NumberFormat('vi-VN').format(amount)} ${currency}`;
  }
}

function ReadOnlyUnavailable({ title, description, returnHref, returnLabel = 'Về danh sách' }: {
  title: string;
  description: string;
  returnHref: string;
  returnLabel?: string;
}) {
  return <DoloresPage title={title} description={description} actions={<DoloresButton href={returnHref} variant="secondary">{returnLabel}</DoloresButton>}>
    <DoloresNotice title="Chức năng đọc chưa khả dụng">{description}</DoloresNotice>
  </DoloresPage>;
}

function InvoiceListScreen() {
  const query = useBillingInvoices();
  const rows: Row[] = (query.data ?? []).map((invoice: Invoice) => [
    <Link href={PATH_MODERATOR.invoiceDetail(invoice.id)} key={invoice.id}>{invoice.id}</Link>,
    invoice.period,
    invoice.type,
    formatMoney(invoice.amount, invoice.currency),
    formatApiDate(invoice.dueDate),
    invoice.status,
    <Link href={PATH_MODERATOR.invoiceDetail(invoice.id)} key={`${invoice.id}-detail`}>Chi tiết ›</Link>,
  ]);

  return <DoloresPage title="Hóa đơn" description="Danh sách hóa đơn và các trường tài chính do Dolores trả về." actions={<DoloresButton variant="secondary" onClick={() => { void query.refetch(); }}>Làm mới</DoloresButton>}>
    <ApiReadStatus query={query} subject="danh sách hóa đơn" />
    {query.data !== undefined && query.data.length === 0 && !query.isError && <DoloresNotice title="Không có hóa đơn">Dolores hiện không trả về hóa đơn nào.</DoloresNotice>}
    {query.data !== undefined && query.data.length > 0 && <DoloresPanel>
      <DoloresPanelTitle>Hóa đơn từ Dolores</DoloresPanelTitle>
      <DoloresTable headers={['ID hóa đơn', 'Kỳ', 'Loại', 'Số tiền', 'Hạn thanh toán', 'Trạng thái', 'Xem']} rows={rows} />
    </DoloresPanel>}
  </DoloresPage>;
}

function InvoiceProofs({ invoiceId }: { invoiceId: string }) {
  const query = useInvoicePaymentProofs(invoiceId);
  const download = useDownloadPaymentProof();
  const rows: Row[] = (query.data ?? []).map((proof: PaymentProof) => [
    proof.originalFilename,
    proof.status,
    formatApiDate(proof.submittedAt),
    `${new Intl.NumberFormat('vi-VN').format(proof.sizeBytes)} B`,
    <DoloresButton
      key={proof.id}
      variant="secondary"
      disabled={download.isPending}
      onClick={() => download.mutate({ proofId: proof.id, filename: proof.originalFilename })}
    >Tải chứng từ</DoloresButton>,
  ]);

  return <DoloresPanel>
    <DoloresPanelTitle>Chứng từ thanh toán</DoloresPanelTitle>
    <ApiReadStatus query={query} subject="chứng từ thanh toán" />
    {download.isError && <div role="alert"><DoloresNotice title="Không thể tải chứng từ">{getReadErrorMessage(download.error, 'chứng từ')}</DoloresNotice></div>}
    {query.data !== undefined && query.data.length === 0 && !query.isError && <DoloresNotice title="Chưa có chứng từ">Dolores chưa trả về chứng từ cho hóa đơn này.</DoloresNotice>}
    {query.data !== undefined && query.data.length > 0 && <DoloresTable headers={['Tệp', 'Trạng thái', 'Ngày gửi', 'Kích thước', 'Nội dung']} rows={rows} />}
  </DoloresPanel>;
}

function InvoiceDetailScreen({ invoiceId }: { invoiceId: string }) {
  const query = useBillingInvoice(invoiceId);
  const invoice = query.data;

  return <DoloresPage title="Chi tiết hóa đơn" description="Thông tin lấy từ hồ sơ hóa đơn Dolores theo UUID." actions={<DoloresButton href={PATH_MODERATOR.invoices} variant="secondary">Danh sách hóa đơn</DoloresButton>}>
    <ApiReadStatus query={query} subject="hóa đơn" />
    {invoice && <DoloresPanel>
      <DoloresPanelTitle>{invoice.id}</DoloresPanelTitle>
      <DoloresFieldGrid>
        <DoloresField label="Kỳ" value={invoice.period} />
        <DoloresField label="Loại" value={invoice.type} />
        <DoloresField label="Số tiền" value={formatMoney(invoice.amount, invoice.currency)} />
        <DoloresField label="Trạng thái" value={invoice.status} />
        <DoloresField label="Hạn thanh toán" value={formatApiDate(invoice.dueDate)} />
        <DoloresField label="Bắt đầu kỳ" value={formatApiDate(invoice.billingPeriodStart)} />
        <DoloresField label="Kết thúc kỳ" value={formatApiDate(invoice.billingPeriodEnd)} />
        <DoloresField label="Đã thanh toán lúc" value={formatApiDate(invoice.paidAt)} />
        <DoloresField label="Tenant UUID" value={invoice.tenantId ?? '—'} />
        <DoloresField label="Contract UUID" value={invoice.contractId ?? '—'} />
      </DoloresFieldGrid>
    </DoloresPanel>}
    <InvoiceProofs invoiceId={invoiceId} />
  </DoloresPage>;
}

export function ModeratorInvoicesScreen({ path }: { path: string }) {
  const route = normalizePath(path);
  if (route === PATH_MODERATOR.invoices || route === PATH_MODERATOR.invoicesList) return <InvoiceListScreen />;
  if (route === PATH_MODERATOR.invoiceReconcile) {
    return <ReadOnlyUnavailable title="Chọn hóa đơn để đối chiếu" description="Mở một hóa đơn từ danh sách để xem chi tiết và chứng từ. Không có dữ liệu hóa đơn mẫu được hiển thị." returnHref={PATH_MODERATOR.invoices} />;
  }

  const rawId = pathParameter(route, PATH_MODERATOR.invoices);
  const invoiceId = rawId && InvoiceIdSchema.safeParse(rawId).success ? rawId : null;
  if (invoiceId) return <InvoiceDetailScreen invoiceId={invoiceId} />;
  return <ReadOnlyUnavailable title="Màn hình hóa đơn chưa được nối" description="Chỉ danh sách, chi tiết theo UUID và chứng từ đọc từ Dolores được hỗ trợ trong phần này." returnHref={PATH_MODERATOR.invoices} />;
}

function RecipeListScreen() {
  const query = useGlobalRecipes();
  const rows: Row[] = (query.data ?? []).map((recipe: GlobalRecipe) => [
    recipe.name,
    recipe.steps.join(' · ') || '—',
    recipe.dosageBounds.join(' · ') || '—',
    <Link href={PATH_MODERATOR.menuRecipeDetail(recipe.id)} key={recipe.id}>Chi tiết ›</Link>,
  ]);

  return <DoloresPage title="Công thức Global" description="Tên, bước pha và giới hạn định lượng lấy từ Dolores." actions={<DoloresButton variant="secondary" onClick={() => { void query.refetch(); }}>Làm mới</DoloresButton>}>
    <ApiReadStatus query={query} subject="danh sách công thức" />
    {query.data !== undefined && query.data.length === 0 && !query.isError && <DoloresNotice title="Chưa có công thức">Dolores hiện không trả về công thức Global nào.</DoloresNotice>}
    {query.data !== undefined && query.data.length > 0 && <DoloresPanel>
      <DoloresPanelTitle>Công thức từ Dolores</DoloresPanelTitle>
      <DoloresTable headers={['Tên', 'Các bước', 'Giới hạn định lượng', 'Xem']} rows={rows} />
    </DoloresPanel>}
  </DoloresPage>;
}

function RecipeDetailScreen({ recipeId }: { recipeId: string }) {
  const query = useGlobalRecipe(recipeId);
  const recipe = query.data;
  return <DoloresPage title="Chi tiết công thức Global" description="Các trường dưới đây do Dolores trả về." actions={<DoloresButton href={PATH_MODERATOR.menu} variant="secondary">Danh sách công thức</DoloresButton>}>
    <ApiReadStatus query={query} subject="công thức" />
    {recipe && <DoloresPanel>
      <DoloresPanelTitle>{recipe.name}</DoloresPanelTitle>
      <DoloresFieldGrid>
        <DoloresField label="UUID" value={recipe.id} />
        <DoloresField label="Giới hạn định lượng" value={recipe.dosageBounds.join(' · ') || '—'} />
      </DoloresFieldGrid>
      <div className="mt-6">
        <h3 className="text-sm font-semibold">Các bước pha</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-5">{recipe.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol>
      </div>
    </DoloresPanel>}
  </DoloresPage>;
}

export function ModeratorRecipesScreen({ path }: { path: string }) {
  const route = normalizePath(path);
  if (route === PATH_MODERATOR.menu || route === PATH_MODERATOR.menuItems) return <RecipeListScreen />;

  const rawId = pathParameter(route, PATH_MODERATOR.menu);
  const recipeId = rawId && GlobalRecipeIdSchema.safeParse(rawId).success ? rawId : null;
  if (recipeId) return <RecipeDetailScreen recipeId={recipeId} />;
  return <ReadOnlyUnavailable title="Màn hình công thức chưa khả dụng" description="Backend chỉ cung cấp đọc danh sách và chi tiết công thức Global. Chỉnh sửa, thành phần riêng, gửi menu và các ID mẫu chưa được nối." returnHref={PATH_MODERATOR.menu} />;
}

function BuybackDetailScreen({ caseId }: { caseId: string }) {
  const query = useBuybackCase(caseId);
  const buybackCase = query.data;

  return <DoloresPage title="Chi tiết thu mua máy cũ" description="Hồ sơ đọc từ Dolores theo UUID." actions={<DoloresButton href={PATH_MODERATOR.buyback} variant="secondary">Về danh sách thu mua</DoloresButton>}>
    <ApiReadStatus query={query} subject="hồ sơ thu mua" />
    {buybackCase && <DoloresPanel>
      <DoloresPanelTitle>{buybackCase.id}</DoloresPanelTitle>
      <DoloresFieldGrid>
        <DoloresField label="Trạng thái" value={buybackCase.status} />
        <DoloresField label="Giá đề nghị" value={formatMoney(buybackCase.requestedPrice, buybackCase.currency)} />
        <DoloresField label="Giá được duyệt" value={formatMoney(buybackCase.approvedPrice, buybackCase.currency)} />
        <DoloresField label="Lý do" value={buybackCase.reason} />
        <DoloresField label="Tenant UUID" value={buybackCase.tenantId} />
        <DoloresField label="Contract UUID" value={buybackCase.contractId} />
        <DoloresField label="Machine UUID" value={buybackCase.machineId} />
        <DoloresField label="Ngày đề nghị" value={formatApiDate(buybackCase.requestedAt)} />
        <DoloresField label="Mã thỏa thuận ngoài hệ thống" value={buybackCase.externalAgreementReference ?? '—'} />
        <DoloresField label="Bằng chứng thu gom" value={buybackCase.collectionEvidence ?? '—'} />
      </DoloresFieldGrid>
    </DoloresPanel>}
  </DoloresPage>;
}

export function ModeratorBuybackScreen({ path }: { path: string }) {
  const route = normalizePath(path);
  if (route === PATH_MODERATOR.buyback || route === PATH_MODERATOR.buybackList) {
    return <ReadOnlyUnavailable title="Danh sách thu mua máy cũ chưa khả dụng" description="Dolores hiện chỉ có API đọc một hồ sơ thu mua theo UUID; backend chưa có API danh sách. Không hiển thị hồ sơ demo." returnHref={PATH_MODERATOR.root} returnLabel="Về tổng quan" />;
  }

  const rawId = pathParameter(route, PATH_MODERATOR.buyback);
  const caseId = rawId && BuybackCaseIdSchema.safeParse(rawId).success ? rawId : null;
  if (caseId) return <BuybackDetailScreen caseId={caseId} />;
  return <ReadOnlyUnavailable title="ID hồ sơ thu mua không khả dụng" description="Chỉ UUID chuẩn mới được gửi đến API chi tiết buyback. ID mẫu cũ không được tra cứu." returnHref={PATH_MODERATOR.buyback} />;
}
