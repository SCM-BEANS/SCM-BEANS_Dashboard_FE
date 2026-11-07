import { createContext, useContext, useEffect, useState, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
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
    <ActionBarSlotContext.Provider value={actionsElement}>
      <div className={styles.layout} data-visible={visible}>
        {children}
        <ActionBar label={label} actionsRef={setActionsElement} />
      </div>
    </ActionBarSlotContext.Provider>
  );
}

export function ActionBarConfig({ children }: { children: ReactNode }) {
  const actionsElement = useContext(ActionBarSlotContext);
  return actionsElement ? createPortal(children, actionsElement) : null;
}
