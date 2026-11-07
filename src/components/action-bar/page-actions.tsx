import { useContext, useEffect, useId } from "react";
import { ActionBarConfig } from "./action-bar";
import { PageActionsRegistryContext } from "./page-actions-registry";
import { PageActionsRenderer } from "./page-actions-renderer";
import type { PageAction } from "./page-action.types";

export type { PageAction } from "./page-action.types";

export function PageActions({ actions }: { actions: readonly PageAction[] }) {
  const registry = useContext(PageActionsRegistryContext);
  const id = useId();
  useEffect(() => {
    if (!registry) return;
    registry.register(id, actions);
  }, [actions, id, registry]);
  useEffect(() => () => registry?.unregister(id), [id, registry]);

  if (registry) return null;
  return <ActionBarConfig><PageActionsRenderer actions={actions} /></ActionBarConfig>;
}
