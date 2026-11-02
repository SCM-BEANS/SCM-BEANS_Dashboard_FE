import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/apis/dashboard.api";
import { machinesApi } from "@/apis/machines.api";
import { OperationalOverview, getDefaultOperationalRange } from "@/components/machines/operational-overview";
import type { OperationalDateRange } from "@/components/machines/operational-overview";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_CUSTOMER } from "@/routes/path";
import styles from "../customer-shell.module.css";

export function CustomerMachineOperationalOverviewScreen({ machineId }: { machineId: string }) {
  const [range, setRange] = useState<OperationalDateRange>(getDefaultOperationalRange);
  const machine = useQuery({
    queryKey: ["owner-machine", machineId],
    queryFn: ({ signal }) => machinesApi.getById(machineId, signal),
    retry: false,
  });
  const overview = useQuery({
    queryKey: ["owner-machine-operational-overview", machineId, range.fromDate, range.toDate],
    queryFn: ({ signal }) => dashboardApi.getOverview(signal, range.fromDate, range.toDate),
    enabled: Boolean(machine.data),
    retry: false,
  });

  return (
    <div className={styles.pageContent}>
    <OperationalOverview
      machineId={machineId}
      machineLabel={machine.data?.serialNumber ?? undefined}
      scopeLabel="tài khoản Owner"
      showFinancialMetrics
      overview={overview.data}
      range={range}
      onRangeChange={setRange}
      loading={machine.isSuccess && overview.isPending}
      error={overview.isError ? getApiErrorMessage(overview.error) : undefined}
      onRetry={() => void overview.refetch()}
      machineLoading={machine.isPending}
      machineError={machine.isError ? getApiErrorMessage(machine.error) : undefined}
      machineHref={PATH_CUSTOMER.MACHINE_DETAIL(machineId)}
      machineListHref={PATH_CUSTOMER.MACHINES}
    />
    </div>
  );
}
