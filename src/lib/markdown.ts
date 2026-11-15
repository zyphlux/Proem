import GithubSlugger from "github-slugger";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/**
 * Markdown → HTML for notes and project stories (GitHub-flavoured, heading ids,
 * code highlighted for both themes).
 *
 * remark-rehype drops raw HTML by default, so content cannot inject markup or scripts.
 */
export async function markdownToHTML(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypePrettyCode, {
      theme: { light: "github-light", dark: "github-dark" },
      keepBackground: false,
    })
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}

export type TocItem = { id: string; text: string };

/** Level-2 headings with the same ids rehype-slug produces. */
export function tableOfContents(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (/^(```|~~~)/.test(line.trim())) inFence = !inFence;
    if (inFence) continue;
    const h = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!h) continue;
    const text = h[2].replace(/[*_`]/g, "");
    const id = slugger.slug(text);
    if (h[1].length === 2) items.push({ id, text });
  }
  return items;
}
