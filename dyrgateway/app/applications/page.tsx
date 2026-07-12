"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppWindow, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { api } from "@/lib/apiClient";
import { apiErrorMessage } from "@/lib/errors";
import type { Application } from "@/lib/types";
import { Badge, Button, EmptyState, Feedback, Field, formatDate, IconButton, Input, PageHeader, Toggle } from "@/app/components/ui";

type FormState = { name: string; slug: string; active: boolean };
const emptyForm: FormState = { name: "", slug: "", active: true };

export default function ApplicationsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => { setLoading(true); setError(""); try { const response = await api.get<Application[]>("/applications", { params: { take: 100 } }); setItems(response.data); } catch (err) { setError(apiErrorMessage(err, "Nao foi possivel carregar aplicacoes.")); } finally { setLoading(false); } };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);

  const reset = () => { setEditingId(""); setForm(emptyForm); setFormOpen(false); };
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(""); setMessage(""); try { if (editingId) { await api.put(`/applications/${editingId}`, form); setMessage("Aplicacao atualizada com sucesso."); } else { await api.post("/applications", form); setMessage("Aplicacao criada com sucesso."); } reset(); await load(); } catch (err) { setError(apiErrorMessage(err, "Nao foi possivel salvar a aplicacao.")); } finally { setSaving(false); } };
  const edit = (item: Application) => { setEditingId(item.id); setForm({ name: item.name, slug: item.slug, active: item.active }); setFormOpen(true); setMessage(""); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const remove = async (id: string) => { if (!window.confirm("Excluir esta aplicacao? Esta acao nao pode ser desfeita.")) return; setError(""); setMessage(""); try { await api.delete(`/applications/${id}`); setMessage("Aplicacao removida."); await load(); } catch (err) { setError(apiErrorMessage(err, "Nao foi possivel remover a aplicacao.")); } };

  return <div className="app-page">
    <PageHeader eyebrow="Roteamento" title="Aplicacoes" description="Organize os sistemas publicados pelo gateway e controle sua disponibilidade." actions={<Button icon={<Plus size={16} />} onClick={() => { setFormOpen(true); setEditingId(""); setForm(emptyForm); }}>Nova aplicacao</Button>} />
    <Feedback message={message} error={error} />

    {formOpen ? <form onSubmit={submit} className="panel">
      <div className="panel-header"><div><h2 className="panel-title">{editingId ? "Editar aplicacao" : "Nova aplicacao"}</h2><p className="panel-subtitle">Defina a identidade usada nas configuracoes de roteamento.</p></div><IconButton label="Fechar formulario" type="button" onClick={reset}><X size={17} /></IconButton></div>
      <div className="panel-body">
        <div className="grid gap-5 md:grid-cols-2"><Field label="Nome" hint="Nome legivel para identificacao no painel."><Input value={form.name} placeholder="Ex.: Portal institucional" onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus /></Field><Field label="Slug" hint="Identificador curto e unico da aplicacao."><Input value={form.slug} placeholder="portal-institucional" onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></Field></div>
        <div className="mt-5 border-t border-[var(--border)] pt-5"><Toggle checked={form.active} onChange={(active) => setForm({ ...form, active })} label="Aplicacao ativa" /></div>
        <div className="mt-6 flex justify-end gap-2"><Button variant="secondary" type="button" onClick={reset}>Cancelar</Button><Button type="submit" disabled={saving} icon={<Save size={15} />}>{saving ? "Salvando..." : editingId ? "Salvar alteracoes" : "Criar aplicacao"}</Button></div>
      </div>
    </form> : null}

    <section className="panel overflow-hidden">
      <div className="panel-header"><div><h2 className="panel-title">Aplicacoes cadastradas</h2><p className="panel-subtitle">{items.length} registros encontrados</p></div><IconButton label="Atualizar lista" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></IconButton></div>
      {items.length === 0 ? <EmptyState loading={loading} text="Nenhuma aplicacao cadastrada." /> : <div className="data-table-wrap"><table className="data-table min-w-[760px]"><thead><tr><th>Aplicacao</th><th>Slug</th><th>Status</th><th>Criada em</th><th className="text-right">Acoes</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]"><AppWindow size={17} /></span><div><p className="table-primary">{item.name}</p><p className="table-secondary mono">{item.id.slice(0, 12)}</p></div></div></td><td className="mono text-[var(--muted-strong)]">/{item.slug}</td><td><Badge active={item.active} /></td><td className="text-[var(--muted)]">{formatDate(item.createdAt)}</td><td><div className="table-actions"><IconButton label="Editar aplicacao" onClick={() => edit(item)}><Pencil size={15} /></IconButton><IconButton label="Excluir aplicacao" className="danger" onClick={() => remove(item.id)}><Trash2 size={15} /></IconButton></div></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
