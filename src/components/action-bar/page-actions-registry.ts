import { createContext } from "react";
import type { PageAction } from "./page-action.types";

export class PageActionsRegistry {
  constructor(private readonly navigationHrefs: readonly string[] = []) {}

  private readonly groups = new Map<string, readonly PageAction[]>();
  private readonly listeners = new Set<() => void>();
  private snapshot: readonly PageAction[] = [];

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = () => this.snapshot;

  register(id: string, actions: readonly PageAction[]) {
    if (this.groups.get(id) === actions) return;
    this.groups.set(id, actions);
    this.updateSnapshot();
  }

  unregister(id: string) {
    if (!this.groups.delete(id)) return;
    this.updateSnapshot();
  }

  private updateSnapshot() {
    const actions = Array.from(this.groups.values()).flat();
    const navigationOnly = actions.every(action => action.href && this.navigationHrefs.includes(action.href)
      && !action.onClick && action.type !== "submit" && !action.form && !action.confirm && !action.holdToConfirm);
    this.snapshot = navigationOnly ? [] : actions;
    this.listeners.forEach((listener) => listener());
  }
}

export const PageActionsRegistryContext = createContext<PageActionsRegistry | null>(null);
