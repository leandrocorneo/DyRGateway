"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";

export const inputClass = "control";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Button({ variant = "primary", icon, className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; icon?: ReactNode }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{icon}{children}</button>;
}

export function IconButton({ label, children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button className={`icon-button ${className}`} title={label} aria-label={label} {...props}>{children}</button>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint ? <span className="field-hint">{hint}</span> : null}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${props.className || ""}`} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${inputClass} ${props.className || ""}`} {...props} />;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="toggle-row"><button type="button" role="switch" aria-checked={checked} className={`toggle ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)}><span /></button><span>{label}</span></label>;
}

export function Badge({ active, children }: { active: boolean; children?: ReactNode }) {
  return <span className={`badge ${active ? "badge-success" : "badge-neutral"}`}><span className="badge-dot" />{children ?? (active ? "Ativo" : "Inativo")}</span>;
}

export function Feedback({ message, error }: { message?: string; error?: string }) {
  if (!message && !error) return null;
  const isError = Boolean(error);
  return <div className={`feedback ${isError ? "feedback-error" : "feedback-success"}`}>{isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}<span>{error || message}</span></div>;
}

export function EmptyState({ loading, text }: { loading?: boolean; text: string }) {
  return <div className="empty-state">{loading ? <LoaderCircle className="animate-spin" size={24} /> : <span className="empty-mark">0</span>}<p>{loading ? "Carregando dados..." : text}</p></div>;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
