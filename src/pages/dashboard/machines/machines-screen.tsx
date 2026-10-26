import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { MachineIdSchema } from "@/schema/machines.schema";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { DetailItem, formatDate, QueryFeedback, statusLabel } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

export function MachinesScreen({ sectionPath }: { sectionPath: string }) {
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
