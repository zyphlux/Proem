/**
 * Built-in resume templates. Same format as custom templates (Mustache HTML + CSS),
 * so any of them can be duplicated and edited in the admin.
 */
export type Layout = "single" | "sidebar-left" | "sidebar-right";

export type ResumeTemplate = {
  id: string;
  name: string;
  description: string;
  layouts: Layout[];
  html: string;
  css: string;
  builtin: boolean;
};

const MAIN_SIDE = `
<div class="r-body">
  {{#hasSide}}<aside class="r-side">{{#side}}{{> section}}{{/side}}</aside>{{/hasSide}}
  <main class="r-main">{{#main}}{{> section}}{{/main}}</main>
</div>`;

const classic: ResumeTemplate = {
  id: "classic",
  name: "Classic",
  description: "One column, centred header, ruled section titles. Safe for any application.",
  layouts: ["single"],
  builtin: true,
  html: `
<header class="r-head">
  <h1 class="r-name">{{name}}</h1>
  {{#headline}}<p class="r-headline">{{headline}}</p>{{/headline}}
  {{> contact}}
</header>
${MAIN_SIDE}`,
  css: `
.r-tpl-classic .r-head { text-align: center; padding-bottom: calc(var(--r-gap) * 1.2); }
.r-tpl-classic .r-name { font-family: var(--r-head-font); font-size: 2.3em; font-weight: 700; letter-spacing: -.02em; line-height: 1.05; }
.r-tpl-classic .r-headline { margin-top: .3em; font-size: 1.08em; color: var(--r-muted); }
.r-tpl-classic .r-contact { display: flex; flex-wrap: wrap; justify-content: center; gap: .15em .9em; margin-top: .55em; font-size: .93em; color: var(--r-muted); }
.r-tpl-classic .r-contact a { color: var(--r-accent); }
.r-tpl-classic .r-section-title { font-size: .82em; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--r-accent); border-bottom: 1px solid var(--r-line); padding-bottom: .3em; }
`,
};

const modern: ResumeTemplate = {
  id: "modern",
  name: "Modern",
  description: "Tinted sidebar for contact, skills and education; main column for experience.",
  layouts: ["sidebar-left", "sidebar-right", "single"],
  builtin: true,
  html: `
<header class="r-head">
  <div>
    <h1 class="r-name">{{name}}</h1>
    {{#headline}}<p class="r-headline">{{headline}}</p>{{/headline}}
  </div>
  {{^hasSide}}{{> contact}}{{/hasSide}}
</header>
<div class="r-body">
  {{#hasSide}}<aside class="r-side"><section class="r-section r-section-contact"><h2 class="r-section-title">Contact</h2>{{> contact}}</section>{{#side}}{{> section}}{{/side}}</aside>{{/hasSide}}
  <main class="r-main">{{#main}}{{> section}}{{/main}}</main>
</div>`,
  css: `
.r-tpl-modern .r-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1.5em; padding-bottom: calc(var(--r-gap) * 1.2); margin-bottom: calc(var(--r-gap) * 1.4); border-bottom: 3px solid var(--r-accent); }
.r-tpl-modern .r-name { font-family: var(--r-head-font); font-size: 2.5em; font-weight: 750; letter-spacing: -.03em; line-height: 1; }
.r-tpl-modern .r-headline { margin-top: .35em; font-size: 1.1em; color: var(--r-accent); font-weight: 550; }
.r-tpl-modern .r-head .r-contact { text-align: right; font-size: .92em; color: var(--r-muted); }
.r-tpl-modern .r-body { display: grid; gap: 1.6em; }
.r-tpl-modern.r-layout-sidebar-left .r-body { grid-template-columns: 31% 1fr; }
.r-tpl-modern.r-layout-sidebar-right .r-body { grid-template-columns: 1fr 31%; }
.r-tpl-modern.r-layout-sidebar-right .r-side { order: 2; }
.r-tpl-modern .r-side { background: color-mix(in srgb, var(--r-accent) 7%, #fff); border-radius: 6px; padding: 1em; font-size: .94em; align-self: start; }
.r-tpl-modern .r-side .r-contact li { margin-top: .3em; overflow-wrap: anywhere; }
.r-tpl-modern .r-side .r-entry-head { display: block; }
.r-tpl-modern .r-section-title { font-size: .8em; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; color: var(--r-accent); }
.r-tpl-modern .r-main .r-section-title { display: flex; align-items: center; gap: .6em; }
.r-tpl-modern .r-main .r-section-title::after { content: ""; flex: 1; height: 1px; background: var(--r-line); }
@media screen and (max-width: 640px) {
  .r-tpl-modern .r-body { grid-template-columns: 1fr !important; }
  .r-tpl-modern .r-head { display: block; }
}
`,
};

const academic: ResumeTemplate = {
  id: "academic",
  name: "Academic CV",
  description: "Serif typography, publications with full author lists. For research and graduate applications.",
  layouts: ["single"],
  builtin: true,
  html: `
<header class="r-head">
  <div>
    <h1 class="r-name">{{name}}</h1>
    {{#headline}}<p class="r-headline">{{headline}}</p>{{/headline}}
  </div>
  {{> contact}}
</header>
${MAIN_SIDE}`,
  css: `
.r-tpl-academic { --r-head-font: var(--r-serif); }
.r-tpl-academic .r-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 2em; padding-bottom: var(--r-gap); border-bottom: 1.5px solid var(--r-text); }
.r-tpl-academic .r-name { font-family: var(--r-serif); font-size: 2.2em; font-weight: 600; line-height: 1.05; }
.r-tpl-academic .r-headline { margin-top: .3em; font-style: italic; color: var(--r-muted); }
.r-tpl-academic .r-contact { text-align: right; font-size: .92em; line-height: 1.5; }
.r-tpl-academic .r-contact a { color: var(--r-accent); }
.r-tpl-academic .r-section { display: grid; grid-template-columns: 7.5em 1fr; column-gap: 1.2em; margin-top: calc(var(--r-gap) * 1.8); }
.r-tpl-academic .r-section-title { font-family: var(--r-serif); font-variant: small-caps; letter-spacing: .04em; font-size: 1.05em; font-weight: 600; color: var(--r-accent); grid-column: 1; }
.r-tpl-academic .r-section > :not(.r-section-title) { grid-column: 2; }
.r-tpl-academic .r-entry:first-child { margin-top: 0; }
.r-tpl-academic .r-section-publications .r-entries { counter-reset: pub; }
.r-tpl-academic .r-section-publications .r-entry { counter-increment: pub; padding-left: 2em; position: relative; }
.r-tpl-academic .r-section-publications .r-entry::before { content: "[" counter(pub) "]"; position: absolute; left: 0; color: var(--r-muted); font-variant-numeric: tabular-nums; }
.r-tpl-academic .r-section-publications .r-entry-title { font-weight: 600; font-style: normal; }
@media screen and (max-width: 640px) {
  .r-tpl-academic .r-section { display: block; }
  .r-tpl-academic .r-head { display: block; }
  .r-tpl-academic .r-contact { text-align: left; margin-top: .6em; }
}
`,
};

const compact: ResumeTemplate = {
  id: "compact",
  name: "Compact",
  description: "Dense one-pager: small margins, inline dates, two-column skills.",
  layouts: ["single", "sidebar-right"],
  builtin: true,
  html: `
<header class="r-head">
  <h1 class="r-name">{{name}}{{#headline}}<span class="r-headline"> — {{headline}}</span>{{/headline}}</h1>
  {{> contact}}
</header>
${MAIN_SIDE}`,
  css: `
.r-tpl-compact { line-height: 1.32; }
.r-tpl-compact .r-head { padding-bottom: calc(var(--r-gap) * .8); border-bottom: 2px solid var(--r-accent); }
.r-tpl-compact .r-name { font-family: var(--r-head-font); font-size: 1.75em; font-weight: 750; letter-spacing: -.02em; }
.r-tpl-compact .r-headline { font-weight: 450; color: var(--r-muted); font-size: .62em; letter-spacing: 0; }
.r-tpl-compact .r-contact { display: flex; flex-wrap: wrap; gap: .1em .8em; margin-top: .3em; font-size: .9em; color: var(--r-muted); }
.r-tpl-compact .r-contact li + li::before { content: "·"; margin-right: .8em; }
.r-tpl-compact .r-section { margin-top: calc(var(--r-gap) * 1.2); }
.r-tpl-compact .r-section-title { font-size: .78em; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; color: var(--r-accent); }
.r-tpl-compact .r-entry { margin-top: calc(var(--r-gap) * .7); }
.r-tpl-compact .r-entry-sub { display: inline; }
.r-tpl-compact .r-groups { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 1.2em; }
.r-tpl-compact .r-group { display: flex; gap: .4em; }
.r-tpl-compact.r-layout-sidebar-right .r-body { display: grid; grid-template-columns: 1fr 28%; gap: 1.4em; }
.r-tpl-compact.r-layout-sidebar-right .r-side { order: 2; }
.r-tpl-compact.r-layout-sidebar-right .r-side .r-groups { grid-template-columns: 1fr; }
@media screen and (max-width: 640px) {
  .r-tpl-compact .r-body { display: block !important; }
  .r-tpl-compact .r-groups { grid-template-columns: 1fr; }
}
`,
};

export const BUILTIN_TEMPLATES: ResumeTemplate[] = [classic, modern, academic, compact];
