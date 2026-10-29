import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/table/data-table";
import { TextLinkButton } from "@/components/button/text-link-button";
import { contractsApi } from "@/apis/contracts.api";
import { PATH_MODERATOR } from "@/routes/path";
import { getApiErrorMessage } from "@/lib/api-errors";
import { moderatorStyles as styles } from "../moderator-shell";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

function QueryFeedback({
  query,
  loadingMessage,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  loadingMessage: string;
}) {
  if (query.isPending) {
    return <p className={styles.pendingNotice} role="status">{loadingMessage}</p>;
  }
  if (query.isError) {
    return (
      <div className={styles.pendingNotice} role="alert">
        <p>{getApiErrorMessage(query.error)}</p>
        <button className={styles.retryButton} type="button" onClick={() => void query.refetch()}>
          {MODERATOR_MESSAGES.READ_SCREENS.RETRY}
        </button>
      </div>
    );
  }
  return null;
}

function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <header className={styles.pageHeading}>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

export function ContractListScreen() {
  const contracts = useQuery({
    queryKey: ["dolores", "contracts"],
    queryFn: ({ signal }) => contractsApi.list(signal),
    retry: false,
  });

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.CONTRACTS_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.CONTRACTS_DESCRIPTION}
      />
      <QueryFeedback query={contracts} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_CONTRACTS} />
      {contracts.data?.length === 0 && !contracts.isError && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_CONTRACTS}</p>
      )}
      {contracts.data && contracts.data.length > 0 && (
        <DataTable variant="moderator" headers={[
          MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_ID,
          MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_OWNER_ID,
          MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_PERIOD,
          MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_STATUS,
          MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_TYPE,
        ]}>
          {contracts.data.map((contract) => (
            <tr key={contract.id}>
              <td><TextLinkButton href={PATH_MODERATOR.CONTRACT_DETAIL(contract.id)}>{contract.id}</TextLinkButton></td>
              <td>{contract.ownerId}</td>
              <td>{contract.startDate ?? "—"} – {contract.endDate ?? "—"}</td>
              <td>
                {contract.status === "DRAFT" ? (
                  <TextLinkButton href={PATH_MODERATOR.CONTRACT_INSTALLATION_REQUEST(contract.id)}>{contract.status}</TextLinkButton>
                ) : (
                  contract.status
                )}
              </td>
              <td>{contract.machineTypeSnapshot ?? "—"}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
