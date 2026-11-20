import { createContext, useContext, type ReactNode } from "react";
import { BackButton, type BackButtonDestination } from "./back-button";

export const BackButtonHeadingVisibilityContext = createContext(true);

export type BackButtonHeadingProps = {
  title: string;
  titleId: string;
  description?: ReactNode;
  className?: string;
  back: BackButtonDestination | null;
};

export function BackButtonHeading({
  title,
  titleId,
  description,
  className,
  back,
}: BackButtonHeadingProps) {
  const showBackButton = useContext(BackButtonHeadingVisibilityContext);
  return (
    <header className={className} data-ui-page-heading>
      {showBackButton && back ? <BackButton label={back.label} fallbackHref={back.fallbackHref} /> : null}
      <h1 id={titleId}>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  );
}
