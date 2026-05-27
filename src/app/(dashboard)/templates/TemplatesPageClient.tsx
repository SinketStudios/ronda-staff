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
    if (!selectedTemplateId) return;

    setLoading(true);
    getEmailTemplate(selectedTemplateId)
      .then(setTemplateDetail)
      .catch(() => setTemplateDetail(null))
      .finally(() => setLoading(false));
  }, [selectedTemplateId]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ronda-text">Plantillas de correo</h1>
          <p className="mt-2 text-sm text-ronda-muted">
            Previsualiza las plantillas de correo que envía el sistema.
          </p>
        </div>
      </header>

      {/* Main content */}
      <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr] gap-5 overflow-hidden">
        {/* Left column - Template list */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-ronda-border bg-ronda-surface">
          <div className="border-b border-ronda-border bg-ronda-surface-soft px-4 py-3">
            <h2 className="text-xs font-semibold uppercase text-ronda-muted">Plantillas disponibles</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="space-y-2 p-3">
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
                  <p className="mt-1 text-xs text-ronda-muted">{template.subject}</p>
                  <p className="mt-2 text-xs text-ronda-muted/70">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Preview */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-ronda-border bg-ronda-surface">
          {selectedTemplate && (
            <>
              <div className="border-b border-ronda-border bg-ronda-surface-soft px-4 py-3">
                <div className="flex items-center justify-between gap-4">
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

              <div className="min-h-0 flex-1 overflow-auto bg-ronda-bg p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-ronda-muted">
                    Cargando...
                  </div>
                ) : templateDetail ? (
                  <div className={`mx-auto ${isDesktop ? 'w-full' : 'w-[390px]'}`}>
                    <iframe
                      srcDoc={templateDetail.html}
                      className="w-full border-0 rounded-lg"
                      style={{ height: '600px' }}
                      sandbox="allow-same-origin"
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
