import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { PageActionsRenderer } from "./page-actions-renderer";
import { PageActionsRegistry, PageActionsRegistryContext } from "./page-actions-registry";
import styles from "./action-bar.module.css";

interface ActionBarProps {
  children?: ReactNode;
  label?: string;
  actionsRef?: Ref<HTMLDivElement>;
}

const ActionBarSlotContext = createContext<HTMLDivElement | null>(null);

export function ActionBar({
  children,
  label = "Thao tác trang",
  actionsRef,
}: ActionBarProps) {
  return (
    <footer className={styles.dock} aria-label={label}>
      <div className={styles.actions} ref={actionsRef}>{children}</div>
    </footer>
  );
}

export function ActionBarLayout({ children, label }: { children: ReactNode; label: string }) {
  const [actionsElement, setActionsElement] = useState<HTMLDivElement | null>(null);
  const [registry] = useState(() => new PageActionsRegistry());

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!actionsElement) return;
    const update = () => setVisible(actionsElement.childNodes.length > 0);
    const observer = new MutationObserver(update);
    observer.observe(actionsElement, { childList: true });
    update();
    return () => observer.disconnect();
  }, [actionsElement]);

  return (
    <PageActionsRegistryContext.Provider value={registry}>
    <ActionBarSlotContext.Provider value={actionsElement}>
      <div className={styles.layout} data-visible={visible}>
        {children}
        <ActionBar label={label} actionsRef={setActionsElement}><RegisteredPageActions registry={registry} /></ActionBar>
      </div>
    </ActionBarSlotContext.Provider>
    </PageActionsRegistryContext.Provider>
  );
}

function RegisteredPageActions({ registry }: { registry: PageActionsRegistry }) {
  const actions = useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot);
  return <PageActionsRenderer actions={actions} />;
}

export function ActionBarConfig({ children }: { children: ReactNode }) {
  const actionsElement = useContext(ActionBarSlotContext);
  return actionsElement ? createPortal(children, actionsElement) : null;
}
