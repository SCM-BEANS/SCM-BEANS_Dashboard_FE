import { useEffect, useRef, useState, type FormEvent } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/apis/billing.api";
import { contractsApi } from "@/apis/contracts.api";
import { dashboardApi } from "@/apis/dashboard.api";
import { machinesApi } from "@/apis/machines.api";
import { profilesApi } from "@/apis/profiles.api";
import { recipesApi } from "@/apis/recipes.api";
import { getAccessTokenSubject } from "@/lib/auth-role";
import { InvoiceIdSchema } from "@/schema/billing.schema";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { MachineIdSchema } from "@/schema/machines.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { GlobalRecipeIdSchema } from "@/schema/recipes.schema";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ActionBarActions, type ActionBarAction } from "@/components/action-bar/action-bar-actions";
import styles from "./customer-shell.module.css";

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

type Availability = "unavailable" | "pending";

export interface CustomerScreenDescriptor {
  title: string;
  description: string;
  availability: Availability;
  actions: ActionBarAction[];
}

const messages = CUSTOMER_MESSAGES.READ_SCREENS;
const phaseThreeSections = new Set([
  "contracts/new",
  "contracts/end-early",
  "invoices/payment",
  "invoices/shortfall",
  "invoices/refund",
  "invoices/reminder",
  "invoices/standard-payment",
  "menu/espresso",
  "menu/fresh-milk",
  "menu/add-dish",
  "menu/sent",
  "menu/applied",
]);

function descriptor(
  title: string,
  description: string,
  availability: Availability = "unavailable",
  actions: ActionBarAction[] = [],
): CustomerScreenDescriptor {
  return { title, description, availability, actions };
}

const link = (label: string, href: string, variant: "primary" | "secondary" = "primary"): ActionBarAction => ({
  label,
  href,
  variant,
});

const blocked = (label: string, variant: "primary" | "secondary" = "primary"): ActionBarAction => ({
  label,
  variant,
  disabled: true,
  describedBy: "customer-read-reason",
});

function getCustomerReadActions(sectionPath: string): ActionBarAction[] {
  if (!sectionPath) {
    return [
      link("Xem máy của tôi", "/dashboard/machines"),
      link("Xem hóa đơn", "/dashboard/invoices", "secondary"),
    ];
  }

  if (sectionPath === "contracts") return [link("Trao đổi hợp đồng mới", "/dashboard/contracts/new")];
  if (sectionPath === "contracts/expiry") {
    return [link("Trao đổi hợp đồng mới", "/dashboard/contracts/new"), blocked("Không tiếp tục thuê", "secondary")];
  }
  if (sectionPath === "contracts/end") {
    return [link("Xem hoàn cọc đã thực hiện", "/dashboard/contracts/deposit-complete"), link("Xem hợp đồng", "/dashboard/contracts", "secondary")];
  }
  if (sectionPath === "contracts/deposit-complete") {
    return [link("Xem quyết toán", "/dashboard/contracts/end"), link("Về hợp đồng", "/dashboard/contracts", "secondary")];
  }
  if (sectionPath.startsWith("contracts/")) {
    return [
      link("Xem hợp đồng", "/dashboard/contracts"),
      link("Đề nghị kết thúc sớm", "/dashboard/contracts/end-early", "secondary"),
      link("Trao đổi hợp đồng mới", "/dashboard/contracts/new", "secondary"),
      link("Theo dõi hoàn cọc", "/dashboard/contracts/end", "secondary"),
    ];
  }

  if (sectionPath === "machines") {
    return [link("Xem lịch sử bảo trì", "/dashboard/machines/history"), link("Xem hợp đồng", "/dashboard/contracts", "secondary")];
  }
  if (sectionPath === "machines/history") {
    return [link("Gửi yêu cầu hỗ trợ", "/dashboard/support/new"), link("Về máy của tôi", "/dashboard/machines", "secondary")];
  }
  if (sectionPath === "machines/substitute") {
    return [link("Về máy của tôi", "/dashboard/machines"), link("Xem lịch sử máy", "/dashboard/machines/history", "secondary")];
  }
  if (sectionPath.endsWith("/model")) {
    return [link("Về danh sách máy", "/dashboard/machines"), link("Xem menu", "/dashboard/menu", "secondary")];
  }
  if (sectionPath.startsWith("machines/")) {
    return [link("Xem lịch sử bảo trì", "/dashboard/machines/history"), link("Về máy của tôi", "/dashboard/machines", "secondary")];
  }

  if (sectionPath === "invoices") {
    return [
      link("Gửi chứng từ chuyển khoản", "/dashboard/invoices/payment"),
      blocked("Xem hóa đơn chi tiết", "secondary"),
      link("Nhắc thanh toán", "/dashboard/invoices/reminder", "secondary"),
    ];
  }
  if (sectionPath === "invoices/standard") {
    return [link("Gửi chứng từ bổ sung", "/dashboard/invoices/standard-payment"), link("Về hóa đơn", "/dashboard/invoices", "secondary")];
  }
  if (sectionPath.startsWith("invoices/")) {
    return [link("Gửi chứng từ bổ sung", "/dashboard/invoices/payment"), link("Xem khoản còn thiếu", "/dashboard/invoices/shortfall", "secondary"), link("Xem hoàn tiền thừa", "/dashboard/invoices/refund", "secondary")];
  }

  if (sectionPath === "menu") {
    return [
      link("Thêm món riêng", "/dashboard/menu/add-dish"),
      link("Chỉnh Espresso", "/dashboard/menu/espresso", "secondary"),
      link("Chỉnh cà phê sữa tươi", "/dashboard/menu/fresh-milk", "secondary"),
      link("Về máy của tôi", "/dashboard/machines", "secondary"),
    ];
  }
  if (sectionPath.startsWith("menu/")) {
    return [link("Về menu của tôi", "/dashboard/menu"), link("Thêm món riêng", "/dashboard/menu/add-dish", "secondary")];
  }

  return [link("Về tổng quan", "/dashboard")];
}

export function getCustomerScreenDescriptor(sectionPath: string): CustomerScreenDescriptor {
  if (!sectionPath) {
    return descriptor(messages.OVERVIEW_TITLE, messages.OVERVIEW_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  if (phaseThreeSections.has(sectionPath)) {
    return descriptor(
      CUSTOMER_MESSAGES.ROUTES.PENDING_TITLE,
      CUSTOMER_MESSAGES.ROUTES.PAGE_DESCRIPTION,
      "pending",
      getCustomerReadActions(sectionPath),
    );
  }

  if (sectionPath === "contracts") {
    return descriptor(messages.CONTRACTS_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "contracts/expiry") {
    return descriptor(messages.CONTRACT_EXPIRY_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "contracts/end") {
    return descriptor(messages.CONTRACT_END_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "contracts/deposit-complete") {
    return descriptor(messages.DEPOSIT_COMPLETE_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.split("/").length === 2 && sectionPath.startsWith("contracts/")) {
    return descriptor(messages.CONTRACT_DETAIL_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  if (sectionPath === "machines") {
    return descriptor(messages.MACHINES_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "machines/history") {
    return descriptor(messages.MACHINE_HISTORY_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "machines/substitute") {
    return descriptor(messages.MACHINE_SUBSTITUTE_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.startsWith("machines/") && sectionPath.endsWith("/model")) {
    return descriptor(messages.MACHINE_MODEL_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.startsWith("machines/")) {
    return descriptor(messages.MACHINE_DETAIL_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  if (sectionPath === "invoices") {
    return descriptor(messages.INVOICES_TITLE, messages.INVOICES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "invoices/standard") {
    return descriptor(messages.STANDARD_INVOICE_TITLE, messages.INVOICES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (/^invoices\/\d{4}-\d{2}$/.test(sectionPath)) {
    return descriptor(messages.INVOICE_PERIOD_TITLE, messages.INVOICES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.split("/").length === 2 && sectionPath.startsWith("invoices/")) {
    return descriptor(messages.INVOICE_DETAIL_TITLE, messages.INVOICES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  if (sectionPath === "menu") {
    return descriptor(messages.MENU_TITLE, messages.MENU_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.split("/").length === 2 && sectionPath.startsWith("menu/")) {
    return descriptor(messages.RECIPE_DETAIL_TITLE, messages.MENU_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  return descriptor(
    CUSTOMER_MESSAGES.ROUTES.PENDING_TITLE,
    CUSTOMER_MESSAGES.ROUTES.PAGE_DESCRIPTION,
    "pending",
    getCustomerReadActions(sectionPath),
  );
}

function useOwnerSubject() {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = Cookies.get("access_token");
    const subject = token ? getAccessTokenSubject(token) : null;
    setOwnerId(ProfileIdSchema.safeParse(subject).success ? subject : null);
    setChecked(true);
  }, []);

  return { ownerId, checked };
}

function QueryFeedback({
  loading,
  failed,
  empty,
  emptyText,
}: {
  loading: boolean;
  failed: boolean;
  empty: boolean;
  emptyText: string;
}) {
  if (loading) {
    return <div className={styles.loadingNotice} role="status">{messages.LOADING}</div>;
  }
  if (failed) {
    return <div className={styles.errorNotice} role="alert">{messages.LOAD_ERROR}</div>;
  }
  if (empty) {
    return <div className={styles.emptyNotice} role="status">{emptyText}</div>;
  }
  return null;
}

function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd>{value === null || value === undefined || value === "" ? "—" : value}</dd>
    </div>
  );
}

function statusLabel(status: string | null | undefined) {
  return status ? status.toLowerCase().replaceAll("_", " ") : "—";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

function formatMoney(value: number | null | undefined, currency = "VND") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return value.toLocaleString("vi-VN") + " " + currency;
  }
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className={styles.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function OverviewScreen() {
  const query = useQuery({
    queryKey: ["owner-dashboard-overview"],
    queryFn: ({ signal }) => dashboardApi.getOverview(signal),
  });
  const overview = query.data;
  const operations = overview?.operationalMetrics;
  const finances = overview?.financialMetrics ?? [];
  const metrics = [
    { label: messages.OVERVIEW_CONTRACTS, value: operations?.contractsByStatus ? Object.values(operations.contractsByStatus).reduce((a, b) => a + b, 0) : null },
    { label: messages.OVERVIEW_MACHINES, value: operations?.machinesByTypeAndStatus ? Object.values(operations.machinesByTypeAndStatus).reduce((sum, statuses) => sum + Object.values(statuses).reduce((a, b) => a + b, 0), 0) : null },
    { label: messages.OVERVIEW_CUPS, value: operations?.cupsInSelectedPeriod ?? null },
    { label: messages.OVERVIEW_OPEN_REPAIRS, value: operations?.openMaintenanceTickets ?? null },
  ];

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-screen-title">{messages.OVERVIEW_TITLE}</h1>
        <p>{messages.OVERVIEW_DESCRIPTION}</p>
      </header>
      {query.isPending || query.isError ? (
        <QueryFeedback loading={query.isPending} failed={query.isError} empty={false} emptyText="" />
      ) : (
        <>
          <div className={styles.metricGrid}>
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value === null ? "—" : metric.value.toLocaleString("vi-VN")}
              />
            ))}
          </div>
          {finances.length ? (
            <section className={styles.dataPanel} aria-labelledby="owner-financial-summary">
              <h2 id="owner-financial-summary">{messages.OVERVIEW_FINANCIAL}</h2>
              <div className={styles.metricGrid}>
                {finances.map((finance, index) => (
                  <MetricCard
                    key={finance.currency ?? String(index)}
                    label={finance.currency ?? "VND"}
                    value={formatMoney(finance.outstandingBalance, finance.currency ?? "VND")}
                  />
                ))}
              </div>
            </section>
          ) : null}
          <p className={styles.dataFootnote}>
            {messages.OVERVIEW_PERIOD}: {formatDate(overview?.usagePeriodStart)} – {formatDate(overview?.usagePeriodEnd)}
          </p>
        </>
      )}
    </section>
  );
}

function ContractsScreen({ sectionPath }: { sectionPath: string }) {
  const { ownerId, checked } = useOwnerSubject();
  const [page, setPage] = useState(0);
  const contractCandidate = sectionPath.startsWith("contracts/")
    ? sectionPath.slice("contracts/".length)
    : "";
  const contractId = ContractIdSchema.safeParse(contractCandidate).success ? contractCandidate : null;
  const isList = sectionPath === "contracts";
  const list = useQuery({
    queryKey: ["owner-contracts", ownerId, page],
    queryFn: ({ signal }) => profilesApi.getContracts(ownerId!, page, 20, signal),
    enabled: Boolean(ownerId && isList),
  });
  const detail = useQuery({
    queryKey: ["owner-contract", contractId],
    queryFn: ({ signal }) => contractsApi.getById(contractId!, signal),
    enabled: Boolean(contractId),
  });

  if (!checked && isList) {
    return (
      <section className={styles.pageContent} aria-labelledby="customer-screen-title">
        <header className={styles.pageHeading}><h1 id="customer-screen-title">{messages.CONTRACTS_TITLE}</h1></header>
        <div className={styles.loadingNotice} role="status">{messages.LOADING}</div>
      </section>
    );
  }
  if (!ownerId && isList) {
    return <UnavailableIdentity title={messages.CONTRACTS_TITLE} />;
  }

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-screen-title">{contractId ? messages.CONTRACT_DETAIL_TITLE : messages.CONTRACTS_TITLE}</h1>
        <p>{messages.CONTRACTS_DESCRIPTION}</p>
      </header>
      {contractId ? (
        <>
          <QueryFeedback loading={detail.isPending} failed={detail.isError} empty={!detail.data} emptyText={messages.NO_CONTRACTS} />
          {detail.data ? (
            <dl className={styles.detailGrid}>
              <DetailItem label={messages.FIELD_CONTRACT_ID} value={detail.data.id} />
              <DetailItem label={messages.FIELD_MACHINE_ID} value={detail.data.machineId} />
              <DetailItem label={messages.FIELD_STATUS} value={statusLabel(detail.data.status)} />
              <DetailItem label={messages.FIELD_START_DATE} value={formatDate(detail.data.startDate)} />
              <DetailItem label={messages.FIELD_END_DATE} value={formatDate(detail.data.endDate)} />
              <DetailItem label={messages.FIELD_MONTHLY_FEE} value={formatMoney(detail.data.monthlyRentalFee)} />
              <DetailItem label={messages.FIELD_DEPOSIT} value={formatMoney(detail.data.depositAmount)} />
            </dl>
          ) : null}
          <Link className={styles.secondaryLink} href={PATH_CUSTOMER.CONTRACTS}>{messages.BACK_TO_LIST}</Link>
        </>
      ) : (
        <>
          <QueryFeedback
            loading={list.isPending}
            failed={list.isError}
            empty={!list.data?.items.length}
            emptyText={messages.NO_CONTRACTS}
          />
          {list.data?.items.length ? (
            <>
              <div className={styles.recordList}>
                {list.data.items.map((contract, index) => {
                  const id = contract.contractId ?? contract.id;
                  return (
                    <article className={styles.recordCard} key={id ?? "contract-" + index}>
                      <div>
                        <h2>{messages.FIELD_CONTRACT_ID}: {id ?? "—"}</h2>
                        <p>{messages.FIELD_MACHINE_ID}: {contract.machineId ?? "—"}</p>
                        <p>{messages.FIELD_STATUS}: {statusLabel(contract.status)}</p>
                        <p>{formatDate(contract.startDate)} – {formatDate(contract.endDate)}</p>
                      </div>
                      {id ? <Link className={styles.secondaryLink} href={PATH_CUSTOMER.CONTRACT_DETAIL(id)}>{messages.VIEW_DETAILS}</Link> : null}
                    </article>
                  );
                })}
              </div>
              <div className={styles.pagination}>
                <button className={styles.secondaryButton} disabled={page <= 0 || list.isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))} type="button">
                  {messages.PREVIOUS}
                </button>
                <span>{messages.PAGE} {page + 1} / {Math.max(1, list.data.totalPages)}</span>
                <button className={styles.secondaryButton} disabled={page + 1 >= list.data.totalPages || list.isFetching} onClick={() => setPage((current) => current + 1)} type="button">
                  {messages.NEXT}
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

function UnavailableIdentity({ title }: { title: string }) {
  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <header className={styles.pageHeading}><h1 id="customer-screen-title">{title}</h1></header>
      <div className={styles.errorNotice} role="alert">{messages.IDENTITY_UNAVAILABLE}</div>
    </section>
  );
}

function MachinesScreen({ sectionPath }: { sectionPath: string }) {
  const candidate = sectionPath.startsWith("machines/") ? sectionPath.slice("machines/".length) : "";
  const machineId = MachineIdSchema.safeParse(candidate).success ? candidate : null;
  const isList = sectionPath === "machines";
  const list = useQuery({
    queryKey: ["owner-machines"],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: isList,
  });
  const detail = useQuery({
    queryKey: ["owner-machine", machineId],
    queryFn: ({ signal }) => machinesApi.getById(machineId!, signal),
    enabled: Boolean(machineId),
  });

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-screen-title">{machineId ? messages.MACHINE_DETAIL_TITLE : messages.MACHINES_TITLE}</h1>
        <p>{messages.MACHINES_DESCRIPTION}</p>
      </header>
      {machineId ? (
        <>
          <QueryFeedback loading={detail.isPending} failed={detail.isError} empty={!detail.data} emptyText={messages.NO_MACHINES} />
          {detail.data ? (
            <dl className={styles.detailGrid}>
              <DetailItem label={messages.FIELD_MACHINE_ID} value={detail.data.id} />
              <DetailItem label={messages.FIELD_SERIAL} value={detail.data.serialNumber} />
              <DetailItem label={messages.FIELD_STATUS} value={statusLabel(detail.data.status)} />
              <DetailItem label={messages.FIELD_MACHINE_TYPE} value={detail.data.machineType} />
              <DetailItem label={messages.FIELD_REGION} value={detail.data.region} />
              <DetailItem label={messages.FIELD_DEPLOYED_AT} value={formatDate(detail.data.deployedAt)} />
              <DetailItem label={messages.FIELD_CONTRACT_END} value={formatDate(detail.data.contractEndDate)} />
              <DetailItem label={messages.FIELD_NEXT_MAINTENANCE} value={formatDate(detail.data.nextPreventiveMaintenanceAt)} />
            </dl>
          ) : null}
          <Link className={styles.secondaryLink} href={PATH_CUSTOMER.MACHINES}>{messages.BACK_TO_LIST}</Link>
        </>
      ) : (
        <>
          <QueryFeedback loading={list.isPending} failed={list.isError} empty={!list.data?.length} emptyText={messages.NO_MACHINES} />
          {list.data?.length ? (
            <div className={styles.recordList}>
              {list.data.map((machine) => (
                <article className={styles.recordCard} key={machine.id}>
                  <div>
                    <h2>{machine.serialNumber ?? messages.MACHINE_NO_SERIAL}</h2>
                    <p>{messages.FIELD_STATUS}: {statusLabel(machine.status)}</p>
                    <p>{messages.FIELD_MACHINE_TYPE}: {machine.machineType ?? "—"}</p>
                  </div>
                  <Link className={styles.secondaryLink} href={PATH_CUSTOMER.MACHINE_DETAIL(machine.id)}>{messages.VIEW_DETAILS}</Link>
                </article>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function MenuScreen({ sectionPath }: { sectionPath: string }) {
  const candidate = sectionPath.startsWith("menu/") ? sectionPath.slice("menu/".length) : "";
  const recipeId = GlobalRecipeIdSchema.safeParse(candidate).success ? candidate : null;
  const isList = sectionPath === "menu";
  const globalList = useQuery({
    queryKey: ["owner-global-recipes"],
    queryFn: ({ signal }) => recipesApi.listGlobal(signal),
    enabled: isList,
  });
  const localList = useQuery({
    queryKey: ["owner-local-recipes"],
    queryFn: ({ signal }) => recipesApi.listLocal(signal),
    enabled: isList || Boolean(recipeId),
  });
  const globalDetail = useQuery({
    queryKey: ["owner-global-recipe", recipeId],
    queryFn: ({ signal }) => recipesApi.getGlobalById(recipeId!, signal),
    enabled: Boolean(recipeId),
  });

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-screen-title">{recipeId ? messages.RECIPE_DETAIL_TITLE : messages.MENU_TITLE}</h1>
        <p>{messages.MENU_DESCRIPTION}</p>
      </header>
      {recipeId ? (
        <>
          <QueryFeedback loading={globalDetail.isPending || localList.isPending} failed={globalDetail.isError || localList.isError} empty={!globalDetail.data} emptyText={messages.NO_RECIPES} />
          {globalDetail.data ? (
            <div className={styles.dataPanel}>
              <h2>{globalDetail.data.name}</h2>
              <p>{messages.RECIPE_STEPS}</p>
              <ol className={styles.recipeSteps}>
                {globalDetail.data.steps.map((step, index) => <li key={index}>{step}</li>)}
              </ol>
              <h3>{messages.RECIPE_DOSAGE}</h3>
              <ul className={styles.recipeSteps}>
                {globalDetail.data.dosageBounds.map((bound, index) => <li key={index}>{bound}</li>)}
              </ul>
              <h3>{messages.LOCAL_CONFIGURATION}</h3>
              {localList.data?.find((recipe) => recipe.globalRecipeId === recipeId)?.dosageOverrides.length ? (
                <ul className={styles.recipeSteps}>
                  {localList.data.find((recipe) => recipe.globalRecipeId === recipeId)!.dosageOverrides.map((override, index) => <li key={index}>{override}</li>)}
                </ul>
              ) : <p>{messages.NO_LOCAL_CONFIGURATION}</p>}
            </div>
          ) : null}
          <Link className={styles.secondaryLink} href={PATH_CUSTOMER.MENU}>{messages.BACK_TO_LIST}</Link>
        </>
      ) : (
        <>
          <Link className={styles.primaryButton} href={PATH_CUSTOMER.MENU_ADD_DISH}>
            {CUSTOMER_MESSAGES.WORKFLOWS.MENU_ADD_DISH_TITLE}
          </Link>
          <QueryFeedback loading={globalList.isPending || localList.isPending} failed={globalList.isError || localList.isError} empty={!globalList.data?.length} emptyText={messages.NO_RECIPES} />
          {globalList.data?.length ? (
            <div className={styles.recordList}>
              {globalList.data.map((recipe) => {
                const local = localList.data?.find((item) => item.globalRecipeId === recipe.id);
                return (
                  <article className={styles.recordCard} key={recipe.id}>
                    <div>
                      <h2>{recipe.name}</h2>
                      <p>{messages.RECIPE_STEPS_COUNT}: {recipe.steps.length}</p>
                      <p>{local ? messages.LOCAL_RECIPE_CONFIGURED : messages.GLOBAL_RECIPE_ONLY}</p>
                    </div>
                    <Link className={styles.secondaryLink} href={PATH_CUSTOMER.MENU_RECIPE(recipe.id)}>{messages.VIEW_DETAILS}</Link>
                  </article>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function PaymentProofForm({ invoiceId }: { invoiceId: string }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const mutation = useMutation({
    mutationFn: (input: { amount: number; file: File; idempotencyKey: string }) =>
      billingApi.submitPaymentProof({ invoiceId, ...input }),
    onSuccess: async () => {
      setAmount("");
      setFile(null);
      setValidationError("");
      idempotencyKeyRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
      await queryClient.invalidateQueries({ queryKey: ["owner-invoice-proofs", invoiceId] });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setValidationError(CUSTOMER_MESSAGES.WORKFLOWS.PAYMENT_AMOUNT_REQUIRED);
      return;
    }
    if (!file) {
      setValidationError(CUSTOMER_MESSAGES.WORKFLOWS.PAYMENT_FILE_REQUIRED);
      return;
    }
    setValidationError("");
    idempotencyKeyRef.current ??= createIdempotencyKey();
    mutation.mutate({ amount: parsedAmount, file, idempotencyKey: idempotencyKeyRef.current });
  };

  return (
    <form className={styles.dataPanel} onSubmit={submit}>
      <h2>{CUSTOMER_MESSAGES.WORKFLOWS.INVOICE_PAYMENT_TITLE}</h2>
      <p>{CUSTOMER_MESSAGES.WORKFLOWS.INVOICE_PAYMENT_DESCRIPTION}</p>
      <label className={styles.formField}>
        <span>{CUSTOMER_MESSAGES.WORKFLOWS.FIELD_PAYMENT_AMOUNT}</span>
        <input
          min="0.01"
          onChange={(event) => {
            idempotencyKeyRef.current = null;
            setAmount(event.target.value);
          }}
          required
          step="0.01"
          type="number"
          value={amount}
        />
      </label>
      <label className={styles.formField}>
        <span>{CUSTOMER_MESSAGES.WORKFLOWS.FIELD_PAYMENT_PROOF}</span>
        <input
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(event) => {
            idempotencyKeyRef.current = null;
            setFile(event.target.files?.[0] ?? null);
          }}
          ref={inputRef}
          required
          type="file"
        />
      </label>
      {validationError ? <p className={styles.errorNotice} role="alert">{validationError}</p> : null}
      {mutation.isError ? <p className={styles.errorNotice} role="alert">{CUSTOMER_MESSAGES.WORKFLOWS.PAYMENT_SUBMIT_ERROR}</p> : null}
      {mutation.isSuccess ? <p className={styles.successNotice} role="status">{CUSTOMER_MESSAGES.WORKFLOWS.PAYMENT_SUBMIT_SUCCESS}</p> : null}
      <button className={styles.primaryButton} disabled={mutation.isPending} type="submit">
        {mutation.isPending ? CUSTOMER_MESSAGES.WORKFLOWS.ACTION_SENDING : CUSTOMER_MESSAGES.WORKFLOWS.ACTION_SEND_PROOF}
      </button>
    </form>
  );
}

function InvoicesScreen({ sectionPath }: { sectionPath: string }) {
  const parts = sectionPath.split("/");
  const invoiceCandidate = parts.length === 2 ? parts[1] : "";
  const invoiceId = InvoiceIdSchema.safeParse(invoiceCandidate).success ? invoiceCandidate : null;
  const period = /^invoices\/\d{4}-\d{2}$/.test(sectionPath) ? parts[1] : null;
  const isList = sectionPath === "invoices" || sectionPath === "invoices/standard" || Boolean(period);
  const list = useQuery({
    queryKey: ["owner-invoices"],
    queryFn: ({ signal }) => billingApi.listInvoices(signal),
    enabled: isList,
  });
  const detail = useQuery({
    queryKey: ["owner-invoice", invoiceId],
    queryFn: ({ signal }) => billingApi.getInvoice(invoiceId!, signal),
    enabled: Boolean(invoiceId),
  });
  const lineItems = useQuery({
    queryKey: ["owner-invoice-lines", invoiceId],
    queryFn: ({ signal }) => billingApi.listInvoiceLineItems(invoiceId!, signal),
    enabled: Boolean(invoiceId),
  });
  const proofs = useQuery({
    queryKey: ["owner-invoice-proofs", invoiceId],
    queryFn: ({ signal }) => billingApi.listPaymentProofs(invoiceId!, signal),
    enabled: Boolean(invoiceId),
  });
  const visibleInvoices = list.data?.filter((invoice) => !period || invoice.period.startsWith(period)) ?? [];

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-screen-title">{invoiceId ? messages.INVOICE_DETAIL_TITLE : messages.INVOICES_TITLE}</h1>
        <p>{messages.INVOICES_DESCRIPTION}</p>
      </header>
      {invoiceId ? (
        <>
          <QueryFeedback loading={detail.isPending} failed={detail.isError} empty={!detail.data} emptyText={messages.NO_INVOICES} />
          {detail.data ? (
            <>
              <dl className={styles.detailGrid}>
                <DetailItem label={messages.FIELD_INVOICE_ID} value={detail.data.id} />
                <DetailItem label={messages.FIELD_STATUS} value={statusLabel(detail.data.status)} />
                <DetailItem label={messages.FIELD_PERIOD} value={detail.data.period} />
                <DetailItem label={messages.FIELD_AMOUNT} value={formatMoney(detail.data.amount, detail.data.currency)} />
                <DetailItem label={messages.FIELD_DUE_DATE} value={formatDate(detail.data.dueDate)} />
                <DetailItem label={messages.FIELD_PAID_AT} value={formatDate(detail.data.paidAt)} />
              </dl>
              <section className={styles.dataPanel} aria-labelledby="owner-invoice-lines">
                <h2 id="owner-invoice-lines">{messages.INVOICE_LINE_ITEMS}</h2>
                <QueryFeedback loading={lineItems.isPending} failed={lineItems.isError} empty={!lineItems.data?.length} emptyText={messages.NO_INVOICE_LINES} />
                {lineItems.data?.length ? (
                  <div className={styles.recordList}>
                    {lineItems.data.map((item, index) => (
                      <article className={styles.recordCard} key={item.id ?? "line-" + index}>
                        <div>
                          <h3>{item.description ?? item.serviceCode ?? messages.INVOICE_LINE}</h3>
                          <p>{messages.FIELD_QUANTITY}: {item.quantity ?? "—"} · {messages.FIELD_UNIT_PRICE}: {formatMoney(item.unitPrice, detail.data?.currency)}</p>
                        </div>
                        <strong>{formatMoney(item.amount, detail.data?.currency)}</strong>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>
              <section className={styles.dataPanel} aria-labelledby="owner-invoice-proofs">
                <h2 id="owner-invoice-proofs">{messages.PAYMENT_PROOFS}</h2>
                <QueryFeedback loading={proofs.isPending} failed={proofs.isError} empty={!proofs.data?.length} emptyText={messages.NO_PAYMENT_PROOFS} />
                {proofs.data?.length ? (
                  <ul className={styles.simpleList}>
                    {proofs.data.map((proof) => (
                      <li key={proof.id}>
                        {proof.originalFilename} · {statusLabel(proof.status)} · {formatDate(proof.submittedAt)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
              <PaymentProofForm invoiceId={invoiceId} />
            </>
          ) : null}
          <Link className={styles.secondaryLink} href={PATH_CUSTOMER.INVOICES}>{messages.BACK_TO_LIST}</Link>
        </>
      ) : (
        <>
          <QueryFeedback loading={list.isPending} failed={list.isError} empty={!visibleInvoices.length} emptyText={messages.NO_INVOICES} />
          {visibleInvoices.length ? (
            <div className={styles.recordList}>
              {visibleInvoices.map((invoice) => (
                <article className={styles.recordCard} key={invoice.id}>
                  <div>
                    <h2>{invoice.period}</h2>
                    <p>{messages.FIELD_STATUS}: {statusLabel(invoice.status)}</p>
                    <p>{messages.FIELD_DUE_DATE}: {formatDate(invoice.dueDate)}</p>
                  </div>
                  <strong>{formatMoney(invoice.amount, invoice.currency)}</strong>
                  <Link className={styles.secondaryLink} href={PATH_CUSTOMER.INVOICE_DETAIL(invoice.id)}>{messages.VIEW_DETAILS}</Link>
                </article>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export function CustomerReadScreen({ sectionPath }: { sectionPath: string }) {
  const screen = getCustomerScreenDescriptor(sectionPath);
  const contractCandidate = sectionPath.startsWith("contracts/")
    ? sectionPath.slice("contracts/".length)
    : "";
  const machineCandidate = sectionPath.startsWith("machines/")
    ? sectionPath.slice("machines/".length)
    : "";
  const recipeCandidate = sectionPath.startsWith("menu/")
    ? sectionPath.slice("menu/".length)
    : "";
  const invoiceCandidate = sectionPath.startsWith("invoices/")
    ? sectionPath.slice("invoices/".length)
    : "";

  if (!sectionPath) return <OverviewScreen />;
  if (sectionPath === "contracts" || ContractIdSchema.safeParse(contractCandidate).success) {
    return <ContractsScreen sectionPath={sectionPath} />;
  }
  if (sectionPath === "machines" || MachineIdSchema.safeParse(machineCandidate).success) {
    return <MachinesScreen sectionPath={sectionPath} />;
  }
  if (sectionPath === "menu" || GlobalRecipeIdSchema.safeParse(recipeCandidate).success) {
    return <MenuScreen sectionPath={sectionPath} />;
  }
  if (
    sectionPath === "invoices" ||
    sectionPath === "invoices/standard" ||
    /^invoices\/\d{4}-\d{2}$/.test(sectionPath) ||
    InvoiceIdSchema.safeParse(invoiceCandidate).success
  ) {
    return <InvoicesScreen sectionPath={sectionPath} />;
  }

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-screen-title">{screen.title}</h1>
        <p>{screen.description}</p>
      </header>
      {screen.availability === "unavailable" ? (
        <div className={styles.pendingNotice} role="status">
          <h2>{messages.DATA_UNAVAILABLE_TITLE}</h2>
          <p>{messages.DATA_UNAVAILABLE_DESCRIPTION}</p>
          <p id="customer-read-reason">{messages.DATA_SCOPE_REASON}</p>
        </div>
      ) : (
        <p className={styles.pendingNotice} role="status">{CUSTOMER_MESSAGES.ROUTES.PENDING}</p>
      )}
      <ActionBar label={`Thao tác ${screen.title}`}>
        <ActionBarActions actions={screen.actions} />
      </ActionBar>
    </section>
  );
}
