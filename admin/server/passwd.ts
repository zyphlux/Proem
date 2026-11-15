/**
 * pnpm admin:passwd — set or change the admin password.
 * Non-interactive: ADMIN_PASSWORD=... pnpm admin:passwd
 */
import readline from "node:readline";
import { setPassword } from "./auth";
import { paths } from "./config";

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WritableStream };
    let muted = false;
    out._writeToOutput = (s: string) => {
      if (!muted || s.includes(question)) out.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  let pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    pw = await ask("New admin password (min 12 characters): ");
    const again = await ask("Repeat: ");
    if (pw !== again) throw new Error("Passwords do not match.");
  }
  if (pw.length < 12) throw new Error("Use at least 12 characters.");
  await setPassword(pw);
  console.log(`✓ Password saved to ${paths.passwordFile}`);
}

main().catch((e) => {
  console.error(`✗ ${e.message}`);
  process.exit(1);
});
