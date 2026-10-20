"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import LanguageSwitch from "./language-switch";
import {BrandMark} from "./brand-mark";
import { useLocale } from "../lib/i18n/provider";

type Invite = { id: string; name: string; email?: string; expiresAt: number; dailyLimit: number; generation: number; revoked: boolean; createdAt: number };
const inviteLabel = (invite: Invite) => invite.email ?? invite.name;
type Counts = { schoolRequests?: number; personalRequests?: number; schoolCostUsd?: number; personalCostUsd?: number; requests: number; successfulRequests: number; failedRequests: number; pendingRequests: number; slides: number; reviews: number; completedReviews: number; partialReviews: number; inputTokens: number; outputTokens: number; cachedInputTokens: number; costUsd: number; unknownUsageRequests: number; unknownCostRequests: number };
type Activity = Counts & { date: string };
type Usage = { daily: Activity[]; perInvite: (Counts & { inviteId: string; name: string; firstUse?: number | null; lastUse?: number | null })[]; totals: Counts };
const emptyCounts: Counts = { schoolRequests:0, personalRequests:0, schoolCostUsd:0, personalCostUsd:0, requests: 0, successfulRequests: 0, failedRequests: 0, pendingRequests: 0, slides: 0, reviews: 0, completedReviews: 0, partialReviews: 0, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, costUsd: 0, unknownUsageRequests: 0, unknownCostRequests: 0 };

function dateInput(time: number) {
  const date = new Date(time);
  return new Date(time - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function weekly(rows: Activity[]) {
  const groups = new Map<string, Activity>();
  for (const row of rows) {
    const date = new Date(`${row.date}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const key = date.toISOString().slice(0, 10);
    const target = groups.get(key) ?? { ...emptyCounts, date: key };
    for (const field of Object.keys(emptyCounts) as (keyof Counts)[]) target[field] = (target[field] ?? 0) + (row[field] ?? 0);
    groups.set(key, target);
  }
  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export default function AdminPanel() {
  const { locale } = useLocale();
  const t = (en: string, zh: string) => locale === "zh-Hans" ? zh : en;
  const [session, setSession] = useState<"checking" | "signedOut" | "signedIn">("checking");
  const [now, setNow] = useState(0);
  const [password, setPassword] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [today, setToday] = useState<Usage | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [days, setDays] = useState(30);
  const [period, setPeriod] = useState("daily");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<Invite | "new" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [expires, setExpires] = useState("");
  const [limit, setLimit] = useState(20);
  const requestEpoch = useRef(0);
  const linkInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (link) linkInput.current?.focus(); }, [link]);

  function clearSession() {
    requestEpoch.current++;
    setSession("signedOut"); setPassword(""); setInvites([]); setUsage(null); setToday(null);
    setLink(""); setSelected(""); setEditing(null); setName(""); setEmail(""); setEmailSaved(false);
  }
  async function request<T>(path: string, body?: object, signal?: AbortSignal): Promise<T> {
    const response = await fetch(`/api/admin/${path}`, {
      method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store", signal,
      ...(body === undefined ? {} : { headers: { "content-type": "application/json", "x-docready-admin": "1" }, body: JSON.stringify(body) }),
    });
    if (response.status === 401) clearSession();
    if (!response.ok) throw new Error("admin_request_failed");
    return response.json() as Promise<T>;
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) { setSession(response.ok ? "signedIn" : "signedOut"); if (!response.ok && response.status !== 401) setError(true); } })
      .catch(() => { if (!controller.signal.aborted) { setSession("signedOut"); setError(true); } });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (session !== "signedIn") return;
    const controller = new AbortController();
    const epoch = requestEpoch.current;
    // Keep all private responses tied to the current session and selected range.
    Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setLoading(true); setUsage(null); setError(false); setNow(Date.now());
      try {
        const [list, report, day] = await Promise.all([
          request<{ invites: Invite[] }>("invites", undefined, controller.signal),
          request<Usage>(`usage?days=${days}${selected ? `&inviteId=${encodeURIComponent(selected)}` : ""}`, undefined, controller.signal),
          request<Usage>("usage?days=1", undefined, controller.signal),
        ]);
        if (!controller.signal.aborted && epoch === requestEpoch.current) { setInvites(list.invites); setUsage(report); setToday(day); }
      } catch { if (!controller.signal.aborted && epoch === requestEpoch.current) setError(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    });
    return () => controller.abort();
    // request uses no changing state. Only these values change the requested report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, selected, days, refresh]);

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(false); setLink("");
    try { await request("login", { password }); setPassword(""); setSession("signedIn"); }
    catch { setError(true); setPassword(""); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError(false); setLink("");
    try { await request("logout", {}); clearSession(); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  function edit(invite: Invite | "new") {
    setLink(""); setCopied(false); setEditing(invite);
    setName(invite === "new" ? "" : invite.name);
    setExpires(dateInput(invite === "new" ? Date.now() + 90 * 86400000 : invite.expiresAt));
    setLimit(invite === "new" ? 20 : invite.dailyLimit);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!editing) return;
    setBusy(true); setError(false); setLink("");
    try {
      const result = await request<{ link?: string }>(editing === "new" ? "invites" : `invites/${encodeURIComponent(editing.id)}/update`, { name: name.trim(), expiresAt: new Date(expires).getTime(), dailyLimit: limit });
      setEditing(null); setName(""); setLink(result.link ?? ""); setCopied(false); setRefresh(value => value + 1);
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  async function approveEmail(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(false); setEmailSaved(false); setLink("");
    try {
      await request<{ invite: Invite }>("emails", { email: email.trim() });
      setEmail(""); setEmailSaved(true); setRefresh(value => value + 1);
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  async function change(invite: Invite, action: "revoke" | "restore" | "rotate" | "delete") {
    const label = inviteLabel(invite);
    const question = action === "delete" ? t(`Delete ${label} and their activity history? This cannot be undone.`, `删除 ${label} 及其活动记录？此操作无法撤销。`) : action === "rotate" ? t(`Replace the link for ${label}? The old link and sessions will stop working.`, `替换 ${label} 的链接？旧链接和会话将失效。`) : action === "restore" ? t(`Restore access for ${label}? The expiry and request limits will stay the same.`, `恢复 ${label} 的访问权限？有效期和请求限额保持不变。`) : t(`Revoke access for ${label}? Requests already sent may still finish.`, `撤销 ${label} 的访问权限？已发送的请求仍可能完成。`);
    if (!window.confirm(question)) return;
    setBusy(true); setError(false); setLink("");
    try {
      const result = await request<{ link?: string }>(`invites/${encodeURIComponent(invite.id)}/${action}`, {});
      if (action === "delete") { setSelected(""); setEditing(null); }
      setLink(result.link ?? ""); setCopied(false); setRefresh(value => value + 1);
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  const selectedInvite = invites.find(invite => invite.id === selected);
  const date = (value?: number | null) => value ? new Date(value).toLocaleString(locale === "zh-Hans" ? "zh-CN" : "en-GB", { timeZone: "Asia/Hong_Kong", dateStyle: "medium", timeStyle: "short" }) : t("Never", "从未");
  const cost = (value: number) => `¥${((value ?? 0) * 7).toFixed(4)}`;
  const rows = usage ? (period === "weekly" ? weekly(usage.daily) : [...usage.daily].sort((a, b) => b.date.localeCompare(a.date))) : [];

  return <main className="admin-page">
    <header><Link className="brand" href="/"><BrandMark />DocReady</Link><div className="admin-header-actions"><LanguageSwitch />{session === "signedIn" && <button className="secondary" disabled={busy} onClick={logout}>{t("Sign out", "退出登录")}</button>}</div></header>
    <h1>{t("Teacher invites", "教师邀请")}</h1>
    {error && <p role="alert" className="status error-text">{t("The request failed. Check your details and try again.", "请求失败。请检查信息后重试。")}</p>}
    {session === "checking" && <p role="status">{t("Checking access…", "正在检查访问权限…")}</p>}
    {session === "signedOut" && <form className="admin-login" onSubmit={login}><h2>{t("Owner sign in", "管理员登录")}</h2><label htmlFor="admin-password">{t("Password", "密码")}</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /><button disabled={busy}>{busy ? t("Signing in…", "正在登录…") : t("Sign in", "登录")}</button></form>}
    {session === "signedIn" && <>
      <p>{t("Activity belongs to an email profile or an invite code. An entered email does not verify the person's identity or ownership of the address. A shared link does not identify its user.", "活动记录对应邮箱资料或邀请码。输入邮箱不能验证使用者身份或邮箱归属。共享链接也不能确认实际使用者。")}</p>
      <dl className="admin-summary"><div><dt>{t("Active invites", "有效邀请")}</dt><dd>{invites.filter(invite => !invite.revoked && invite.expiresAt > now).length}</dd></div><div><dt>{t("Requests today", "今日请求数")}</dt><dd>{today?.totals.requests ?? "—"}</dd></div><div><dt>{t("Estimated cost today", "今日估算费用")}</dt><dd>{today ? cost(today.totals.costUsd) : "—"}</dd></div></dl>
      <p className="small">{t("Dates use Hong Kong time. Known cost only; unknown-cost requests today:", "日期按香港时间计算。费用仅包含已知部分；今日费用未知的请求数：")} {today?.totals.unknownCostRequests ?? "—"}</p>
      {link && <section className="status" aria-label={t("New invite link", "新邀请链接")}><h2>{t("Copy this link now", "现在复制链接")}</h2><p>{t("This link is shown only once. Share it privately. Copying does not send a message.", "此链接仅显示一次。请私下分享。复制不会发送消息。")}</p><label className="sr-only" htmlFor="new-invite-link">{t("Invite link", "邀请链接")}</label><input ref={linkInput} id="new-invite-link" readOnly value={link} /><div className="actions"><button onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { linkInput.current?.select(); setCopied(false); } }}>{copied ? t("Copied", "已复制") : t("Copy link", "复制链接")}</button><button className="secondary" onClick={() => { setLink(""); setCopied(false); }}>{t("Dismiss link", "关闭链接")}</button></div></section>}
      <div className="actions"><button disabled={busy} onClick={() => edit("new")}>{t("Create invite", "创建邀请")}</button><button disabled={busy || loading} className="secondary" onClick={() => setRefresh(value => value + 1)}>{t("Refresh", "刷新")}</button></div>
      <section className="admin-email-approval"><h2>{t("Approve a school email", "批准学校邮箱")}</h2><form onSubmit={approveEmail}><label htmlFor="approved-email">{t("School email", "学校邮箱")}</label><div className="admin-email-row"><input id="approved-email" name="email" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} disabled={busy} onChange={event => { setEmail(event.target.value); setEmailSaved(false); }} /><button disabled={busy}>{t("Approve email", "批准邮箱")}</button></div><p className="small">{t("Use an exact sendelta.com address. New profiles start with 90 days and 20 requests per day. Existing limits and history are kept. No email is sent.", "请使用完整的 sendelta.com 邮箱。新资料的有效期为90天，每日20次请求。现有资料的限额和记录会保留。不会发送邮件。")}</p></form>{emailSaved && <p role="status">{t("Email approval saved. Check its status below. Use Restore access for a revoked profile, or Edit invite to change an expired date.", "邮箱批准已保存。请在下方检查状态。已撤销的资料可使用“恢复访问权限”；已到期的资料可通过“编辑邀请”修改到期时间。")}</p>}</section>
      {editing && <section className="admin-editor"><h2>{editing === "new" ? t("New teacher invite", "新教师邀请") : t("Edit invite", "编辑邀请")}</h2><form onSubmit={save}><label htmlFor="invite-name">{t("Teacher name", "教师姓名")}</label><input id="invite-name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} autoFocus /><details open={editing !== "new"}><summary>{t("Expiry and daily limit", "有效期与每日限额")}</summary><div className="admin-form-grid"><label htmlFor="invite-expiry">{t("Expires (your local time)", "到期时间（您的本地时间）")}<input id="invite-expiry" type="datetime-local" required value={expires} onChange={event => setExpires(event.target.value)} /></label><label htmlFor="invite-limit">{t("School requests per day", "每日学校账户请求数")}<input id="invite-limit" type="number" min={1} max={10000} required value={limit} onChange={event => setLimit(Number(event.target.value))} /></label></div></details><p className="small">{t("Default: 90 days and 20 requests per day. One review can use several requests and retries. This is not a presentation limit or a fixed RMB spending cap.", "默认有效期为90天，每日20次请求。一次审阅可能包含多个请求及重试。这不是演示文稿数量限制，也不是固定人民币消费上限。")}</p><div className="actions"><button disabled={busy}>{busy ? t("Saving…", "正在保存…") : t("Save invite", "保存邀请")}</button><button type="button" className="secondary" disabled={busy} onClick={() => { setEditing(null); setName(""); }}>{t("Cancel", "取消")}</button></div></form></section>}
      <section aria-busy={loading}><div className="admin-section-heading"><h2>{selectedInvite ? inviteLabel(selectedInvite) : t("All invites", "全部邀请")}</h2><label>{t("Date range", "日期范围")}<select value={days} onChange={event => setDays(Number(event.target.value))}>{[7,30,90,365].map(value => <option key={value} value={value}>{value} {t("days", "天")}</option>)}</select></label></div>
        <p className="small admin-scroll-hint">{t("Scroll the tables sideways to see all columns.", "横向滚动表格可查看所有列。")}</p>
        {loading && <p role="status">{t("Loading activity…", "正在加载活动…")}</p>}
        {selectedInvite ? <><button className="secondary" onClick={() => setSelected("")}>{t("Back to all invites", "返回全部邀请")}</button><div className="actions"><button className="secondary" disabled={busy} onClick={() => edit(selectedInvite)}>{t("Edit invite", "编辑邀请")}</button><button className="secondary" disabled={busy} onClick={() => change(selectedInvite, selectedInvite.revoked ? "restore" : "revoke")}>{selectedInvite.revoked ? t("Restore access", "恢复访问权限") : t("Revoke access", "撤销访问权限")}</button><button className="secondary" disabled={busy} onClick={() => change(selectedInvite, "rotate")}>{t("Replace link", "替换链接")}</button><button className="secondary admin-danger" disabled={busy} onClick={() => change(selectedInvite, "delete")}>{t("Delete invite and history", "删除邀请与记录")}</button></div></> : <div className="admin-table-wrap" tabIndex={0} role="region" aria-label={t("Invite activity table", "邀请活动表格")}><table><thead><tr>{[t("Name", "姓名"),t("Status / expiry", "状态 / 到期时间"),t("First / last review", "首次 / 最近审阅"),t("Reviews started", "开始审阅次数"),t("Slides reviewed", "已审阅幻灯片"),t("Requests", "请求数")].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{invites.map(invite => { const count = usage?.perInvite.find(row => row.inviteId === invite.id); return <tr key={invite.id}><th scope="row"><button className="admin-name" onClick={() => setSelected(invite.id)}>{inviteLabel(invite)}</button><span className="small">{invite.dailyLimit} {t("school requests/day", "次学校账户请求/天")}</span></th><td>{invite.revoked ? t("Revoked", "已撤销") : invite.expiresAt <= now ? t("Expired", "已到期") : t("Active", "有效")}<span className="small">{date(invite.expiresAt)}</span></td><td><span>{usage ? date(count?.firstUse) : "—"}</span><span className="small">{usage ? date(count?.lastUse) : "—"}</span></td><td>{usage ? count?.reviews ?? 0 : "—"}</td><td>{usage ? count?.slides ?? 0 : "—"}</td><td>{usage ? count?.requests ?? 0 : "—"}</td></tr>; })}</tbody></table>{!loading && !invites.length && <p className="admin-empty">{t("No invites yet. Create an invite to give a teacher access.", "暂无邀请。创建邀请以授予教师访问权限。")}</p>}</div>}
        {usage && <><h3 className="admin-report-title">{t("Activity in this date range", "所选日期范围内的活动")}</h3><dl className="admin-metrics">{[[t("Requests", "请求数"),usage.totals.requests],[t("School requests", "学校账户请求"),usage.totals.schoolRequests??0],[t("Personal requests", "个人账户请求"),usage.totals.personalRequests??0],[t("Older requests: payer not classified", "旧请求：付款方未分类"),usage.totals.requests-(usage.totals.schoolRequests??0)-(usage.totals.personalRequests??0)],[t("Known school cost", "已知学校费用"),cost(usage.totals.schoolCostUsd??0)],[t("Known personal cost", "已知个人费用"),cost(usage.totals.personalCostUsd??0)],[t("Failed requests", "失败请求"),usage.totals.failedRequests],[t("In flight / unknown outcome", "处理中 / 结果未知"),usage.totals.pendingRequests],[t("Reviews started", "开始审阅次数"),usage.totals.reviews],[t("Reviews completed", "已完成审阅"),usage.totals.completedReviews],[t("Partial reviews", "部分完成审阅"),usage.totals.partialReviews],[t("Slides reviewed", "已审阅幻灯片"),usage.totals.slides],[t("Estimated known cost", "已知估算费用"),cost(usage.totals.costUsd)],[t("Unknown-cost requests", "费用未知请求"),usage.totals.unknownCostRequests],[t("Input tokens", "输入词元"),usage.totals.inputTokens],[t("Cached input tokens", "缓存输入词元"),usage.totals.cachedInputTokens],[t("Output tokens", "输出词元"),usage.totals.outputTokens],[t("Unknown token usage requests", "词元用量未知请求"),usage.totals.unknownUsageRequests]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><label className="admin-period">{t("Group activity", "活动分组")}<select value={period} onChange={event => setPeriod(event.target.value)}><option value="daily">{t("Daily", "每日")}</option><option value="weekly">{t("Weekly (Monday start)", "每周（周一开始）")}</option></select></label><div className="admin-table-wrap" tabIndex={0} role="region" aria-label={t("Activity by date", "按日期显示活动")}><table><thead><tr>{[period === "weekly" ? t("Week starting", "周开始日期") : t("Date", "日期"),t("Reviews started", "开始审阅次数"),t("Reviews completed", "已完成审阅"),t("Slides", "幻灯片"),t("Requests", "请求数"),t("School requests", "学校账户请求"),t("Personal requests", "个人账户请求"),t("Failed", "失败"),t("Pending / unknown", "处理中 / 未知"),t("Known cost", "已知费用"),t("Unknown cost", "费用未知请求")].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.date}><th scope="row">{row.date}</th><td>{row.reviews}</td><td>{row.completedReviews}</td><td>{row.slides}</td><td>{row.requests}</td><td>{row.schoolRequests??0}</td><td>{row.personalRequests??0}</td><td>{row.failedRequests}</td><td>{row.pendingRequests}</td><td>{cost(row.costUsd)}</td><td>{row.unknownCostRequests}</td></tr>)}</tbody></table>{!rows.length && <p className="admin-empty">{t("No activity in this date range.", "此日期范围内暂无活动。")}</p>}</div></>}
      </section>
      <footer><p>{t("Daily limits apply only to school-funded requests. Personal keys keep server protection limits. Older records have no payer classification; their cost remains in the total only. Planning exchange rate: USD 1 = RMB 7. Missing usage is unknown, not zero. Request limits do not guarantee a fixed spending cap.", "每日限额仅适用于学校付费请求。个人密钥仍受服务器保护限制。旧记录未区分付款方，费用仅计入总额。预算汇率：1美元 = 7元人民币。缺失的用量为未知，而非零。请求限额不能保证固定消费上限。")}</p><p>{t("Daily totals are kept for 365 days. Recent request records are kept for 30 days. Email approvals, names and invite records remain until removed or deleted. These counts show activity, not teaching quality.", "每日汇总保留365天，最近请求记录保留30天。邮箱批准、姓名和邀请记录保留至移除或删除为止。这些数据反映活动情况，不代表教学质量。")}</p></footer>
    </>}
  </main>;
}


