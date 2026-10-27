import { BackButton, type BackButtonDestination } from "./back-button";

export type BackButtonHeadingProps = {
  title: string;
  titleId: string;
  description?: string;
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
  return (
    <header className={className}>
      {back ? <BackButton label={back.label} fallbackHref={back.fallbackHref} /> : null}
      <h1 id={titleId}>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  );
}
