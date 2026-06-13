'use client';

import { useState, useRef, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
}

interface CategoryDropdownProps {
  value: string;
  onChange: (categoryId: string) => void;
  categories: Category[];
  onCreateCategory: (name: string) => void;
}

export function CategoryDropdown({
  value,
  onChange,
  categories,
  onCreateCategory,
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCategory = categories.find((cat) => cat.id === value);

  const hasExact = categories.some(
    (cat) => cat.name.toLowerCase() === search.toLowerCase()
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddCategory = () => {
    if (search.trim()) {
      onCreateCategory(search.trim());
      setSearch('');
      setIsOpen(false);
    }
  };

  const handleSelect = (category: Category) => {
    onChange(category.id);
    setSearch('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 rounded-lg border border-ronda-border bg-ronda-surface text-ronda-text cursor-pointer transition hover:border-ronda-gold flex items-center justify-between"
      >
        <span className={value ? 'text-ronda-text' : 'text-ronda-muted/60'}>
          {selectedCategory?.name || 'Selecciona categoría'}
        </span>
        <svg className="w-4 h-4 text-ronda-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-ronda-surface border border-ronda-border rounded-lg shadow-lg z-[9999]">
          <div className="p-2">
            <input
              type="text"
              placeholder="Buscar o crear..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-ronda-border bg-ronda-bg text-ronda-text placeholder:text-ronda-muted/60 outline-none transition focus:ring-2 focus:ring-ronda-gold focus:border-ronda-gold"
              autoFocus
            />
          </div>

          {filtered.length > 0 && (
            <div className="max-h-40 overflow-y-auto border-t border-ronda-border/30">
              {filtered.map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleSelect(category)}
                  className="px-3 py-2 text-sm text-ronda-text hover:bg-ronda-bg cursor-pointer transition"
                >
                  {category.name}
                </div>
              ))}
            </div>
          )}

          {search && !hasExact && (
            <div className="border-t border-ronda-border/30 p-2">
              <button
                onClick={handleAddCategory}
                className="w-full px-3 py-2 text-sm text-left rounded-lg bg-ronda-gold/10 text-ronda-gold hover:bg-ronda-gold/20 transition font-semibold"
              >
                + Crear &quot;{search}&quot;
              </button>
            </div>
          )}

          {filtered.length === 0 && !search && (
            <div className="px-3 py-4 text-sm text-ronda-muted text-center">
              Sin categorías
            </div>
          )}
        </div>
      )}
    </div>
  );
}
