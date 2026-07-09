'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import { getStaffClients } from '@/lib/api';
import { getImages, type LibraryImage } from '@/lib/library-api';
import type { StaffClient } from '@/lib/api';

interface SearchResult {
  id: string;
  title: string;
  type: 'page' | 'client' | 'image' | 'incident';
  subtitle?: string;
  href: string;
  icon: React.ReactNode;
  imageUrl?: string;
}

const PAGES: SearchResult[] = [
  {
    id: 'dashboard',
    title: 'Panel',
    type: 'page',
    subtitle: 'Inicio del panel',
    href: '/dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4m0 0l4 4m-4-4V3" />
      </svg>
    ),
  },
  {
    id: 'clients',
    title: 'Clientes',
    type: 'page',
    subtitle: 'Gestión de clientes',
    href: '/clients',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2h12v-2a6 6 0 00-9-5.656V4.354m0 0H9m6 0h6" />
      </svg>
    ),
  },
  {
    id: 'sales-map',
    title: 'Mapa comercial',
    type: 'page',
    subtitle: 'Zonas comerciales de Espana para comerciales',
    href: '/sales-map',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3zM9 3v15m6-12v15" />
      </svg>
    ),
  },
  {
    id: 'library',
    title: 'Biblioteca',
    type: 'page',
    subtitle: 'Galería de imágenes',
    href: '/library',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'incidents',
    title: 'Incidencias',
    type: 'page',
    subtitle: 'Gestión de incidencias',
    href: '/incidents',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'employees',
    title: 'Empleados',
    type: 'page',
    subtitle: 'Gestión de empleados',
    href: '/employees',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 7a3 3 0 11-6 0 3 3 0 016 0zM6 17h12a2 2 0 012 2v2H4v-2a2 2 0 012-2z" />
      </svg>
    ),
  },
];

export function GlobalSearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const router = useRouter();

  useLayoutEffect(() => {
    if (isOpen && wrapperRef.current) {
      setDropdownRect(wrapperRef.current.getBoundingClientRect());
    }
  }, [isOpen]);

  function close() {
    setIsOpen(false);
    setQuery('');
  }

  const performSearch = useCallback(async (searchQuery: string) => {
    const normalizedQuery = searchQuery.toLowerCase();
    const allResults: SearchResult[] = [];

    const matchedPages: SearchResult[] = [];
    PAGES.forEach((page) => {
      if (
        page.title.toLowerCase().includes(normalizedQuery) ||
        page.subtitle?.toLowerCase().includes(normalizedQuery)
      ) {
        matchedPages.push(page);
        allResults.push(page);
      }
    });

    if (!searchQuery.trim()) {
      setResults(PAGES);
      return;
    }

    setIsLoading(true);

    try {
      const [clients, images] = await Promise.all([getStaffClients(), getImages()]);

      const libraryPageMatched = matchedPages.some((p) => p.id === 'library');
      if (libraryPageMatched) {
        images.forEach((img: LibraryImage) => {
          allResults.push({
            id: img.id, title: img.title, type: 'image', subtitle: img.category.name,
            href: '/library', imageUrl: img.imageUrl,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
          });
        });
      }

      const clientsPageMatched = matchedPages.some((p) => p.id === 'clients');
      if (clientsPageMatched) {
        clients.forEach((client: StaffClient) => {
          allResults.push({
            id: client.id, title: client.name, type: 'client',
            subtitle: client.legalName || client.email || undefined,
            href: `/clients/${client.id}`,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /></svg>,
          });
        });
      }

      clients.forEach((client: StaffClient) => {
        if (!clientsPageMatched && (
          client.name.toLowerCase().includes(normalizedQuery) ||
          client.legalName?.toLowerCase().includes(normalizedQuery) ||
          client.email?.toLowerCase().includes(normalizedQuery) ||
          client.owner.name.toLowerCase().includes(normalizedQuery)
        )) {
          allResults.push({
            id: client.id, title: client.name, type: 'client',
            subtitle: client.legalName || client.email || undefined,
            href: `/clients/${client.id}`,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /></svg>,
          });
        }
      });

      images.forEach((img: LibraryImage) => {
        if (!libraryPageMatched && (
          img.title.toLowerCase().includes(normalizedQuery) ||
          img.description?.toLowerCase().includes(normalizedQuery) ||
          img.tags.some((tag: string) => tag.toLowerCase().includes(normalizedQuery))
        )) {
          allResults.push({
            id: img.id, title: img.title, type: 'image', subtitle: img.category.name,
            href: '/library', imageUrl: img.imageUrl,
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
          });
        }
      });

      setResults(allResults.slice(0, 15));
      setSelectedIndex(allResults.length > 0 ? 0 : -1);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      if (isOpen) {
        switch (e.key) {
          case 'Escape': close(); break;
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, -1));
            break;
          case 'Enter':
            e.preventDefault();
            if (results[selectedIndex]) {
              router.push(results[selectedIndex].href);
              close();
            }
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, router]);

  // Cierra al hacer click fuera
  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  const grouped = {
    page:     results.filter((r) => r.type === 'page'),
    client:   results.filter((r) => r.type === 'client'),
    image:    results.filter((r) => r.type === 'image'),
    incident: results.filter((r) => r.type === 'incident'),
  };
  const groupLabels = { page: 'Páginas', client: 'Clientes', image: 'Biblioteca', incident: 'Incidencias' };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Input / trigger */}
      <div
        className={`flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${isOpen ? 'border-ronda-gold bg-ronda-bg' : 'border-ronda-border bg-ronda-bg hover:bg-ronda-surface'}`}
        onClick={() => { if (!isOpen) { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 0); } }}
      >
        <svg className="h-4 w-4 shrink-0 text-ronda-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-ronda-text outline-none"
            autoFocus
          />
        ) : (
          <>
            <span className="flex-1 text-xs text-ronda-muted/60">Buscar...</span>
            <kbd className="hidden lg:inline-flex items-center gap-1 rounded bg-ronda-border px-2 py-1 text-xs">
              <span className="text-xs">⌘</span>K
            </kbd>
          </>
        )}
      </div>

      {/* Dropdown — portal para escapar el stacking context del backdrop-blur */}
      {isOpen && dropdownRect && createPortal(
        <div
          className="fixed z-[9999] overflow-hidden rounded-xl border border-ronda-border bg-ronda-surface shadow-xl"
          style={{ top: dropdownRect.bottom + 6, left: dropdownRect.left, width: dropdownRect.width }}
        >
            <div className="max-h-80 overflow-y-auto">
              {isLoading && (
                <div className="px-4 py-8 text-center text-sm text-ronda-muted">Buscando...</div>
              )}
              {!isLoading && results.length === 0 && query && (
                <div className="px-4 py-8 text-center text-sm text-ronda-muted">Sin resultados para &ldquo;{query}&rdquo;</div>
              )}
              {results.length > 0 && (() => {
                let resultIndex = 0;
                return (Object.keys(grouped) as Array<keyof typeof grouped>).map((groupKey) => {
                  const items = grouped[groupKey];
                  if (items.length === 0) return null;
                  return (
                    <div key={groupKey}>
                      <div className="border-b border-ronda-border bg-ronda-bg px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ronda-muted">
                        {groupLabels[groupKey]}
                      </div>
                      <div className="divide-y divide-ronda-border/20">
                        {items.map((result) => {
                          const idx = resultIndex++;
                          return (
                            <button
                              key={result.id}
                              onClick={() => { router.push(result.href); close(); }}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${idx === selectedIndex ? 'bg-ronda-gold/10' : 'hover:bg-ronda-gold/5'}`}
                            >
                              {result.imageUrl ? (
                                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                                  <NextImage src={result.imageUrl} alt={result.title} fill sizes="36px" unoptimized className="object-cover" />
                                </span>
                              ) : (
                                <div className="shrink-0 text-ronda-muted">{result.icon}</div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-ronda-text">{result.title}</p>
                                {result.subtitle && <p className="truncate text-xs text-ronda-muted">{result.subtitle}</p>}
                              </div>
                              <span className="shrink-0 rounded bg-ronda-bg px-2 py-0.5 text-[10px] uppercase text-ronda-muted">
                                {result.type === 'page' ? 'Página' : result.type === 'client' ? 'Cliente' : result.type === 'image' ? 'Imagen' : 'Incidencia'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="flex justify-end gap-4 border-t border-ronda-border bg-ronda-bg/60 px-4 py-2 text-[11px] text-ronda-muted">
              <span>↑↓ Navegar</span>
              <span>↵ Seleccionar</span>
              <span>ESC Cerrar</span>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
}
