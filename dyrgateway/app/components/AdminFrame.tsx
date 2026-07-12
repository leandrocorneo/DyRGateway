"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useState } from "react";
import { Activity, AppWindow, ChevronRight, CircleUserRound, Gauge, Globe2, LogOut, Menu, Moon, Network, ServerCog, Sun, UserPlus, X } from "lucide-react";
import { api } from "@/lib/apiClient";

const navGroups = [
  { label: "Visao geral", items: [{ href: "/", label: "Dashboard", icon: Gauge }, { href: "/health", label: "Saude do sistema", icon: Activity }] },
  { label: "Roteamento", items: [{ href: "/applications", label: "Aplicacoes", icon: AppWindow }, { href: "/domains", label: "Dominios", icon: Globe2 }, { href: "/services", label: "Servicos", icon: ServerCog }, { href: "/gateway", label: "Diagnostico", icon: Network }] },
  { label: "Acesso", items: [{ href: "/users/new", label: "Novo usuario", icon: UserPlus }] },
];

const titles: Record<string, string> = { "/": "Dashboard", "/applications": "Aplicacoes", "/domains": "Dominios", "/services": "Servicos", "/gateway": "Diagnostico", "/health": "Saude do sistema", "/users/new": "Novo usuario" };

export default function AdminFrame({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState("light");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light"), 0);
    return () => window.clearTimeout(timer);
  }, []);


  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("dyr-theme", next);
    setTheme(next);
  };

  const logout = async () => {
    try { await api.post("/logout"); } finally { router.push("/login"); }
  };

  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[256px] flex-col bg-[var(--sidebar)] text-white transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md border border-white/15 bg-white/10 text-[11px] font-bold">DYR</span>
            <span><span className="block text-sm font-semibold">DyRGateway</span><span className="mt-0.5 block text-[10px] text-[var(--sidebar-muted)]">CONTROL CENTER</span></span>
          </Link>
          <button className="grid h-9 w-9 place-items-center rounded-md text-white/70 hover:bg-white/10 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={19} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.08em] text-[var(--sidebar-muted)]">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`flex h-10 items-center gap-3 rounded-md px-3 text-[13px] font-medium ${active ? "bg-white text-[#15231d] shadow-sm" : "text-white/70 hover:bg-white/7 hover:text-white"}`}><Icon size={17} strokeWidth={active ? 2.2 : 1.8} /><span className="flex-1">{item.label}</span>{active ? <ChevronRight size={14} /> : null}</Link>;
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-md bg-white/5 p-3">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-white/10"><CircleUserRound size={17} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">Administrador</span><span className="block text-[10px] text-[var(--sidebar-muted)]">Sessao ativa</span></span>
            <button onClick={logout} title="Sair" aria-label="Sair" className="grid h-8 w-8 place-items-center rounded-md text-white/55 hover:bg-white/10 hover:text-white"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {menuOpen ? <button className="fixed inset-0 z-40 bg-black/45 lg:hidden" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} /> : null}

      <div className="min-h-screen lg:pl-[256px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[var(--border)] bg-[var(--panel)]/94 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button className="icon-button lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={19} /></button>
            <div className="min-w-0"><p className="text-[10px] font-semibold uppercase text-[var(--muted)]">Painel administrativo</p><p className="truncate text-sm font-semibold text-[var(--foreground)]">{titles[pathname] || "DyRGateway"}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-md bg-[var(--success-soft)] px-3 py-2 text-[11px] font-semibold text-[var(--success)] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-current" />API configurada</span>
            <button className="icon-button" onClick={toggleTheme} title={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"} aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
