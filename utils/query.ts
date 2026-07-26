export interface ParsedModifier {
  token: string | null;
  term: string;
}

export function parsePrefixModifier(
  input: string,
  prefix: string,
): ParsedModifier {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = input.match(new RegExp(`^${escaped}(\\w+)\\s*(.*)$`));
  if (match) return { token: match[1], term: match[2] };
  return { token: null, term: input };
}
