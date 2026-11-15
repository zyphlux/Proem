/**
 * pnpm content:check — validates CONTENT_DIR without building the site.
 * Exits with code 1 when there is any error (warnings are informational).
 */
import { checkContent, contentDir, readContent } from "../src/content/load";

const dir = contentDir();
const { content, issues } = readContent(dir);
const all = content ? [...issues, ...checkContent(content)] : issues;
const errors = all.filter((i) => i.level === "error");
const warnings = all.filter((i) => i.level === "warning");

console.log(`Content: ${dir}`);
for (const i of errors) console.log(`  ✗ ${i.file}: ${i.message}`);
for (const i of warnings) console.log(`  ! ${i.file}: ${i.message}`);
if (content) {
  console.log(
    `  ${content.experience.length} experience · ${content.education.length} education · ` +
      `${content.projects.length} projects · ${content.publications.length} publications · ` +
      `${content.notes.length} notes · ${content.courses.length} courses · ${content.media.length} media`,
  );
}
console.log(errors.length ? `✗ ${errors.length} error(s), ${warnings.length} warning(s)` : `✓ valid (${warnings.length} warning(s))`);
process.exit(errors.length ? 1 : 0);
