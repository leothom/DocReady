"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale } from "../lib/i18n/provider";

type AccessError = "invalid" | "unapproved" | "limited" | "unavailable" | "network";

export default function EmailAccessForm({ onReady }: { onReady: () => void }) {
  const { locale } = useLocale();
  const t = (en: string, zh: string) => locale === "zh-Hans" ? zh : en;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AccessError | null>(null);
  const mounted = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; activeRequest.current?.abort(); };
  }, []);

  async function start(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const address = email.trim();
    if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { setError("invalid"); return; }
    setBusy(true); setError(null);
    const controller = new AbortController();
    activeRequest.current = controller;
    const deadline = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("/api/access", {
        method: "POST", cache: "no-store", credentials: "same-origin", signal: controller.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: address }),
      });
      if (!mounted.current) return;
      if (response.ok) { setEmail(""); onReady(); return; }
      setError(response.status === 400 ? "invalid" : response.status === 403 ? "unapproved" : response.status === 429 ? "limited" : "unavailable");
    } catch { if (mounted.current) setError("network"); }
    finally { clearTimeout(deadline); activeRequest.current = null; if (mounted.current) setBusy(false); }
  }

  return <form className="email-access-form" onSubmit={start} noValidate aria-busy={busy}>
    <label htmlFor="school-email">{t("School email", "学校邮箱")}</label>
    <input id="school-email" name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} disabled={busy}
      aria-invalid={error === "invalid" || error === "unapproved" ? true : undefined} aria-describedby={`email-usage${error ? " email-access-error" : ""}`}
      onChange={event => { setEmail(event.target.value); setError(null); }} />
    <p id="email-usage" className="small">{t("Your email and usage totals are recorded. Slide text and suggestions are not saved by DocReady.", "您的邮箱和使用总量会被记录。DocReady 不保存幻灯片文本或建议。")}</p>
    {error && <p id="email-access-error" className="error-text" role="alert">{
      error === "unapproved" ? <>{t("For access, email ", "如需访问权限，请发送邮件至 ")}<a href="mailto:Leo@sendelta.com">Leo@sendelta.com</a>{t(".", "。")}</> :
      error === "invalid" ? t("Enter a valid email address.", "请输入有效的邮箱地址。") :
      error === "limited" ? t("Too many attempts. Wait a moment and try again.", "尝试次数过多。请稍后重试。") :
      error === "network" ? t("Could not connect. Try again.", "无法连接。请重试。") : t("Access is not available now. Try again later.", "暂时无法访问。请稍后重试。")
    }</p>}
    <button disabled={busy}>{busy ? t("Checking access…", "正在检查访问权限…") : t("Start reviewing", "开始审阅")}</button>
  </form>;
}
