/** Resolve + render a resume document (shared by the build, the admin preview and PDF export). */
import type { Content } from "../content/load";
import type { ResumeDocument } from "../content/schema";
import { resolveResume } from "./model";
import { findTemplate, renderResume, standaloneDocument, type Rendered } from "./render";
import type { ResumeTemplate } from "./templates/builtin";

export type BuiltResume = { rendered: Rendered; template: ResumeTemplate; title: string; lang: string; doc: ResumeDocument };

export function buildResume(c: Content, doc: ResumeDocument, opts: { includeHidden?: boolean; templateOverride?: ResumeTemplate } = {}): BuiltResume {
  const template = opts.templateOverride ?? findTemplate(doc.template, c.resumeTemplates);
  if (!template) throw new Error(`Unknown resume template "${doc.template}"`);
  const view = resolveResume(c, doc, template, opts);
  return { rendered: renderResume(view, template, doc.style), template, title: `${view.name} — Resume`, lang: view.lang, doc };
}

export function toDocument(b: BuiltResume, fontCss: string): string {
  return standaloneDocument(b.rendered, { title: b.title, lang: b.lang, style: b.doc.style, fontCss });
}

export function defaultDownloadName(c: Content, doc: ResumeDocument): string {
  return doc.downloadName ?? `${c.profile.name.replace(/[^\w-]+/g, "-")}-Resume.pdf`;
}
