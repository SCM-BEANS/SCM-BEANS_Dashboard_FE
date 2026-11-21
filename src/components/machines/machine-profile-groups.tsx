import type { ReactNode } from "react";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import styles from "./machine-profile-groups.module.css";

type Field = { label: string; value: ReactNode };

export function MachineProfileGroups({ identity, allocation }: { identity: readonly Field[]; allocation: readonly Field[] }) {
  const groups: readonly [string, readonly Field[]][] = [[T.MACHINES.PROFILE_IDENTITY, identity], [T.MACHINES.PROFILE_ALLOCATION, allocation]];
  return <div className={styles.groups}>
    {groups.map(([title, fields]) => (
      <section className={styles.group} key={title}>
        <h3>{title}</h3>
        <div className={styles.fields}>{fields.map(({ label, value }) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      </section>
    ))}
  </div>;
}
