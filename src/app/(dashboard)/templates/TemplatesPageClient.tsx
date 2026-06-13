'use client';

import { useState, useEffect } from 'react';
import type { EmailTemplate, EmailTemplateDetail } from '@/lib/api';
import { getEmailTemplate } from '@/lib/api';

interface TemplatesPageClientProps {
  templates: EmailTemplate[];
}

export function TemplatesPageClient({ templates }: TemplatesPageClientProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templates[0]?.id || null);
  const [templateDetail, setTemplateDetail] = useState<EmailTemplateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    window.setTimeout(() => {
      setIsDesktop(window.matchMedia('(min-width: 1024px)').matches);
    }, 0);
  }, []);

  useEffect(() => {
    if (!selectedTemplateId) return;

    let cancelled = false;
    window.setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);

    getEmailTemplate(selectedTemplateId)
      .then((detail) => {
        if (!cancelled) setTemplateDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setTemplateDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  function inertHtml(html: string) {
    return html.includes('<head>')
      ? html.replace('<head>', '<head><base target="_blank">')
      : `<base target="_blank">${html}`;
  }

  return (
    <div className="flex min-h-full flex-col gap-5 lg:h-full lg:overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ronda-text sm:text-3xl">Plantillas de correo</h1>
          <p className="mt-2 text-sm text-ronda-muted">
            Previsualiza las plantillas de correo que envía el sistema.
          </p>
        </div>
      </header>

      {/* Main content */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_1fr] lg:gap-5 lg:overflow-hidden">
        {/* Left column - Template list */}
        <div className="flex max-h-80 flex-col overflow-hidden rounded-lg border border-ronda-border bg-ronda-surface lg:max-h-none">
          <div className="border-b border-ronda-border bg-ronda-surface-soft px-4 py-3">
            <h2 className="text-xs font-semibold uppercase text-ronda-muted">Plantillas disponibles</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="grid gap-2 p-3 sm:grid-cols-2 lg:block lg:space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedTemplateId === template.id
                      ? 'border-ronda-gold bg-ronda-bg'
                      : 'border-ronda-border bg-ronda-surface hover:bg-ronda-bg'
                  }`}
                >
                  <p className="font-semibold text-ronda-text">{template.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-ronda-muted lg:truncate">{template.subject}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-ronda-muted/70">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Preview */}
        <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-lg border border-ronda-border bg-ronda-surface lg:min-h-0">
          {selectedTemplate && (
            <>
              <div className="border-b border-ronda-border bg-ronda-surface-soft px-4 py-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold text-ronda-text">{selectedTemplate.name}</h2>
                    <p className="mt-1 truncate text-xs text-ronda-muted">{selectedTemplate.subject}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-ronda-text">
                      <input
                        type="checkbox"
                        checked={isDesktop}
                        onChange={(e) => setIsDesktop(e.target.checked)}
                        className="h-4 w-4 accent-ronda-gold"
                      />
                      Desktop
                    </label>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto bg-ronda-bg">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-ronda-muted">
                    Cargando...
                  </div>
                ) : templateDetail ? (
                  <div className={`mx-auto h-full ${isDesktop ? 'min-w-[760px] lg:min-w-0 lg:w-full' : 'w-full max-w-[390px]'}`}>
                    <iframe
                      srcDoc={inertHtml(templateDetail.html)}
                      className="w-full h-full border-0"
                      sandbox=""
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-ronda-muted">
                    Error al cargar la plantilla
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
