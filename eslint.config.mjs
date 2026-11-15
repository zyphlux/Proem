import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "out/**", "next-env.d.ts", "admin/web/dist/**"] },
  // The admin is a Vite app, not Next: Next-specific rules don't apply.
  { files: ["admin/**"], rules: { "@next/next/no-img-element": "off" } },
];

export default config;
