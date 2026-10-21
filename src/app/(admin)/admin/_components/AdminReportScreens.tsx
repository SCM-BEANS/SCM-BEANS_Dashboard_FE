'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DoloresApiErrorState, DoloresEmptyState, DoloresLoadingState } from '@/app/_ui/dolores/DoloresApiState';
import {
  DoloresButton,
  DoloresField,
  DoloresFieldGrid,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresStatCard,
  DoloresTable,
} from '@/app/_ui/dolores/DoloresUI';
import { DoloresPage } from '@/app/_shell/dolores/DoloresShell';
import { useRouteView } from '@/app/(admin)/admin/_components/useRouteView';
import { useBillingInvoices } from '@/hooks/dolores/useBillingInvoices';
import { useDashboardOverview } from '@/hooks/dolores/useDashboardOverview';
import { describeDoloresError } from '@/hooks/dolores/queryPolicy';
import { PATH_ADMIN } from '@/routes/path';
import { buildRouteUrl, type AdminReportView } from '@/routes/query';

type DateRange = { fromDate: string; toDate: string };

function formatAmount(value: number | null | undefined): string {
  return value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
}

function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined
    ? 'Không có dữ liệu'
    : new Intl.NumberFormat('vi-VN').format(value);
}

function formatDate(value: string): string {
  const date = new Date(value + 'T00:00:00');
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(date);
}

function localToday(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function AdminReportScreens({ initialView = 'overview' }: { initialView?: AdminReportView }) {
  const [view, setView] = useRouteView<AdminReportView>(initialView);
  const [dateRange, setDateRange] = useState<DateRange>({ fromDate: '', toDate: '' });
  const [draftRange, setDraftRange] = useState<DateRange>({ fromDate: '', toDate: '' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const fromDateInputRef = useRef<HTMLInputElement>(null);
  const overview = useDashboardOverview(dateRange.fromDate || undefined, dateRange.toDate || undefined);
  const invoices = useBillingInvoices(view === 'customers');
  const metrics = overview.data?.operationalMetrics;
  const rentalInvoices = (invoices.data ?? []).filter((invoice) => invoice.type === 'RENTAL');
  const periodLabel = overview.data?.usagePeriodStart && overview.data?.usagePeriodEnd
    ? `${formatDate(overview.data.usagePeriodStart)} – ${formatDate(overview.data.usagePeriodEnd)}`
    : 'Kỳ dữ liệu do API trả về';

  useEffect(() => {
    setFilterOpen(false);
    setFilterError(null);
  }, [initialView]);

  useEffect(() => {
    const dialog = filterDialogRef.current;
    if (!dialog) return;
    if (filterOpen && !dialog.open) {
      dialog.showModal();
      fromDateInputRef.current?.focus();
    } else if (!filterOpen && dialog.open) {
      dialog.close();
    }
  }, [filterOpen]);

  function openFilter() {
    setDraftRange(dateRange);
    setFilterError(null);
    setFilterOpen(true);
  }

  function applyDateRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { fromDate, toDate } = draftRange;
    if (!fromDate && !toDate) {
      setDateRange({ fromDate: '', toDate: '' });
      setFilterError(null);
      setFilterOpen(false);
      return;
    }
    if (!fromDate || !toDate) {
      setFilterError('Chọn cả ngày bắt đầu và ngày kết thúc.');
      return;
    }
    const start = Date.parse(fromDate + 'T00:00:00Z');
    const end = Date.parse(toDate + 'T00:00:00Z');
    const days = Math.floor((end - start) / 86400000) + 1;
    if (end < start) {
      setFilterError('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
      return;
    }
    if (days > 90) {
      setFilterError('API chỉ hỗ trợ tối đa 90 ngày trong một lần xem.');
      return;
    }
    if (toDate > localToday()) {
      setFilterError('Ngày kết thúc không được ở tương lai.');
      return;
    }
    setDateRange({ fromDate, toDate });
    setFilterError(null);
    setFilterOpen(false);
  }

  function resetToDefaultPeriod() {
    setDateRange({ fromDate: '', toDate: '' });
    setDraftRange({ fromDate: '', toDate: '' });
    setFilterError(null);
    setFilterOpen(false);
  }

  function refreshAll() {
    void overview.refetch();
    if (view === 'customers') void invoices.refetch();
  }

  const financialMetrics = overview.data?.financialMetrics ?? [];
  const financialCards = financialMetrics.flatMap((metric) => [
    { label: `Đã phát hành · ${metric.currency ?? 'Chưa rõ currency'}`, value: `${formatAmount(metric.amountIssued)}${metric.currency ? ` ${metric.currency}` : ''}` },
    { label: `Đã thu · ${metric.currency ?? 'Chưa rõ currency'}`, value: `${formatAmount(metric.amountCollected)}${metric.currency ? ` ${metric.currency}` : ''}` },
    { label: `Còn phải thu · ${metric.currency ?? 'Chưa rõ currency'}`, value: `${formatAmount(metric.outstandingBalance)}${metric.currency ? ` ${metric.currency}` : ''}` },
    { label: `Nợ quá hạn · ${metric.currency ?? 'Chưa rõ currency'}`, value: `${formatAmount(metric.overdueBalance)}${metric.currency ? ` ${metric.currency}` : ''}` },
  ]);

  if (view === 'customers') {
    const invoiceRows = rentalInvoices.map((invoice) => [
      invoice.id.slice(0, 8),
      invoice.tenantId ? invoice.tenantId.slice(0, 8) : '—',
      invoice.contractId ? invoice.contractId.slice(0, 8) : '—',
      invoice.period,
      `${formatAmount(invoice.amount)} ${invoice.currency}`,
      invoice.status,
    ]);

    return (
      <DoloresPage
        title="Hóa đơn rental"
        description="Danh sách hóa đơn rental do API Dolores trả về trong phạm vi tài khoản."
        actions={<>
          <DoloresButton onClick={() => setView('overview')}>Về báo cáo tổng quan</DoloresButton>
          <DoloresButton variant="secondary" onClick={refreshAll} disabled={overview.isFetching || invoices.isFetching}>Tải lại</DoloresButton>
        </>}
      >
        <DoloresPanel>
          <DoloresPanelTitle>Toàn bộ hóa đơn rental</DoloresPanelTitle>
          {invoices.isPending && !invoices.data && <DoloresLoadingState />}
          {invoices.isError && <DoloresApiErrorState error={invoices.error} onRetry={() => void invoices.refetch()} />}
          {invoices.data && rentalInvoices.length === 0 && <DoloresEmptyState message="API chưa trả về hóa đơn rental nào." />}
          {invoices.data && rentalInvoices.length > 0 && <DoloresTable
            headers={['Hóa đơn', 'Tenant', 'Hợp đồng', 'Kỳ', 'Số tiền', 'Trạng thái']}
            rows={invoiceRows}
          />}
          {invoices.data && <p className="mt-3 text-xs text-[#706561]">{rentalInvoices.length} hóa đơn rental trong phản hồi đầy đủ của API.</p>}
        </DoloresPanel>
        <DoloresNotice title="Phạm vi và tính đầy đủ">
          API trả về toàn bộ collection hóa đơn cho operator, không có tham số trang hoặc bộ lọc. Trang chỉ hiển thị invoice type RENTAL; các số tổng hợp tài chính lấy từ dashboard API, không được tính lại từ số tiền invoice.
        </DoloresNotice>
      </DoloresPage>
    );
  }

  return (
    <>
      <DoloresPage
        title="Báo cáo doanh thu & vận hành"
        description="Số liệu lấy từ dashboard aggregate của Dolores; kỳ usage tối đa 90 ngày."
        actions={<>
          <DoloresButton onClick={() => setView('customers')}>Hóa đơn rental</DoloresButton>
          <DoloresButton href={PATH_ADMIN.contracts} variant="secondary">Hợp đồng & lịch sử</DoloresButton>
          <DoloresButton href={PATH_ADMIN.iot} variant="secondary">Giám sát IoT</DoloresButton>
          <DoloresButton onClick={openFilter} variant="secondary">Lọc kỳ báo cáo</DoloresButton>
          <DoloresButton onClick={refreshAll} variant="secondary" disabled={overview.isFetching}>Tải lại</DoloresButton>
        </>}
      >
        {overview.isPending && !overview.data && <DoloresLoadingState />}
        {overview.isError && <DoloresApiErrorState error={overview.error} onRetry={() => void overview.refetch()} />}
        {overview.data && <>
          <DoloresNotice title={`Phạm vi ${overview.data.scope} · ${periodLabel}`}>
            Mặc định API trả usage 7 ngày gần nhất. Ngày bắt đầu và kết thúc đã chọn chỉ lọc dashboard aggregates; danh sách invoice hiển thị toàn bộ tại màn hóa đơn.
          </DoloresNotice>

          <DoloresPanel>
            <DoloresPanelTitle>Tổng hợp tài chính theo currency</DoloresPanelTitle>
            {financialCards.length > 0
              ? <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{financialCards.map((card) => <DoloresStatCard key={card.label} label={card.label} value={card.value} />)}</div>
              : <DoloresNotice title="Số liệu tài chính không khả dụng">Dashboard không trả financial metrics cho scope hiện tại.</DoloresNotice>}
            <p className="mt-3 text-xs text-[#706561]">Các totals lấy từ rental billing aggregate của backend; khoản phải thu và quá hạn bao gồm payment/adjustment rules của máy chủ.</p>
          </DoloresPanel>
          <DoloresNotice title="Chỉ số không có trong API hiện tại">
            Không có chuỗi doanh thu theo tháng hoặc báo cáo tiêu hao và hao hụt supply. Trang không suy diễn các số liệu này từ hóa đơn.
          </DoloresNotice>

          {metrics && <>
            <DoloresPanel>
              <DoloresPanelTitle>Chỉ số vận hành</DoloresPanelTitle>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                <DoloresStatCard label="Tenant toàn hệ thống" value={formatCount(metrics.totalTenants)} />
                <DoloresStatCard label="Hợp đồng sắp hết hạn · 30 ngày" value={formatCount(metrics.expiringContractsWithin30Days)} />
                <DoloresStatCard label="Ly được ghi nhận trong kỳ" value={formatCount(metrics.cupsInSelectedPeriod)} />
                <DoloresStatCard label="Ticket bảo trì đang mở" value={formatCount(metrics.openMaintenanceTickets)} />
                <DoloresStatCard label="Công việc lắp đặt đang mở" value={formatCount(metrics.openInstallationWorkOrders)} />
                <DoloresStatCard label="Công việc lắp đặt quá hạn" value={formatCount(metrics.overdueInstallationWorkOrders)} />
              </div>
            </DoloresPanel>

            <DoloresPanel>
              <DoloresPanelTitle>Số ly được chấp nhận theo ngày</DoloresPanelTitle>
              {!metrics.dailyAcceptedCupUsage || metrics.dailyAcceptedCupUsage.length === 0
                ? <DoloresEmptyState message="Dữ liệu ly theo ngày không khả dụng trong phản hồi này." />
                : <DoloresTable
                  headers={['Ngày', 'Số ly']}
                  rows={metrics.dailyAcceptedCupUsage.map((item) => [item.date ? formatDate(item.date) : '—', String(item.cups ?? '—')])}
                />}
            </DoloresPanel>

            {metrics.contractsByStatus ? <DoloresPanel>
              <DoloresPanelTitle>Hợp đồng theo trạng thái</DoloresPanelTitle>
              <DoloresTable
                headers={['Trạng thái', 'Số hợp đồng']}
                rows={Object.entries(metrics.contractsByStatus).map(([status, count]) => [status, String(count)])}
                emptyMessage="Không có số liệu hợp đồng trong phản hồi."
              />
            </DoloresPanel> : <DoloresNotice title="Trạng thái hợp đồng không khả dụng">Dashboard không trả số liệu hợp đồng theo trạng thái.</DoloresNotice>}

            {metrics.machinesByTypeAndStatus ? <DoloresPanel>
              <DoloresPanelTitle>Máy theo loại và trạng thái</DoloresPanelTitle>
              <DoloresTable
                headers={['Loại máy', 'Trạng thái', 'Số máy']}
                rows={Object.entries(metrics.machinesByTypeAndStatus).flatMap(([type, statuses]) =>
                  Object.entries(statuses).map(([status, count]) => [type, status, String(count)]))}
                emptyMessage="Không có số liệu máy trong phản hồi."
              />
            </DoloresPanel> : <DoloresNotice title="Số liệu máy không khả dụng">Dashboard không trả số liệu máy theo loại và trạng thái.</DoloresNotice>}
          </>}
        </>}
        {!overview.isPending && !overview.isError && !metrics && <DoloresEmptyState message="Dashboard không trả operational metrics cho scope hiện tại." />}
      </DoloresPage>

      <dialog
        ref={filterDialogRef}
        className="m-auto w-[calc(100%-3rem)] max-w-[580px] rounded-[20px] border-0 bg-white p-8 shadow-xl backdrop:bg-[#302927]/25"
        aria-labelledby="report-filter-title"
        aria-describedby="report-filter-description"
        onCancel={(event) => {
          event.preventDefault();
          setFilterError(null);
          setFilterOpen(false);
        }}
      >
        <h2 id="report-filter-title" className="text-xl font-semibold leading-7 text-[#302927]">Chọn kỳ dashboard</h2>
        <p id="report-filter-description" className="mt-3 text-[13px] leading-5 text-[#706561]">Chọn khoảng ngày tối đa 90 ngày. Để dùng kỳ mặc định 7 ngày của API, để trống cả hai ngày.</p>
        <form className="mt-5 space-y-4" onSubmit={applyDateRange}>
          <DoloresFieldGrid>
            <DoloresField label="Từ ngày" required><input ref={fromDateInputRef} aria-label="Từ ngày" className="w-full bg-transparent text-sm outline-none" type="date" value={draftRange.fromDate} onChange={(event) => setDraftRange({ ...draftRange, fromDate: event.target.value })} /></DoloresField>
            <DoloresField label="Đến ngày" required><input aria-label="Đến ngày" className="w-full bg-transparent text-sm outline-none" type="date" value={draftRange.toDate} onChange={(event) => setDraftRange({ ...draftRange, toDate: event.target.value })} /></DoloresField>
          </DoloresFieldGrid>
          {filterError && <div role="alert"><DoloresNotice title="Khoảng ngày chưa hợp lệ" tone="warning">{filterError}</DoloresNotice></div>}
          <div className="flex flex-wrap gap-3">
            <DoloresButton type="submit">Áp dụng</DoloresButton>
            <DoloresButton type="button" variant="secondary" onClick={resetToDefaultPeriod}>Dùng kỳ mặc định</DoloresButton>
            <DoloresButton type="button" variant="secondary" onClick={() => { setFilterError(null); setFilterOpen(false); }}>Đóng</DoloresButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
