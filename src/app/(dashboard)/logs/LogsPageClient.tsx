'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { AuditLogResponse, AuditLogEntry } from '@/lib/api';

const ACTION_LABELS: Record<string, string> = {
  VIEW: 'Vista',
  CREATE: 'Crear',
  UPDATE: 'Actualizar',
  DELETE: 'Eliminar',
  LOGIN: 'Inicio sesión',
  LOGOUT: 'Cerrar sesión',
  UPLOAD: 'Subida',
};

const ACTION_COLORS: Record<string, string> = {
  VIEW: 'bg-ronda-muted/10 text-ronda-muted',
  CREATE: 'bg-green-50 text-green-700',
  UPDATE: 'bg-blue-50 text-blue-700',
  DELETE: 'bg-red-50 text-ronda-error',
  LOGIN: 'bg-ronda-gold/10 text-ronda-gold-dark',
  LOGOUT: 'bg-orange-50 text-orange-700',
  UPLOAD: 'bg-purple-50 text-purple-700',
};

interface LogsPageClientProps {
  initialData: AuditLogResponse;
}

export function LogsPageClient({ initialData }: LogsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState({
    action: searchParams.get('action') ?? '',
    endpoint: searchParams.get('endpoint') ?? '',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
  });

  const [endpointSearch, setEndpointSearch] = useState('');
  const [showEndpointDropdown, setShowEndpointDropdown] = useState(false);
  const endpointDropdownRef = useRef<HTMLDivElement>(null);

  // Extraer endpoints únicos de todos los datos (no solo los actuales)
  const uniqueEndpoints = Array.from(new Set(initialData.data.map((entry) => entry.endpoint))).sort();

  const filteredEndpoints = uniqueEndpoints.filter((ep) => ep.toLowerCase().includes(endpointSearch.toLowerCase()));

  const applyFilters = (overrides?: Partial<typeof filters>, page = 1) => {
    const next = { ...filters, ...overrides };
    const params = new URLSearchParams();
    if (next.action) params.set('action', next.action);
    if (next.endpoint) params.set('endpoint', next.endpoint);
    if (next.dateFrom) params.set('dateFrom', next.dateFrom);
    if (next.dateTo) params.set('dateTo', next.dateTo);
    if (page > 1) params.set('page', String(page));

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
    setFilters(next);
  };

  const handleEndpointSelect = (ep: string) => {
    applyFilters({ endpoint: ep });
    setShowEndpointDropdown(false);
    setEndpointSearch('');
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  // Cerrar dropdown al clickear fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (endpointDropdownRef.current && !endpointDropdownRef.current.contains(event.target as Node)) {
        setShowEndpointDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data, total, page, totalPages } = initialData;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-ronda-surface outline outline-1 -outline-offset-1 outline-ronda-border overflow-hidden">
      {/* Filter bar */}
      <div className="border-b border-ronda-border px-6 py-4 flex flex-wrap gap-3 items-end shrink-0">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase text-ronda-muted">Acción</label>
          <select
            value={filters.action}
            onChange={(e) => applyFilters({ action: e.target.value })}
            className="rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text"
          >
            <option value="">Todas</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* Endpoint Dropdown */}
        <div className="flex flex-col gap-1 relative" ref={endpointDropdownRef}>
          <label className="text-xs font-semibold uppercase text-ronda-muted">Endpoint</label>
          <div className="relative w-64">
            <button
              onClick={() => setShowEndpointDropdown(!showEndpointDropdown)}
              className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text text-left flex items-center justify-between hover:bg-ronda-bg/60"
            >
              <span className="truncate">{filters.endpoint || 'Todos'}</span>
              <svg className="w-4 h-4 text-ronda-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            {showEndpointDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-ronda-bg border border-ronda-border rounded-lg shadow-lg z-50">
                {/* Search input */}
                <div className="p-2 border-b border-ronda-border">
                  <input
                    type="text"
                    placeholder="Buscar endpoint..."
                    value={endpointSearch}
                    onChange={(e) => setEndpointSearch(e.target.value)}
                    className="w-full rounded px-2 py-1.5 text-sm bg-ronda-surface border border-ronda-border text-ronda-text"
                    autoFocus
                  />
                </div>

                {/* Endpoints list */}
                <div className="max-h-48 overflow-y-auto">
                  <button
                    onClick={() => {
                      applyFilters({ endpoint: '' });
                      setShowEndpointDropdown(false);
                      setEndpointSearch('');
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-ronda-surface transition ${
                      !filters.endpoint ? 'bg-ronda-gold/10 text-ronda-coffee font-semibold' : 'text-ronda-text'
                    }`}
                  >
                    Todos
                  </button>
                  {filteredEndpoints.map((ep) => (
                    <button
                      key={ep}
                      onClick={() => handleEndpointSelect(ep)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-ronda-surface transition font-mono ${
                        filters.endpoint === ep ? 'bg-ronda-gold/10 text-ronda-coffee font-semibold' : 'text-ronda-coffee'
                      }`}
                    >
                      {ep}
                    </button>
                  ))}
                  {filteredEndpoints.length === 0 && (
                    <div className="px-3 py-2 text-sm text-ronda-muted italic">Sin resultados</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase text-ronda-muted">Desde</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => applyFilters({ dateFrom: e.target.value })}
            className="rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase text-ronda-muted">Hasta</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => applyFilters({ dateTo: e.target.value })}
            className="rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text"
          />
        </div>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm font-semibold text-ronda-muted hover:bg-ronda-surface disabled:opacity-40 transition flex items-center gap-2 h-10"
        >
          <svg
            className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>

        <div className="flex items-end ml-auto">
          <p className="text-sm text-ronda-muted">
            {total} registro{total !== 1 ? 's' : ''}
            {isPending && <span className="ml-2 animate-pulse">Cargando...</span>}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-ronda-surface border-b border-ronda-border">
            <tr>
              {['Empleado', 'Acción', 'Método', 'Endpoint', 'Status', 'IP', 'Cuando'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase text-ronda-muted whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ronda-border">
            {data.map((entry) => (
              <LogRow key={entry.id} entry={entry} />
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ronda-muted">
                  Sin registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-ronda-border px-6 py-4 flex justify-between items-center shrink-0">
          <button
            disabled={page <= 1}
            onClick={() => applyFilters({}, page - 1)}
            className="rounded-lg border border-ronda-border px-3 py-2 text-sm font-semibold text-ronda-muted disabled:opacity-40 hover:bg-ronda-bg"
          >
            Anterior
          </button>
          <span className="text-sm text-ronda-muted">
            Página {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => applyFilters({}, page + 1)}
            className="rounded-lg border border-ronda-border px-3 py-2 text-sm font-semibold text-ronda-muted disabled:opacity-40 hover:bg-ronda-bg"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

function LogRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const actionColor = ACTION_COLORS[entry.action] ?? 'bg-gray-50 text-gray-700';

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-ronda-bg/40 transition"
        onClick={() => entry.requestBody && setExpanded((e) => !e)}
      >
        <td className="px-4 py-3 whitespace-nowrap">
          {entry.staffMember ? (
            <div>
              <p className="font-medium text-ronda-text">{entry.staffMember.name}</p>
              <p className="text-xs text-ronda-muted">{entry.staffMember.employeeCode}</p>
            </div>
          ) : (
            <span className="text-ronda-muted italic">Desconocido</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${actionColor}`}>
            {ACTION_LABELS[entry.action] ?? entry.action}
          </span>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-ronda-muted">{entry.method}</td>
        <td className="px-4 py-3 font-mono text-xs text-ronda-coffee max-w-xs truncate">{entry.endpoint}</td>
        <td className="px-4 py-3">
          <span className={`font-mono text-xs ${entry.responseStatus >= 400 ? 'text-ronda-error' : 'text-ronda-success'}`}>
            {entry.responseStatus}
          </span>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-ronda-muted">{entry.ip ?? '—'}</td>
        <td className="px-4 py-3 text-xs text-ronda-muted whitespace-nowrap">
          {new Date(entry.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' })}
        </td>
      </tr>
      {expanded && entry.requestBody && (
        <tr className="bg-ronda-bg/60">
          <td colSpan={7} className="px-6 py-3">
            <pre className="text-xs font-mono text-ronda-muted overflow-auto max-h-40 whitespace-pre-wrap break-words">
              {JSON.stringify(entry.requestBody, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
