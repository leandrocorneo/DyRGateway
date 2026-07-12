"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Save, ShieldCheck, UserPlus } from "lucide-react";
import { api } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/errors";
import { Button, Feedback, Field, Input, PageHeader, Toggle } from "@/app/components/ui";

export default function NewUserPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [active, setActive] = useState(true); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setLoading(true); setMessage(""); setError(""); try { await api.post("/users", { email, password, active }); setEmail(""); setPassword(""); setActive(true); setMessage("Usuario criado com sucesso."); } catch (err) { setError(apiErrorMessage(err, "Nao foi possivel criar o usuario.")); } finally { setLoading(false); } };
  return <div className="app-page">
    <PageHeader eyebrow="Controle de acesso" title="Novo usuario" description="Crie uma credencial administrativa para acesso ao painel e aos endpoints protegidos." />
    <Feedback message={message} error={error} />
    <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <form onSubmit={submit} className="panel"><div className="panel-header"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]"><UserPlus size={18} /></span><div><h2 className="panel-title">Dados de acesso</h2><p className="panel-subtitle">Preencha as credenciais do novo administrador.</p></div></div></div><div className="panel-body"><div className="grid gap-5 md:grid-cols-2"><Field label="Email" hint="Sera utilizado para autenticar no painel."><Input type="email" value={email} placeholder="admin@empresa.com" onChange={(e) => setEmail(e.target.value)} required autoComplete="off" /></Field><Field label="Senha" hint="Utilize uma senha exclusiva e segura."><Input type="password" value={password} placeholder="Digite uma senha" onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" /></Field></div><div className="mt-5 border-t border-[var(--border)] pt-5"><Toggle checked={active} onChange={setActive} label="Permitir acesso imediatamente" /></div><div className="mt-6 flex justify-end"><Button type="submit" disabled={loading} icon={<Save size={15} />}>{loading ? "Criando usuario..." : "Criar usuario"}</Button></div></div></form>
      <aside className="space-y-4"><div className="panel p-5"><span className="grid h-10 w-10 place-items-center rounded-md bg-[var(--success-soft)] text-[var(--success)]"><ShieldCheck size={20} /></span><h2 className="mt-4 text-sm font-semibold">Acesso administrativo</h2><p className="mt-2 text-xs leading-5 text-[var(--muted)]">O usuario criado podera autenticar na API e operar os recursos protegidos do gateway.</p></div><div className="panel p-5"><span className="grid h-10 w-10 place-items-center rounded-md bg-[var(--panel-strong)] text-[var(--muted-strong)]"><KeyRound size={20} /></span><h2 className="mt-4 text-sm font-semibold">Limitacao atual</h2><p className="mt-2 text-xs leading-5 text-[var(--muted)]">A API disponibiliza somente a criacao. Listagem, edicao e exclusao de usuarios dependem de endpoints futuros.</p></div></aside>
    </section>
  </div>;
}
