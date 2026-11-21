import { Children, cloneElement, isValidElement, type HTMLAttributes, type ReactElement } from "react";

import { Fragment, type ReactNode } from "react";

// Keep navigation links and pressed view switches in their existing semantics.
function markTabChildren(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type === Fragment) {
      const fragment = child as ReactElement<{ children?: ReactNode }>;
      return cloneElement(fragment, {}, markTabChildren(fragment.props.children));
    }
    const control = child as ReactElement<HTMLAttributes<HTMLButtonElement> & { "data-ui-tab"?: string }>;
    return cloneElement(control, {
      "data-ui-tab": "true",
      ...(control.props.role === "tab" ? { tabIndex: control.props["aria-selected"] ? 0 : -1 } : {}),
    });
  });
}

export function SectionTabList({ children, role = "group", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} role={role} data-ui-tabs onKeyDown={(event) => {
    props.onKeyDown?.(event);
    if (event.defaultPrevented || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>("button:not(:disabled), a[href]"));
    const index = controls.indexOf(event.target as HTMLButtonElement);
    if (index < 0 || !controls.length) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? controls.length - 1 : (index + (event.key === "ArrowRight" ? 1 : controls.length - 1)) % controls.length;
    controls[next].focus();
    controls[next].click();
  }}>
    {markTabChildren(children)}
  </div>;
}
