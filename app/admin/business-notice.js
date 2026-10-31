"use client";
import { AlertTriangle, CheckCircle, Info, LoaderCircle } from "lucide-react";
import styles from "./business-feedback.module.css";
export default function BusinessNotice({ kind = "info", title, message, issues = [], children, id }) {
  const Icon = kind === "pending" ? LoaderCircle : kind === "success" ? CheckCircle : ["error", "warning"].includes(kind) ? AlertTriangle : Info;
  return <section id={id} tabIndex={id ? -1 : undefined} className={`${styles.notice} ${styles[kind] || ""}`} role={kind === "error" ? "alert" : "status"} aria-live={kind === "error" ? "assertive" : "polite"}>
    <h3><Icon size={17} aria-hidden="true" />{title}</h3>
    {message && <p>{message}</p>}
    {issues.length > 0 && <ul>{issues.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul>}
    {children}
  </section>;
}


export function focusBusinessNotice(id) {
  requestAnimationFrame(() => document.getElementById(id)?.focus());
}
