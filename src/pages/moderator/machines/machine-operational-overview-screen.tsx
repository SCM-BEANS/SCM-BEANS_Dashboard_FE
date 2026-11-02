import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/apis/dashboard.api";
import { machinesApi } from "@/apis/machines.api";
import { OperationalOverview, getDefaultOperationalRange } from "@/components/machines/operational-overview";
import type { OperationalDateRange } from "@/components/machines/operational-overview";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_MODERATOR } from "@/routes/path";
import { moderatorStyles } from "../moderator-shell";

export function ModeratorMachineOperationalOverviewScreen({ machineId }: { machineId: string }) {
  const [range, setRange] = useState<OperationalDateRange>(getDefaultOperationalRange);
  const machine = useQuery({
    queryKey: ["dolores", "machines", "id", machineId],
    queryFn: ({ signal }) => machinesApi.getById(machineId, signal),
    retry: false,
  });
  const overview = useQuery({
    queryKey: ["moderator-machine-operational-overview", machineId, range.fromDate, range.toDate],
    queryFn: ({ signal }) => dashboardApi.getOverview(signal, range.fromDate, range.toDate),
    enabled: Boolean(machine.data),
    retry: false,
  });

  return (
    <div className={moderatorStyles.pageContent}>
      <OperationalOverview
          machineId={machineId}
          machineLabel={machine.data?.serialNumber ?? undefined}
          scopeLabel="phạm vi vận hành Moderator"
          showFinancialMetrics={false}
          overview={overview.data}
          range={range}
          onRangeChange={setRange}
          loading={machine.isSuccess && overview.isPending}
          error={overview.isError ? getApiErrorMessage(overview.error) : undefined}
          onRetry={() => void overview.refetch()}
          machineLoading={machine.isPending}
          machineError={machine.isError ? getApiErrorMessage(machine.error) : undefined}
          machineHref={PATH_MODERATOR.MACHINE_DETAIL(machineId)}
          machineListHref={PATH_MODERATOR.MACHINES}
      />
    </div>
  );
}
