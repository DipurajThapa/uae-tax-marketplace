/**
 * Minimal, safe Markdown → HTML for reviewer-written guides: headings, paragraphs,
 * lists, bold/italic, inline code and links (http/https and relative only). All other HTML is escaped.
 */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, href: string) => {
    const h = href.replace(/&amp;/g, "&");
    // "/path" is internal; "//host" is protocol-relative and therefore external (review L10).
    if (!/^(https?:\/\/|\/(?!\/))/.test(h)) return text;
    const external = h.startsWith("http");
    return `<a href="${esc(h)}"${external ? ' rel="noopener nofollow" target="_blank"' : ""}>${text}</a>`;
  });
  return out;
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let list: "ul" | "ol" | null = null;
  let para: string[] = [];
  const flushPara = () => { if (para.length) { html.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
  const closeList = () => { if (list) { html.push(`</${list}>`); list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{2,4})\s+(.*)$/.exec(line);
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (h) { flushPara(); closeList(); html.push(`<h${h[1]!.length}>${inline(h[2]!)}</h${h[1]!.length}>`); }
    else if (ul || ol) {
      flushPara();
      const kind = ul ? "ul" : "ol";
      if (list !== kind) { closeList(); html.push(`<${kind}>`); list = kind; }
      html.push(`<li>${inline((ul ?? ol)![1]!)}</li>`);
    } else if (line.trim() === "") { flushPara(); closeList(); }
    else { closeList(); para.push(line.trim()); }
  }
  flushPara(); closeList();
  return html.join("\n");
}
