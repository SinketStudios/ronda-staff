'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { closeSupportTicket, fetchSupportTickets, replySupportTicket, type SupportTicket } from '@/lib/api';

type Filter = 'open' | 'closed' | 'all';

const statusLabels: Record<string, string> = {
  open: 'Abierto',
  waiting_staff: 'Pendiente',
  waiting_customer: 'Esperando cliente',
  closed: 'Cerrado',
};

const statusBadge: Record<string, string> = {
  open: 'bg-ronda-olive/15 text-ronda-olive',
  waiting_staff: 'bg-ronda-gold/20 text-ronda-gold-dark',
  waiting_customer: 'bg-blue-50 text-blue-600',
  closed: 'bg-ronda-bg text-ronda-muted',
};

const categoryLabel: Record<string, string> = {
  cuenta: 'Cuenta y acceso',
  facturacion: 'Facturación y plan',
  cobros: 'Cobros online',
  carta: 'Carta y productos',
  mesas: 'Mesas y códigos QR',
  pedidos: 'Pedidos',
  staff: 'Panel de trabajo',
  tecnico: 'Problema técnico',
  otro: 'Otro',
};

const openStatuses = ['open', 'waiting_staff', 'waiting_customer'];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const MD_OPTIONS = [
  { label: 'Negrita',           before: '**',    after: '**',   placeholder: 'texto' },
  { label: 'Cursiva',           before: '*',     after: '*',    placeholder: 'texto' },
  { label: 'Código inline',     before: '`',     after: '`',    placeholder: 'código' },
  { label: 'Bloque de código',  before: '```\n', after: '\n```',placeholder: 'código' },
  { label: 'Enlace',            before: '[',     after: '](url)',placeholder: 'texto del enlace' },
  { label: 'Título',            before: '## ',   after: '',     placeholder: 'Título' },
  { label: 'Lista',             before: '- ',    after: '',     placeholder: 'elemento' },
  { label: 'Cita',              before: '> ',    after: '',     placeholder: 'cita' },
  { label: 'Separador',         before: '\n---\n',after: '',    placeholder: '' },
];

const QUICK_REPLIES = [
  {
    label: 'Saludo',
    body: 'Hola **${clientName}**, gracias por contactar con el equipo de soporte de RONDA. Estamos revisando tu caso y te responderemos lo antes posible.',
  },
  {
    label: 'Solución aplicada',
    body: 'Hola **${clientName}**, hemos revisado tu caso y aplicado la solución correspondiente. Por favor, comprueba si el problema está resuelto e indícanos cualquier duda.',
  },
  {
    label: 'Necesitamos más información',
    body: 'Hola **${clientName}**, para ayudarte mejor necesitamos algo más de información. ¿Podrías indicarnos cuándo ocurre el problema y qué pasos has seguido?',
  },
  {
    label: 'En seguimiento',
    body: 'Hola **${clientName}**, estamos trabajando en tu caso y te mantendremos informado. Si el problema es urgente, puedes indicárnoslo aquí.',
  },
  {
    label: 'Cierre',
    body: 'Hola **${clientName}**, nos alegra que el problema esté solucionado. No dudes en abrir un nuevo ticket si necesitas ayuda en el futuro.',
  },
];

export function IncidentsPageClient({ initialTickets }: { initialTickets: SupportTicket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState<Filter>('open');
  const [reply, setReply] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [openPopover, setOpenPopover] = useState<'markdown' | 'quickreply' | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setFullscreen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);
  const [attachedFiles, setAttachedFiles] = useState<{ file: File; preview: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openPopover) return;
    function handler(e: MouseEvent) {
      if (popoverBarRef.current && !popoverBarRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPopover]);

  const filtered = useMemo(() => {
    if (filter === 'open') return tickets.filter((t) => openStatuses.includes(t.status));
    if (filter === 'closed') return tickets.filter((t) => !openStatuses.includes(t.status));
    return tickets;
  }, [tickets, filter]);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  const openCount = tickets.filter((t) => openStatuses.includes(t.status)).length;
  const waitingCount = tickets.filter((t) => t.status === 'waiting_staff').length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages.length]);

  function upsert(ticket: SupportTicket) {
    setTickets((prev) => {
      const exists = prev.some((t) => t.id === ticket.id);
      return exists ? prev.map((t) => (t.id === ticket.id ? ticket : t)) : [ticket, ...prev];
    });
    setSelectedId(ticket.id);
  }

  async function refresh() {
    setRefreshing(true);
    setError('');
    try {
      const data = await fetchSupportTickets();
      setTickets(data);
      if (!data.find((t) => t.id === selectedId) && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch {
      setError('No se pudieron actualizar los tickets.');
    } finally {
      setRefreshing(false);
    }
  }

  async function submitReply() {
    if (!selected || reply.trim().length < 2) return;
    setSaving(true);
    setError('');
    try {
      const updated = await replySupportTicket(selected.id, reply.trim(), attachedFiles.map((a) => a.file));
      upsert(updated);
      setReply('');
      attachedFiles.forEach((a) => { if (a.preview) URL.revokeObjectURL(a.preview); });
      setAttachedFiles([]);
      setFullscreen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la respuesta.');
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setAttachedFiles((prev) => [...prev, ...picked]);
    e.target.value = '';
  }

  function removeFile(index: number) {
    setAttachedFiles((prev) => {
      const item = prev[index];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function insertAtCursor(before: string, after = '', placeholder = '') {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = reply.slice(start, end) || placeholder;
    setReply(reply.slice(0, start) + before + sel + after + reply.slice(end));
    setPreviewMode(false);
    setOpenPopover(null);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + before.length + sel.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function insertQuickReply(template: string) {
    const name = selected?.customer?.name ?? 'Cliente';
    const body = template.replace('${clientName}', `**${name}**`);
    setReply((prev) => (prev.trim() ? `${prev}\n\n${body}` : body));
    setPreviewMode(false);
    setOpenPopover(null);
  }

  async function closeSelected() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const updated = await closeSupportTicket(selected.id);
      upsert(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar el ticket.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Cabecera */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-ronda-muted">Soporte</p>
          <h1 className="mt-1 text-3xl font-semibold text-ronda-text">Incidencias</h1>
          <p className="mt-1 text-sm text-ronda-muted">
            {openCount} abiertas
            {waitingCount > 0 && <span className="ml-2 font-semibold text-ronda-gold-dark">· {waitingCount} esperando respuesta</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="shrink-0 rounded-xl border border-ronda-border bg-ronda-surface px-4 py-2.5 text-sm font-semibold text-ronda-muted transition hover:border-ronda-coffee hover:text-ronda-coffee disabled:opacity-50"
        >
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* Panel principal */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-ronda-border bg-ronda-surface">

        {/* Lista de tickets — sidebar cuando hay selección, fullwidth si no */}
        <div className={`flex shrink-0 flex-col transition-all duration-300 ${selected ? 'w-72 xl:w-80 border-r border-ronda-border' : 'w-full'}`}>
          {/* Filtros */}
          <div className="flex gap-1 border-b border-ronda-border p-2">
            {([['open', 'Abiertos'], ['closed', 'Cerrados'], ['all', 'Todos']] as [Filter, string][]).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                  filter === id
                    ? 'bg-ronda-coffee text-white'
                    : 'text-ronda-muted hover:bg-ronda-bg hover:text-ronda-coffee'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-ronda-muted">
                No hay tickets {filter === 'open' ? 'abiertos' : filter === 'closed' ? 'cerrados' : ''}.
              </div>
            ) : selected ? (
              /* Modo sidebar: items compactos */
              filtered.map((ticket) => {
                const active = selected?.id === ticket.id;
                const isOpen = openStatuses.includes(ticket.status);
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedId(ticket.id)}
                    className={`block w-full border-b border-ronda-border px-4 py-3.5 text-left transition ${
                      active ? 'bg-ronda-bg' : 'hover:bg-ronda-bg/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-ronda-coffee">{ticket.reference}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge[ticket.status] ?? 'bg-ronda-bg text-ronda-muted'}`}>
                        {statusLabels[ticket.status] ?? ticket.status}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-sm font-semibold text-ronda-text">{ticket.topic}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-ronda-muted">
                      {ticket.organization?.name ?? '—'} · {ticket.customer?.email ?? '—'}
                    </p>
                    <p className="mt-1 text-[10px] text-ronda-muted">
                      {formatDate(ticket.lastMessageAt)}
                      {isOpen && ticket.attachments?.length > 0 && (
                        <span className="ml-2 text-ronda-coffee">· {ticket.attachments.length} adjunto{ticket.attachments.length > 1 ? 's' : ''}</span>
                      )}
                    </p>
                  </button>
                );
              })
            ) : (
              /* Modo fullwidth: cards expandidas */
              filtered.map((ticket) => {
                const lastMsg = ticket.messages[ticket.messages.length - 1];
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedId(ticket.id)}
                    className="block w-full border-b border-ronda-border px-6 py-4 text-left transition hover:bg-ronda-bg/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-semibold text-ronda-coffee">{ticket.reference}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge[ticket.status] ?? 'bg-ronda-bg text-ronda-muted'}`}>
                            {statusLabels[ticket.status] ?? ticket.status}
                          </span>
                          {ticket.status === 'waiting_staff' && (
                            <span className="rounded-full bg-ronda-gold/20 px-2 py-0.5 text-[10px] font-semibold text-ronda-gold-dark">Requiere respuesta</span>
                          )}
                        </div>
                        <p className="mt-1.5 text-base font-semibold text-ronda-text">{ticket.topic}</p>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ronda-muted">
                          <span>{categoryLabel[ticket.category] ?? ticket.category}</span>
                          {ticket.organization && <span>{ticket.organization.name}</span>}
                          {ticket.customer && <span>{ticket.customer.name} · {ticket.customer.email}</span>}
                        </div>
                        {lastMsg && (
                          <p className="mt-2 line-clamp-1 text-sm text-ronda-muted">
                            <span className="font-medium text-ronda-text">{lastMsg.authorType === 'staff' ? 'Equipo RONDA' : ticket.customer?.name ?? 'Cliente'}:</span>{' '}
                            {lastMsg.body}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-ronda-muted">{formatDate(ticket.lastMessageAt)}</p>
                        {ticket.attachments?.length > 0 && (
                          <p className="mt-1 text-[10px] text-ronda-coffee">{ticket.attachments.length} adjunto{ticket.attachments.length > 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detalle - modo normal */}
        {selected && !fullscreen && (
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Header del ticket */}
            <div className="shrink-0 border-b border-ronda-border p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedId('')}
                      className="shrink-0 text-ronda-muted transition hover:text-ronda-text"
                      title="Volver a la lista"
                    >
                      <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
                        <path d="M6.5 3 2 7.5 6.5 12M2 7.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <span className="font-mono text-sm font-semibold text-ronda-coffee">{selected.reference}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[selected.status] ?? 'bg-ronda-bg text-ronda-muted'}`}>
                      {statusLabels[selected.status] ?? selected.status}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-lg font-semibold text-ronda-text">{selected.topic}</h2>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ronda-muted">
                    <span>{categoryLabel[selected.category] ?? selected.category}</span>
                    {selected.organization && <span>{selected.organization.name}</span>}
                    {selected.restaurant && <span>{selected.restaurant.name}{selected.restaurant.city ? `, ${selected.restaurant.city}` : ''}</span>}
                    {selected.customer && <span>{selected.customer.name} · {selected.customer.email}</span>}
                    <span>Creado {formatDate(selected.createdAt)}</span>
                  </div>
                </div>
                {selected.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={closeSelected}
                    disabled={saving}
                    className="shrink-0 rounded-lg border border-ronda-border px-3 py-1.5 text-xs font-semibold text-ronda-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    Cerrar ticket
                  </button>
                )}
              </div>
            </div>

            {/* Mensajes */}
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-3">
                {selected.messages.map((message, idx) => {
                  const isStaff = message.authorType === 'staff';
                  const ticketAtts = idx === 0 ? (selected.attachments ?? []) : [];
                  const allAtts = [...(message.attachments ?? []), ...ticketAtts];
                  return (
                    <div
                      key={message.id}
                      className={`rounded-xl border p-4 ${isStaff ? 'border-ronda-gold/30 bg-ronda-gold/8 ml-8' : 'border-ronda-border bg-ronda-bg mr-8'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ronda-text">
                          {isStaff ? `Equipo RONDA${message.author?.name ? ` · ${message.author.name}` : ''}` : (message.author?.name ?? selected.customer?.name ?? 'Cliente')}
                        </p>
                        <p className="shrink-0 text-xs text-ronda-muted">{formatDate(message.createdAt)}</p>
                      </div>
                      <div className="prose prose-sm mt-2 max-w-none text-ronda-muted [&_a]:text-ronda-coffee [&_a]:underline [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/5 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_p]:my-0 [&_p+p]:mt-[1em]">
                        <ReactMarkdown remarkPlugins={[remarkBreaks]}>{message.body}</ReactMarkdown>
                      </div>
                      {allAtts.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {allAtts.map((att) => {
                            const isImage = att.mimeType?.startsWith('image/');
                            return (
                              <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={att.filename}
                                className="group relative block h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ronda-border bg-ronda-bg transition hover:border-ronda-gold/60"
                              >
                                {isImage ? (
                                  <img src={att.url} alt={att.filename} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-white">
                                    <span className="text-[11px] font-semibold tracking-wide text-ronda-muted">.{att.filename.split('.').pop()?.toLowerCase()}</span>
                                  </div>
                                )}
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

            </div>

            {/* Respuesta */}
            {selected.status !== 'closed' ? (
              <div className="shrink-0 border-t border-ronda-border p-5">
                <div className="overflow-hidden rounded-xl border border-ronda-border bg-ronda-bg/70 transition focus-within:border-ronda-gold focus-within:bg-ronda-surface">
                  <div className="flex items-center justify-between border-b border-ronda-border/60">
                    <div className="flex">
                      <button
                        type="button"
                        onClick={() => setPreviewMode(false)}
                        className={`px-3 py-1.5 text-xs font-medium transition ${!previewMode ? 'text-ronda-text' : 'text-ronda-muted hover:text-ronda-text'}`}
                      >
                        Escribir
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode(true)}
                        className={`px-3 py-1.5 text-xs font-medium transition ${previewMode ? 'text-ronda-text' : 'text-ronda-muted hover:text-ronda-text'}`}
                      >
                        Vista previa
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFullscreen(true)}
                      title="Pantalla completa"
                      className="mr-1 rounded p-1 text-ronda-muted transition hover:text-ronda-text"
                    >
                      <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                        <path d="M1.5 1.5h4M1.5 1.5v4M13.5 1.5h-4M13.5 1.5v4M1.5 13.5h4M1.5 13.5v-4M13.5 13.5h-4M13.5 13.5v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                  {previewMode ? (
                    <div className="prose prose-sm min-h-[76px] max-w-none px-3 py-3 text-ronda-muted [&_a]:text-ronda-coffee [&_a]:underline [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/5 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_p]:my-0 [&_p+p]:mt-[1em]">
                      {reply.trim() ? <ReactMarkdown remarkPlugins={[remarkBreaks]}>{reply}</ReactMarkdown> : <span className="text-ronda-muted/50 text-sm">Sin contenido</span>}
                    </div>
                  ) : (
                    <textarea
                      ref={textareaRef}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={3}
                      placeholder="Escribe la respuesta para el cliente... (soporta Markdown)"
                      disabled={saving}
                      className="w-full resize-none bg-transparent px-3 py-3 text-sm text-ronda-text outline-none disabled:opacity-50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          void submitReply();
                        }
                      }}
                    />
                  )}
                </div>
                {attachedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {attachedFiles.map(({ file, preview }, i) => (
                      <div key={i} className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ronda-border bg-ronda-bg">
                        {preview ? (
                          <img src={preview} alt={file.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white">
                            <span className="text-[11px] font-semibold tracking-wide text-ronda-muted">.{file.name.split('.').pop()?.toLowerCase()}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100"
                        >
                          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                            <path d="m2 2 11 11M2 13 13 2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div ref={popoverBarRef} className="relative flex items-center gap-1.5">
                    <p className="text-xs text-ronda-muted">⌘ + Enter</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {/* Adjuntar */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving}
                      title="Adjuntar archivo"
                      className="rounded-lg border border-ronda-border p-1.5 text-ronda-muted transition hover:border-ronda-gold/60 hover:text-ronda-coffee disabled:opacity-50"
                    >
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                        <path d="M13.5 7.5 8 13a4.243 4.243 0 0 1-6-6L8.5 1A2.828 2.828 0 0 1 12.5 5L6 11.5A1.414 1.414 0 0 1 4 9.5L9.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {/* Markdown */}
                    <button
                      type="button"
                      onClick={() => setOpenPopover(openPopover === 'markdown' ? null : 'markdown')}
                      title="Formato Markdown"
                      className={`rounded-lg border p-1.5 transition ${openPopover === 'markdown' ? 'border-ronda-gold/60 text-ronda-coffee' : 'border-ronda-border text-ronda-muted hover:border-ronda-gold/60 hover:text-ronda-coffee'}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                        <path d="M1.5 3.5h12v8h-12zM1.5 7.5h3M3 6v3M8.5 9 7 5.5 5.5 9M10 6v3l1.5-1.5L13 9V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {openPopover === 'markdown' && (
                      <div className="absolute bottom-full left-0 z-50 mb-2 min-w-[190px] overflow-hidden rounded-xl border border-ronda-border bg-ronda-surface shadow-lg">
                        {MD_OPTIONS.map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => insertAtCursor(opt.before, opt.after, opt.placeholder)}
                            className="flex w-full items-center px-3 py-2 text-left text-sm text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Respuestas rápidas */}
                    <button
                      type="button"
                      onClick={() => setOpenPopover(openPopover === 'quickreply' ? null : 'quickreply')}
                      title="Respuestas rápidas"
                      className={`rounded-lg border p-1.5 transition ${openPopover === 'quickreply' ? 'border-ronda-gold/60 text-ronda-coffee' : 'border-ronda-border text-ronda-muted hover:border-ronda-gold/60 hover:text-ronda-coffee'}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                        <path d="M8.5 1.5 3 8h4.5L6 13.5 13 7H8.5L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"/>
                      </svg>
                    </button>
                    {openPopover === 'quickreply' && (
                      <div className="absolute bottom-full left-0 z-50 mb-2 min-w-[280px] overflow-hidden rounded-xl border border-ronda-border bg-ronda-surface shadow-lg">
                        {QUICK_REPLIES.map((qr) => (
                          <button
                            key={qr.label}
                            type="button"
                            onClick={() => insertQuickReply(qr.body)}
                            className="flex w-full flex-col px-3 py-2.5 text-left transition hover:bg-ronda-bg"
                          >
                            <span className="text-sm font-medium text-ronda-text">{qr.label}</span>
                            <span className="mt-0.5 line-clamp-1 text-xs text-ronda-muted">{qr.body.replace(/\*\*/g, '')}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={submitReply}
                    disabled={saving || reply.trim().length < 2}
                    className="rounded-xl bg-ronda-coffee px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ronda-coffee/90 disabled:opacity-50"
                  >
                    {saving ? 'Enviando...' : 'Responder'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="shrink-0 border-t border-ronda-border px-5 py-4">
                <p className="text-center text-sm text-ronda-muted">
                  Ticket cerrado el {formatDate(selected.closedAt ?? selected.updatedAt)}.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal pantalla completa */}
      {selected && fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ronda-surface">
          {/* Header */}
          <div className="shrink-0 border-b border-ronda-border px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFullscreen(false)}
                    title="Salir de pantalla completa (Esc)"
                    className="shrink-0 text-ronda-muted transition hover:text-ronda-text"
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M5.5 2.5h-3v3M2.5 2.5l4 4M9.5 2.5h3v3M12.5 2.5l-4 4M5.5 12.5h-3v-3M2.5 12.5l4-4M9.5 12.5h3v-3M12.5 12.5l-4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <span className="font-mono text-sm font-semibold text-ronda-coffee">{selected.reference}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[selected.status] ?? 'bg-ronda-bg text-ronda-muted'}`}>
                    {statusLabels[selected.status] ?? selected.status}
                  </span>
                </div>
                <h2 className="mt-1 text-lg font-semibold text-ronda-text">{selected.topic}</h2>
                <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-ronda-muted">
                  <span>{categoryLabel[selected.category] ?? selected.category}</span>
                  {selected.organization && <span>{selected.organization.name}</span>}
                  {selected.customer && <span>{selected.customer.name} · {selected.customer.email}</span>}
                </div>
              </div>
              {selected.status !== 'closed' && (
                <button
                  type="button"
                  onClick={closeSelected}
                  disabled={saving}
                  className="shrink-0 rounded-lg border border-ronda-border px-3 py-1.5 text-xs font-semibold text-ronda-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  Cerrar ticket
                </button>
              )}
            </div>
          </div>

          {/* Cuerpo: mensajes izquierda + editor derecha */}
          <div className="flex min-h-0 flex-1 overflow-hidden">

            {/* Mensajes (izquierda) */}
            <div className="min-h-0 flex-1 overflow-y-auto border-r border-ronda-border p-6">
              <div className="grid gap-4">
                {selected.messages.map((message, idx) => {
                  const isStaff = message.authorType === 'staff';
                  const ticketAtts = idx === 0 ? (selected.attachments ?? []) : [];
                  const allAtts = [...(message.attachments ?? []), ...ticketAtts];
                  return (
                    <div
                      key={message.id}
                      className={`rounded-xl border p-4 ${isStaff ? 'border-ronda-gold/30 bg-ronda-gold/8 ml-12' : 'border-ronda-border bg-ronda-bg mr-12'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ronda-text">
                          {isStaff ? `Equipo RONDA${message.author?.name ? ` · ${message.author.name}` : ''}` : (message.author?.name ?? selected.customer?.name ?? 'Cliente')}
                        </p>
                        <p className="shrink-0 text-xs text-ronda-muted">{formatDate(message.createdAt)}</p>
                      </div>
                      <div className="prose prose-sm mt-2 max-w-none text-ronda-muted [&_a]:text-ronda-coffee [&_a]:underline [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/5 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_p]:my-0 [&_p+p]:mt-[1em]">
                        <ReactMarkdown remarkPlugins={[remarkBreaks]}>{message.body}</ReactMarkdown>
                      </div>
                      {allAtts.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {allAtts.map((att) => {
                            const isImage = att.mimeType?.startsWith('image/');
                            return (
                              <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" title={att.filename} className="group relative block h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ronda-border bg-ronda-bg transition hover:border-ronda-gold/60">
                                {isImage ? (
                                  <img src={att.url} alt={att.filename} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-white">
                                    <span className="text-[11px] font-semibold tracking-wide text-ronda-muted">.{att.filename.split('.').pop()?.toLowerCase()}</span>
                                  </div>
                                )}
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Editor (derecha) */}
            <div className="flex w-[45%] shrink-0 flex-col p-6">
              {selected.status !== 'closed' ? (
                <>
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-ronda-border bg-ronda-bg/70 transition focus-within:border-ronda-gold focus-within:bg-ronda-surface">
                    <div className="flex items-center justify-between border-b border-ronda-border/60">
                      <div className="flex">
                        <button type="button" onClick={() => setPreviewMode(false)} className={`px-3 py-1.5 text-xs font-medium transition ${!previewMode ? 'text-ronda-text' : 'text-ronda-muted hover:text-ronda-text'}`}>Escribir</button>
                        <button type="button" onClick={() => setPreviewMode(true)} className={`px-3 py-1.5 text-xs font-medium transition ${previewMode ? 'text-ronda-text' : 'text-ronda-muted hover:text-ronda-text'}`}>Vista previa</button>
                      </div>
                      <button type="button" onClick={() => setFullscreen(false)} title="Salir de pantalla completa (Esc)" className="mr-1 rounded p-1 text-ronda-muted transition hover:text-ronda-text">
                        <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                          <path d="M5.5 2.5h-3v3M2.5 2.5l4 4M9.5 2.5h3v3M12.5 2.5l-4 4M5.5 12.5h-3v-3M2.5 12.5l4-4M9.5 12.5h3v-3M12.5 12.5l-4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                    {previewMode ? (
                      <div className="prose prose-sm min-h-0 flex-1 overflow-y-auto max-w-none px-3 py-3 text-ronda-muted [&_a]:text-ronda-coffee [&_a]:underline [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/5 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_p]:my-0 [&_p+p]:mt-[1em]">
                        {reply.trim() ? <ReactMarkdown remarkPlugins={[remarkBreaks]}>{reply}</ReactMarkdown> : <span className="text-ronda-muted/50 text-sm">Sin contenido</span>}
                      </div>
                    ) : (
                      <textarea
                        ref={textareaRef}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Escribe la respuesta para el cliente... (soporta Markdown)"
                        disabled={saving}
                        className="min-h-0 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-ronda-text outline-none disabled:opacity-50"
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submitReply(); }}
                      />
                    )}
                  </div>
                  {attachedFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {attachedFiles.map(({ file, preview }, i) => (
                        <div key={i} className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ronda-border bg-ronda-bg">
                          {preview ? <img src={preview} alt={file.name} className="h-full w-full object-cover" /> : (
                            <div className="flex h-full w-full items-center justify-center bg-white">
                              <span className="text-[11px] font-semibold tracking-wide text-ronda-muted">.{file.name.split('.').pop()?.toLowerCase()}</span>
                            </div>
                          )}
                          <button type="button" onClick={() => removeFile(i)} className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                            <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="m2 2 11 11M2 13 13 2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div ref={popoverBarRef} className="relative flex items-center gap-1.5">
                      <p className="text-xs text-ronda-muted">⌘ + Enter</p>
                      <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={saving} title="Adjuntar archivo" className="rounded-lg border border-ronda-border p-1.5 text-ronda-muted transition hover:border-ronda-gold/60 hover:text-ronda-coffee disabled:opacity-50">
                        <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M13.5 7.5 8 13a4.243 4.243 0 0 1-6-6L8.5 1A2.828 2.828 0 0 1 12.5 5L6 11.5A1.414 1.414 0 0 1 4 9.5L9.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button type="button" onClick={() => setOpenPopover(openPopover === 'markdown' ? null : 'markdown')} title="Formato Markdown" className={`rounded-lg border p-1.5 transition ${openPopover === 'markdown' ? 'border-ronda-gold/60 text-ronda-coffee' : 'border-ronda-border text-ronda-muted hover:border-ronda-gold/60 hover:text-ronda-coffee'}`}>
                        <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M1.5 3.5h12v8h-12zM1.5 7.5h3M3 6v3M8.5 9 7 5.5 5.5 9M10 6v3l1.5-1.5L13 9V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      {openPopover === 'markdown' && (
                        <div className="absolute bottom-full left-0 z-50 mb-2 min-w-[190px] overflow-hidden rounded-xl border border-ronda-border bg-ronda-surface shadow-lg">
                          {MD_OPTIONS.map((opt) => (
                            <button key={opt.label} type="button" onClick={() => insertAtCursor(opt.before, opt.after, opt.placeholder)} className="flex w-full items-center px-3 py-2 text-left text-sm text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text">{opt.label}</button>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => setOpenPopover(openPopover === 'quickreply' ? null : 'quickreply')} title="Respuestas rápidas" className={`rounded-lg border p-1.5 transition ${openPopover === 'quickreply' ? 'border-ronda-gold/60 text-ronda-coffee' : 'border-ronda-border text-ronda-muted hover:border-ronda-gold/60 hover:text-ronda-coffee'}`}>
                        <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M8.5 1.5 3 8h4.5L6 13.5 13 7H8.5L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"/></svg>
                      </button>
                      {openPopover === 'quickreply' && (
                        <div className="absolute bottom-full left-0 z-50 mb-2 min-w-[280px] overflow-hidden rounded-xl border border-ronda-border bg-ronda-surface shadow-lg">
                          {QUICK_REPLIES.map((qr) => (
                            <button key={qr.label} type="button" onClick={() => insertQuickReply(qr.body)} className="flex w-full flex-col px-3 py-2.5 text-left transition hover:bg-ronda-bg">
                              <span className="text-sm font-medium text-ronda-text">{qr.label}</span>
                              <span className="mt-0.5 line-clamp-1 text-xs text-ronda-muted">{qr.body.replace(/\*\*/g, '')}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={submitReply} disabled={saving || reply.trim().length < 2} className="rounded-xl bg-ronda-coffee px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ronda-coffee/90 disabled:opacity-50">
                      {saving ? 'Enviando...' : 'Responder'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ronda-muted">Ticket cerrado el {formatDate(selected.closedAt ?? selected.updatedAt)}.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
