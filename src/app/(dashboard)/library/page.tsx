import { LibraryPageClient } from './LibraryPageClient';

export default function LibraryPage() {
  return (
    <div className="flex flex-col gap-5 h-full overflow-hidden">
      <header>
        <h1 className="text-3xl font-semibold text-ronda-text">Biblioteca</h1>
        <p className="mt-2 text-sm text-ronda-muted">Repositorio interno de imágenes y recursos de producto.</p>
      </header>

      <LibraryPageClient />
    </div>
  );
}
