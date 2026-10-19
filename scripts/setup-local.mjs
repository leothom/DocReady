import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env.local")) {
  console.log("Local settings already exist. They were not changed.");
} else {
  writeFileSync(".env.local", [
    "# Add your DeepSeek API key below. Do not paste it into chat.",
    "DEEPSEEK_API_KEY=",
    "DEEPSEEK_MODEL=deepseek-flash",
    "APP_ORIGIN=http://localhost:3100",
    "PILOT_INVITE_SECRET=" + randomBytes(32).toString("hex"),
    "SESSION_SECRET=" + randomBytes(32).toString("hex"),
    "PILOT_VERSION=1",
    "PILOT_ENABLED=true", ""
  ].join("\n"), {flag:"wx",mode:0o600});
  console.log("Created .env.local. Add DEEPSEEK_API_KEY in your editor.");
}
