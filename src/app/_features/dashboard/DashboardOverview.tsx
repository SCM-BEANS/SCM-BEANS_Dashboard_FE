"use client";

import type { ReactNode } from "react";
import { DoloresPage } from "@/app/_shell/dolores/DoloresShell";
import { DoloresMetric } from "@/app/_ui/dolores/DoloresUI";

export type DashboardOverviewMetric = {
  label: string;
  value: string;
};

export function DashboardOverview({
  title,
  description,
  actions,
  metrics,
  beforeMetrics,
  children,
  showMobileActionsMenu = true,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  metrics?: readonly DashboardOverviewMetric[];
  beforeMetrics?: ReactNode;
  children?: ReactNode;
  showMobileActionsMenu?: boolean;
}) {
  return (
    <DoloresPage
      title={title}
      description={description}
      actions={actions}
      showMobileActionsMenu={showMobileActionsMenu}
    >
      {beforeMetrics}
      {metrics && (
        <div className="dl-metrics grid grid-cols-4 gap-4">
          {metrics.map(({ label, value }) => (
            <DoloresMetric key={label} label={label} value={value} />
          ))}
        </div>
      )}
      {children}
    </DoloresPage>
  );
}
