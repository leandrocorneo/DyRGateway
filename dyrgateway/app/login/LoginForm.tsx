"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { api } from "@/lib/apiClient";
import { Button, Field, IconButton, Input } from "@/app/components/ui";

export default function LoginForm() {
  const router = useRouter(); const params = useSearchParams(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [showPassword, setShowPassword] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setLoading(true); setError(""); try { await api.post("/login", { email, password }); router.push(params.get("next") || "/"); } catch { setError("Email ou senha invalidos. Verifique os dados e tente novamente."); } finally { setLoading(false); } };
  return <main className="grid min-h-screen bg-[var(--background)] lg:grid-cols-[.82fr_1.18fr]">
    <section className="relative hidden overflow-hidden bg-[var(--sidebar)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-md border border-white/15 bg-white/10 text-xs font-bold">DYR</span><div><p className="text-sm font-semibold">DyRGateway</p><p className="mt-0.5 text-[10px] text-white/50">CONTROL CENTER</p></div></div>
      <div className="relative z-10 max-w-lg"><span className="mb-7 grid h-11 w-11 place-items-center rounded-md bg-white/10"><ShieldCheck size={22} /></span><h1 className="text-[38px] font-semibold leading-[1.12]">Controle claro para uma infraestrutura confiavel.</h1><p className="mt-5 max-w-md text-sm leading-6 text-white/60">Gerencie aplicacoes, dominios e servicos em uma unica visao operacional.</p></div>
      <div className="relative z-10 flex items-center gap-2 text-xs text-white/45"><span className="h-1.5 w-1.5 rounded-full bg-[#7cb195]" />Acesso protegido por sessao segura</div>
      <div className="absolute -bottom-36 -right-36 h-[440px] w-[440px] rounded-full border border-white/5" /><div className="absolute -bottom-20 -right-20 h-[290px] w-[290px] rounded-full border border-white/5" />
    </section>
    <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-9 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-md bg-[var(--sidebar)] text-xs font-bold text-white">DYR</span></div>
        <p className="eyebrow">Area administrativa</p><h2 className="text-3xl font-semibold">Bem-vindo de volta</h2><p className="mt-2 text-sm text-[var(--muted)]">Entre com suas credenciais para acessar o gateway.</p>
        <form onSubmit={submit} className="mt-8 space-y-5"><Field label="Email"><Input type="email" value={email} placeholder="voce@empresa.com" onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="email" /></Field><Field label="Senha"><div className="relative"><Input className="pr-12" type={showPassword ? "text" : "password"} value={password} placeholder="Sua senha" onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /><IconButton type="button" label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-1 top-1 border-0 bg-transparent" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</IconButton></div></Field>{error ? <div className="feedback feedback-error"><LockKeyhole size={16} /><span>{error}</span></div> : null}<Button className="w-full" type="submit" disabled={loading} icon={!loading ? <ArrowRight size={16} /> : undefined}>{loading ? "Autenticando..." : "Entrar no painel"}</Button></form>
        <p className="mt-8 text-center text-[11px] text-[var(--muted)]">DyRGateway Administrative Console</p>
      </div>
    </section>
  </main>;
}
