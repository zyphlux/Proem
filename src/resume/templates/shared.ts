/**
 * Building blocks shared by every resume template (built-in and custom).
 *
 * Template contract (also documented in docs/resume-templates.md):
 * - template.html is a Mustache template. Values are HTML-escaped.
 * - Partials: {{> section}} renders any section; {{> contact}} renders the contact items.
 * - The renderer wraps the output in <div class="resume r-tpl-ID r-layout-… r-density-… r-font-…">.
 * - CSS should target .resume and descendants. Scripts, external resources (url(),
 *   @import) and unsafe tags/attributes are removed.
 */

export const SECTION_PARTIAL = `
<section class="r-section r-section-{{type}}">
  {{#title}}<h2 class="r-section-title">{{title}}</h2>{{/title}}
  {{#hasBlocks}}<div class="r-blocks">{{#blocks}}{{#isList}}<ul class="r-bullets">{{#items}}<li>{{.}}</li>{{/items}}</ul>{{/isList}}{{^isList}}<p class="r-text">{{text}}</p>{{/isList}}{{/blocks}}</div>{{/hasBlocks}}
  {{#hasEntries}}
  <div class="r-entries">
    {{#entries}}
    <article class="r-entry">
      <header class="r-entry-head">
        <h3 class="r-entry-title">{{#url}}<a href="{{url}}">{{/url}}{{title}}{{#url}}</a>{{/url}}</h3>
        {{#date}}<p class="r-entry-date">{{date}}</p>{{/date}}
      </header>
      {{#hasAuthors}}<p class="r-authors">{{#authors}}{{#self}}<strong>{{name}}</strong>{{/self}}{{^self}}{{name}}{{/self}}{{^last}}, {{/last}}{{/authors}}</p>{{/hasAuthors}}
      {{#subtitle}}<p class="r-entry-sub">{{subtitle}}{{#location}}<span class="r-entry-loc"> · {{location}}</span>{{/location}}</p>{{/subtitle}}
      {{#meta}}<p class="r-entry-meta">{{meta}}</p>{{/meta}}
      {{#hasBullets}}<ul class="r-bullets">{{#bullets}}<li>{{.}}</li>{{/bullets}}</ul>{{/hasBullets}}
      {{#tech}}<p class="r-entry-tech">{{tech}}</p>{{/tech}}
    </article>
    {{/entries}}
  </div>
  {{/hasEntries}}
  {{#hasGroups}}
  <dl class="r-groups">{{#groups}}<div class="r-group"><dt>{{label}}</dt><dd>{{itemsText}}</dd></div>{{/groups}}</dl>
  {{/hasGroups}}
</section>`;

export const CONTACT_PARTIAL = `<ul class="r-contact">{{#contact}}<li class="r-contact-{{kind}}">{{#url}}<a href="{{url}}">{{/url}}{{text}}{{#url}}</a>{{/url}}</li>{{/contact}}</ul>`;

/** Base styles applied before every template's CSS. Variables come from the document's style. */
export const BASE_CSS = `
.resume {
  box-sizing: border-box;
  --r-text: #1b1f24;
  --r-muted: #59626f;
  --r-line: #d5d9df;
  --r-paper: #ffffff;
  font-family: var(--r-font);
  font-size: var(--r-size);
  line-height: 1.42;
  color: var(--r-text);
  background: var(--r-paper);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}
.resume *, .resume *::before, .resume *::after { box-sizing: border-box; margin: 0; padding: 0; }
.resume a { color: inherit; text-decoration: none; }
.resume strong { font-weight: 650; }
.resume ul { list-style: none; }
.resume .r-bullets li { position: relative; padding-left: 1em; margin-top: .18em; }
.resume .r-bullets li::before { content: ""; position: absolute; left: .2em; top: .62em; width: .32em; height: .32em; border-radius: 50%; background: var(--r-accent); }
.resume .r-section { margin-top: calc(var(--r-gap) * 1.6); }
.resume .r-section:first-child { margin-top: 0; }
.resume .r-section-title { break-after: avoid; }
.resume .r-entry { break-inside: avoid; margin-top: var(--r-gap); }
.resume .r-entry:first-child { margin-top: calc(var(--r-gap) * .6); }
.resume .r-entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: 1em; }
.resume .r-entry-title { font-size: 1.04em; font-weight: 650; }
.resume .r-entry-date { white-space: nowrap; color: var(--r-muted); font-size: .92em; font-variant-numeric: tabular-nums; }
.resume .r-entry-sub, .resume .r-entry-meta, .resume .r-authors, .resume .r-entry-tech { color: var(--r-muted); }
.resume .r-entry-tech { font-size: .9em; margin-top: .2em; }
.resume .r-authors strong { color: var(--r-text); }
.resume .r-text + .r-text { margin-top: .5em; }
.resume .r-groups { display: grid; gap: .35em; }
.resume .r-group dt { font-weight: 650; }
.resume .r-group dd { color: var(--r-muted); }

@media screen {
  .resume { width: 100%; max-width: var(--r-page-width); margin-inline: auto; padding: var(--r-margin); }
}
@media screen and (max-width: 640px) {
  .resume { padding: 6vw; }
}
@media print {
  .resume { padding: 0; max-width: none; }
}
`;
