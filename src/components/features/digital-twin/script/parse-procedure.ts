export interface ParsedProcedureStep {
  directive: string;
  value: number | null;
}

const SUPPORTED_DIRECTIVES = new Set([
  "PREWATER",
  "PREMILK",
  "DOSE",
  "TAMP",
  "HOLDTAMP",
  "PREINFUSE",
  "BLOOM",
  "EXTRACT",
  "DRYTAMP",
  "POSTMILK",
  "POSTWATER",
]);

function normalizeText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("vi-VN")
    .replace(/[đÐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/,/g, ".")
    .replace(/\s+/g, " ");
}

function numberFrom(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLegacyStep(step: string): ParsedProcedureStep | null {
  const normalized = normalizeText(step);
  const direct = /^([a-z]+)\s*(?::|\s)\s*(-?\d+(?:\.\d+)?)?\s*(?:g|gr|ml|s|sec|seconds?|%|phut|ml)?\s*$/.exec(normalized);
  if (direct && SUPPORTED_DIRECTIVES.has(direct[1].toUpperCase())) {
    return { directive: direct[1].toUpperCase(), value: numberFrom(direct[2]) };
  }

  const patterns: readonly [RegExp, string][] = [
    [/^(?:xay|grind)(?:\s+(?:hat|ca phe|coffee))?(?:\s+(-?\d+(?:\.\d+)?))?\s*(?:g|gr)?$/, "DOSE"],
    [/^(?:nap|dose)(?:\s+(?:ca phe|coffee))?(?:\s+(-?\d+(?:\.\d+)?))?\s*(?:g|gr)?$/, "DOSE"],
    [/^(?:nen|tamp)(?:\s+(?:ca phe|coffee))?(?:\s+(-?\d+(?:\.\d+)?))?\s*%?$/, "TAMP"],
    [/^(?:giu nen|hold tamp)(?:\s+(-?\d+(?:\.\d+)?))?\s*%?$/, "HOLDTAMP"],
    [/^(?:ngam so bo|pre[ -]?infus(?:e|ion))(?:\s+(-?\d+(?:\.\d+)?))?\s*(?:s|sec|seconds?)?$/, "PREINFUSE"],
    [/^(?:ngam|u)(?:\s+(-?\d+(?:\.\d+)?))?\s*(?:s|sec|seconds?)?$/, "BLOOM"],
    [/^(?:chiet xuat|extract)(?:\s+(?:ca phe|coffee))?(?:\s+(-?\d+(?:\.\d+)?))?\s*(?:ml)?$/, "EXTRACT"],
    [/^(?:nuoc|water)(?:\s+(-?\d+(?:\.\d+)?))?\s*(?:ml)?$/, "PREWATER"],
    [/^(?:them sua|milk)(?:\s+(-?\d+(?:\.\d+)?))?\s*(?:ml)?$/, "PREMILK"],
    [/^(?:nen kho|dry tamp)$/, "DRYTAMP"],
  ];

  for (const [pattern, directive] of patterns) {
    const match = pattern.exec(normalized);
    if (match) return { directive, value: numberFrom(match[1]) };
  }
  return null;
}

export function parseProcedure(steps: readonly string[]): ParsedProcedureStep[] {
  const parsed: ParsedProcedureStep[] = [];
  for (const raw of steps) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const canonical = /^([A-Za-z]+)\s*:\s*(-?\d+(?:[.,]\d+)?)?$/.exec(trimmed);
    if (canonical) {
      const directive = canonical[1].toUpperCase();
      if (SUPPORTED_DIRECTIVES.has(directive)) {
        parsed.push({ directive, value: numberFrom(canonical[2]) });
        continue;
      }
    }

    const legacy = parseLegacyStep(trimmed);
    if (legacy) parsed.push(legacy);
  }
  return parsed;
}
