//TODO: use proper XML parser package instead?
function stripTaggedBlocks(text: string): string {
  return text
    .replace(/<([a-zA-Z][a-zA-Z0-9:-]*)\b[^>]*>[\s\S]*?<\/\1>/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function extractTag(block: string, tag: string): string | undefined {
  const match = block.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  if (!match) return undefined;

  const unwrapped = match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1");
  const cleaned = stripTaggedBlocks(unwrapped);
  return cleaned;
}

function extractAllTags(block: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(block)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

function extractDoiFromContent(rawContent: string): string | undefined {
  const match =
    rawContent.match(/doi\.org\/(10\.\d{4,9}\/[^\s"'<>]+)/i) ||
    rawContent.match(/\bdoi:\s*(10\.\d{4,9}\/[^\s.,;<]+)/i);
  return match ? match[1] : undefined;
}

export function parseFeedItems(xml: string): Record<string, string>[] {
  const isAtom = xml.includes("<feed");
  const itemTag = isAtom ? "entry" : "item";
  const blocks =
    xml.match(new RegExp(`<${itemTag}[^>]*>[\\s\\S]*?<\\/${itemTag}>`, "gi")) ||
    [];

  return blocks.map((block) => {
    const identifiers = extractAllTags(block, "dc:identifier");
    const doiFromIdentifier = identifiers
      .map((id) => {
        const prefixed = id.match(/^doi:\s*(10\.\d{4,9}\/\S+)/i);
        if (prefixed) return prefixed[1];
        const bare = id.match(/^(10\.\d{4,9}\/\S+)$/);
        return bare ? bare[1] : undefined;
      })
      .find((doi) => doi !== undefined);

    const rawContentMatch = block.match(
      /<content:encoded>([\s\S]*?)<\/content:encoded>/i,
    );
    const doiFromContent = rawContentMatch
      ? extractDoiFromContent(rawContentMatch[1])
      : undefined;

    const doi = doiFromIdentifier || doiFromContent;
    const pubmedLink =
      extractTag(block, "link") ||
      block.match(/<link[^>]*href=["']([^"']+)["']/)?.[1] ||
      "";

    return {
      title: extractTag(block, "title") || "",
      link: doi ? `https://doi.org/${doi}` : pubmedLink,
      description:
        extractTag(block, "description") ||
        extractTag(block, "summary") ||
        extractTag(block, "content:encoded") ||
        extractTag(block, "content") ||
        "",
      pubDate:
        extractTag(block, "pubDate") ||
        extractTag(block, "published") ||
        extractTag(block, "updated") ||
        extractTag(block, "dc:date") ||
        "",
      guid: extractTag(block, "guid") || "",
      doi: doi || "",
    };
  });
}
