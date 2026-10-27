import type { BackButtonDestination } from "@/components/navigation/back-button";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";

type QueryValue = string | string[] | undefined;
type RouterQuery = Record<string, QueryValue>;

function firstString(value: QueryValue): string {
  return typeof value === "string" ? value : "";
}

function listHref(pathname: string, query: RouterQuery, keys: string[]): string {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = firstString(query[key]);
    if (value) params.set(key, value);
  }
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function getBusinessesBackDestination(query: RouterQuery): BackButtonDestination | null {
  if (firstString(query.view) !== "detail") return null;
  return {
    label: T.BUSINESSES.BACK_TO_LIST,
    fallbackHref: listHref(PATH_ADMIN.BUSINESSES, query, ["q", "status", "page"]),
  };
}

export function getStoresBackDestination(query: RouterQuery): BackButtonDestination | null {
  if (!["create", "detail"].includes(firstString(query.view))) return null;
  return {
    label: T.STORES.BACK_TO_LIST,
    fallbackHref: listHref(PATH_ADMIN.STORES, query, ["ownerId"]),
  };
}

export function getMachinesBackDestination(query: RouterQuery): BackButtonDestination | null {
  if (firstString(query.view) !== "create") return null;
  return { label: "Danh sách máy", fallbackHref: listHref(PATH_ADMIN.MACHINES, query, ["status"]) };
}

export function getMachineDetailBackDestination(query: RouterQuery): BackButtonDestination {
  return {
    label: T.MACHINES.BACK,
    fallbackHref: listHref(PATH_ADMIN.MACHINES, query, ["status"]),
  };
}

export function getContractsBackDestination(query: RouterQuery): BackButtonDestination | null {
  const view = firstString(query.view);
  if (view === "create" || view === "detail") {
    return { label: "Danh sách hợp đồng", fallbackHref: PATH_ADMIN.CONTRACTS };
  }
  if (view === "history") {
    const contractId = firstString(query.id);
    return contractId
      ? {
          label: "Chi tiết hợp đồng",
          fallbackHref: `${PATH_ADMIN.CONTRACTS}?view=detail&id=${encodeURIComponent(contractId)}`,
        }
      : { label: "Danh sách hợp đồng", fallbackHref: PATH_ADMIN.CONTRACTS };
  }
  return null;
}

export function getIotBackDestination(query: RouterQuery): BackButtonDestination | null {
  if (!firstString(query.ownerId)) return null;
  return {
    label: "Danh sách Owner IoT",
    fallbackHref: listHref(PATH_ADMIN.IOT, query, ["page"]),
  };
}

export function getMenuBackDestination(query: RouterQuery): BackButtonDestination | null {
  if (firstString(query.view) !== "create") return null;
  return { label: "Danh sách công thức", fallbackHref: PATH_ADMIN.MENU };
}
