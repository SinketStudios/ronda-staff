'use client';

import { useState, useEffect, useRef } from 'react';
import { CategoryDropdown } from './CategoryDropdown';
import { ToastContainer, useToast } from '@/components/Toast';
import {
  getCategories,
  createCategory,
  uploadImage,
  getImages,
  deleteImage,
  type LibraryImage,
} from '@/lib/library-api';

export function LibraryPageClient() {
  const { toasts, addToast, removeToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<LibraryImage | null>(null);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editImageData, setEditImageData] = useState<{ title: string; description: string; categoryId: string; tags: string[] }>({ title: '', description: '', categoryId: '', tags: [] });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [cropScale, setCropScale] = useState(100);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [minCropScale, setMinCropScale] = useState(100);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    categoryId: '',
    tags: [] as string[],
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [images, setImages] = useState<LibraryImage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const filtered = images.filter(img =>
    img.title.toLowerCase().includes(search.toLowerCase()) &&
    (!selectedCategoryFilter || img.category.id === selectedCategoryFilter)
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setImageUrl(URL.createObjectURL(file));
        extractImageMetadata(file);
        setIsEditing(true);
        setCropScale(100);
      }
    }
  };

  const extractImageMetadata = (file: File) => {
    // Usar el nombre del archivo (sin extensión) como título sugerido
    const fileName = file.name.split('.').slice(0, -1).join('.');
    const titleSuggestion = fileName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());

    // Intentar leer metadatos EXIF
    const reader = new FileReader();
    reader.onload = () => {
      // Por ahora solo usamos el nombre del archivo
      // En el futuro se podría agregar lectura de EXIF con una librería
      setUploadData(prev => ({
        ...prev,
        title: titleSuggestion || prev.title,
      }));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      setImageUrl(URL.createObjectURL(file));
      extractImageMetadata(file);
      setIsEditing(true);
      setCropScale(100);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    setImageUrl(urlInput);
    setUrlInput('');
    setIsEditing(true);
    setCropScale(100);
  };

  const handleSave = async () => {
    if (!imageUrl) return;
    setIsEditing(false);
    setIsUploading(true);
  };

  const handleCreateCategory = async (name: string) => {
    try {
      const newCategory = await createCategory(name);
      setCategories([...categories, newCategory]);
      setUploadData({ ...uploadData, categoryId: newCategory.id });
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !uploadData.tags.includes(trimmed)) {
      setUploadData({
        ...uploadData,
        tags: [...uploadData.tags, trimmed],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setUploadData({
      ...uploadData,
      tags: uploadData.tags.filter((_, i) => i !== index),
    });
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const convertToWebP = async (
    fileOrUrl: File | string,
    cropScaleValue?: number,
    imageOffsetValue?: { x: number; y: number },
  ): Promise<{ buffer: ArrayBuffer; fileName: string }> => {
    let imageSrc = '';
    let fileName = 'image.webp';

    if (typeof fileOrUrl === 'string') {
      imageSrc = fileOrUrl;
      fileName = 'image-from-url.webp';
    } else {
      fileName = fileOrUrl.name.replace(/\.[^.]+$/, '') + '.webp';
      imageSrc = URL.createObjectURL(fileOrUrl);
    }

    const PREVIEW_SIZE = 400; // Tamaño exacto del contenedor de preview (400x400)
    const FINAL_SIZE = 1024; // Tamaño final en píxeles para guardar

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Crear un canvas temporal con el mismo tamaño del preview
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = PREVIEW_SIZE;
        tempCanvas.height = PREVIEW_SIZE;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Obtener los parámetros de crop
        const scale = (cropScaleValue ?? cropScale) / 100;
        const offset = imageOffsetValue ?? imageOffset;

        // Dibujar la imagen con el mismo transform que en CSS
        tempCtx.save();
        tempCtx.translate(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2);
        tempCtx.scale(scale, scale);
        tempCtx.translate(offset.x / scale, offset.y / scale);
        tempCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        tempCtx.restore();

        // Ahora crear el canvas final con el tamaño deseado
        const canvas = document.createElement('canvas');
        canvas.width = FINAL_SIZE;
        canvas.height = FINAL_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Dibujar el contenido del canvas temporal al canvas final (escalado)
        ctx.drawImage(tempCanvas, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE, 0, 0, FINAL_SIZE, FINAL_SIZE);

        // Convertir a WebP
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert to blob'));
              return;
            }
            blob.arrayBuffer().then((buffer) => {
              resolve({ buffer, fileName });
            });
          },
          'image/webp',
          0.8,
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageSrc;
    });
  };

  const handleUpload = async () => {
    if (!uploadData.title || !uploadData.categoryId) {
      addToast('Título y categoría son obligatorios', 'error');
      return;
    }

    if (!selectedFile && !imageUrl) {
      addToast('Debe seleccionar una imagen', 'error');
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileOrUrl = selectedFile || imageUrl;
      if (!fileOrUrl) throw new Error('No file or URL');

      // Convertir a WebP (1:1 cuadrado)
      const { buffer, fileName } = await convertToWebP(fileOrUrl, cropScale, imageOffset);

      // Crear un File desde el buffer
      const webpFile = new File([buffer], fileName, { type: 'image/webp' });

      // Subir al backend (que se encarga de R2 y metadatos)
      await uploadImage(
        webpFile,
        uploadData.title,
        uploadData.description,
        uploadData.categoryId,
        uploadData.tags,
      );

      addToast('Imagen subida exitosamente', 'success');
      setSelectedFile(null);
      setImageUrl(null);
      setIsUploading(false);
      setOpenModal(false);
      setTagInput('');
      setUploadData({ title: '', description: '', categoryId: '', tags: [] });
      await loadImages();
    } catch (error) {
      console.error('Upload failed:', error);
      addToast(
        'Error al subir la imagen: ' +
          (error instanceof Error ? error.message : 'Error desconocido'),
        'error'
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setImageUrl(null);
    setIsEditing(false);
    setCropScale(100);
    setImageOffset({ x: 0, y: 0 });
    setTagInput('');
    setUploadData({ title: '', description: '', categoryId: '', tags: [] });
  };

  const handleImageMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    setIsDraggingImage(true);
    setDragStart({ x: e.clientX - imageOffset.x, y: e.clientY - imageOffset.y });
  };

  useEffect(() => {
    loadImages();
  }, []);

  useEffect(() => {
    if (!openModal) return;
    loadCategories();
  }, [openModal]);

  const loadImages = async () => {
    try {
      const imgs = await getImages();
      setImages(imgs);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  useEffect(() => {
    if (!isEditing || !containerRef.current || !imgRef.current) return;

    const calculateMinScale = () => {
      const container = containerRef.current;
      const img = imgRef.current;

      if (!container || !img) return;

      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      const minScaleX = (containerWidth / imgWidth) * 100;
      const minScaleY = (containerHeight / imgHeight) * 100;
      const calculatedMin = Math.max(minScaleX, minScaleY);

      setMinCropScale(calculatedMin);
    };

    // Calcular cuando la imagen se carga
    if (imgRef.current.complete) {
      calculateMinScale();
    }

    imgRef.current.addEventListener('load', calculateMinScale);
    return () => {
      imgRef.current?.removeEventListener('load', calculateMinScale);
    };
  }, [isEditing, imageUrl]);

  useEffect(() => {
    if (!isDraggingImage || !containerRef.current || !imgRef.current) return;

    const container = containerRef.current;
    const img = imgRef.current;
    const containerRect = container.getBoundingClientRect();

    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    const scale = cropScale / 100;
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Máximo desplazamiento para que los bordes toquen exactamente
      const maxX = (scaledWidth - containerWidth) / 2;
      const maxY = (scaledHeight - containerHeight) / 2;

      setImageOffset({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingImage(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingImage, dragStart, cropScale, minCropScale]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isEditingImage && categories.length === 0) {
      getCategories()
        .then(setCategories)
        .catch(() => {});
    }
  }, [isEditingImage]);

  return (
    <div className="flex min-h-full flex-col gap-4 lg:h-full lg:flex-row lg:gap-5 lg:overflow-hidden">
      {/* Sidebar Filtros - Izquierda */}
      <aside className="shrink-0 overflow-hidden rounded-lg border border-ronda-border bg-ronda-surface p-3 lg:w-56 lg:overflow-auto lg:p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase text-ronda-muted lg:mb-4">Categorías</h3>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:block lg:space-y-2 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
          {/* Mostrar todas */}
          <button
            onClick={() => setSelectedCategoryFilter(null)}
            className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm transition lg:w-full ${
              selectedCategoryFilter === null
                ? 'bg-ronda-gold text-white font-semibold'
                : 'text-ronda-text hover:bg-ronda-bg'
            }`}
          >
            Todas
          </button>

          {/* Categorías */}
          {categories.length > 0 ? (
            categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryFilter(category.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm transition lg:w-full ${
                  selectedCategoryFilter === category.id
                    ? 'bg-ronda-gold text-white font-semibold'
                    : 'text-ronda-text hover:bg-ronda-bg'
                }`}
              >
                {category.name}
              </button>
            ))
          ) : (
            <p className="shrink-0 px-3 py-2 text-xs text-ronda-muted">Sin categorías</p>
          )}
        </div>
      </aside>

      {/* Contenido Principal - Derecha */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:overflow-hidden">
        {/* Header con búsqueda y botón */}
        <div className="grid shrink-0 gap-3 sm:grid-cols-[1fr_auto]">
          <input
            type="text"
            placeholder="Buscar imágenes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-ronda-border bg-ronda-surface px-4 py-2 text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
          />
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            className="shrink-0 rounded-lg bg-ronda-gold px-4 py-2 font-semibold text-white transition hover:bg-ronda-gold-dark"
          >
            + Añadir
          </button>
        </div>

        {/* Galería de imágenes */}
        <div className="min-h-[420px] flex-1 overflow-auto rounded-lg bg-ronda-surface p-3 outline outline-1 -outline-offset-1 outline-ronda-border sm:p-4 lg:min-h-0 lg:p-6">
          {filtered.length === 0 ? (
            <div className="text-center text-ronda-muted">
              <p className="text-sm">{images.length === 0 ? 'No hay imágenes. ¡Empieza a subir!' : 'No hay imágenes que coincidan'}</p>
            </div>
          ) : (
            <div className="grid auto-rows-max grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
              {filtered.map((img) => (
                <div
                  key={img.id}
                  onClick={() => {
                    setSelectedImage(img);
                    setEditImageData({ title: img.title, description: img.description || '', categoryId: img.category.id, tags: img.tags });
                    setIsEditingImage(false);
                  }}
                  className="group relative cursor-pointer overflow-hidden rounded-lg bg-ronda-bg"
                >
                  <div className="overflow-hidden rounded-lg">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={img.imageUrl}
                        alt={img.title}
                        className="h-full w-full object-cover transition hover:scale-105"
                      />
                    </div>
                    <div className="p-3">
                      <p className="truncate text-xs font-semibold text-ronda-text">{img.title}</p>
                      <p className="mt-1 text-xs text-ronda-muted">{img.category.name}</p>
                    </div>
                  </div>
                  <span className="pointer-events-none absolute inset-0 rounded-lg border border-ronda-border transition group-hover:border-ronda-gold" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Añadir Imagen */}
      {openModal && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setOpenModal(false)} />
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <div className="flex h-dvh w-full flex-col rounded-t-2xl border border-ronda-border bg-ronda-surface shadow-xl sm:h-[90vh] sm:max-w-6xl sm:rounded-2xl lg:h-[80vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-ronda-border px-4 py-4 sm:px-6">
                <h2 className="text-lg font-semibold text-ronda-text">Añadir imagen</h2>
                <button
                  onClick={() => setOpenModal(false)}
                  className="p-1 rounded-lg text-ronda-muted hover:bg-ronda-bg transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body - Drag & Drop, Edit, or Upload */}
              <div className="flex flex-1 items-center justify-center overflow-auto p-4 sm:p-6 lg:p-8">
                {isUploading && imageUrl ? (
                  <div className="flex h-full w-full flex-col gap-5 lg:gap-6">
                    {/* Primera fila: Imagen + Título y Descripción */}
                    <div className="grid gap-5 lg:grid-cols-[400px_1fr] lg:gap-6">
                      {/* Vista previa del recorte */}
                      <div className="min-w-0">
                        <div className="aspect-square w-full max-w-[400px] overflow-hidden rounded-lg bg-ronda-bg">
                          <img
                            src={imageUrl}
                            alt="Preview"
                            className="w-full h-full object-contain"
                            style={{
                              transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${cropScale / 100})`,
                              transformOrigin: 'center',
                            }}
                          />
                        </div>
                      </div>

                      {/* Título y Descripción */}
                      <div className="min-w-0 space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-ronda-muted block mb-2">Título *</label>
                          <input
                            type="text"
                            placeholder="Nombre de la imagen"
                            value={uploadData.title}
                            onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-ronda-border bg-ronda-surface text-ronda-text placeholder:text-ronda-muted/60 outline-none transition focus:ring-2 focus:ring-ronda-gold focus:border-ronda-gold"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="text-xs font-semibold text-ronda-muted block mb-2">Descripción</label>
                          <textarea
                            placeholder="Descripción opcional"
                            value={uploadData.description}
                            onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                            className="h-28 w-full resize-none rounded-lg border border-ronda-border bg-ronda-surface px-3 py-2 text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold lg:h-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Segunda fila: Categoría y Tags */}
                    <div className="grid shrink-0 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-ronda-muted block mb-2">Categoría *</label>
                        <CategoryDropdown
                          value={uploadData.categoryId}
                          onChange={(categoryId) => setUploadData({ ...uploadData, categoryId })}
                          categories={categories}
                          onCreateCategory={handleCreateCategory}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-ronda-muted block mb-2">Tags</label>
                        <input
                          type="text"
                          placeholder="Escribe tags y sepáralos por ,"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagInputKeyDown}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedText = e.clipboardData.getData('text');
                            const newTags = pastedText
                              .split(',')
                              .map((tag) => tag.trim())
                              .filter((tag) => tag.length > 0 && !uploadData.tags.includes(tag));
                            if (newTags.length > 0) {
                              setUploadData({
                                ...uploadData,
                                tags: [...uploadData.tags, ...newTags],
                              });
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-ronda-border bg-ronda-surface text-ronda-text placeholder:text-ronda-muted/60 outline-none transition focus:ring-2 focus:ring-ronda-gold focus:border-ronda-gold"
                        />
                      </div>
                    </div>

                    {/* Metadatos */}
                    <div className="shrink-0">
                      <h3 className="text-xs font-semibold uppercase text-ronda-muted mb-3">Metadatos</h3>
                      {uploadData.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {uploadData.tags.map((tag, index) => (
                            <div
                              key={index}
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ronda-gold/10 text-ronda-gold text-xs font-medium"
                            >
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(index)}
                                className="hover:text-ronda-gold-dark transition"
                                aria-label="Remover tag"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-ronda-muted">Sin metadatos añadidos</p>
                      )}
                    </div>
                  </div>
                ) : isEditing && imageUrl ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-6">
                    <div className="flex items-center justify-center select-none">
                      <div ref={containerRef} className="aspect-square w-[min(400px,calc(100vw-48px))] shrink-0 overflow-hidden rounded-lg bg-ronda-bg">
                        <img
                          ref={imgRef}
                          src={imageUrl}
                          alt="Preview"
                          className={`w-full h-full object-contain ${isDraggingImage ? 'cursor-grabbing' : 'cursor-grab'}`}
                          onMouseDown={handleImageMouseDown}
                          draggable={false}
                          style={{
                            transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${cropScale / 100})`,
                            userSelect: 'none',
                            transformOrigin: 'center',
                          }}
                        />
                      </div>
                    </div>

                    <div className="w-full max-w-sm space-y-3">
                      <div>
                        <label className="text-xs text-ronda-muted block mb-2">Recortar ({cropScale}%)</label>
                        <input
                          type="range"
                          min="50"
                          max="300"
                          value={cropScale}
                          onChange={(e) => setCropScale(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="flex-1 px-4 py-2 rounded-lg border border-ronda-border text-ronda-text text-sm font-semibold transition hover:bg-ronda-bg"
                        >
                          Volver
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCropScale(100);
                            setImageOffset({ x: 0, y: 0 });
                          }}
                          className="flex-1 px-4 py-2 rounded-lg border border-ronda-border text-ronda-text text-sm font-semibold transition hover:bg-ronda-bg"
                        >
                          Resetear
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-input-library')?.click()}
                    className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed p-6 text-center transition sm:gap-6 sm:p-12 ${
                      isDragging
                        ? 'border-ronda-gold bg-ronda-gold/5'
                        : 'border-ronda-border hover:border-ronda-gold hover:bg-ronda-bg'
                    }`}
                  >
                    <div
                      className="flex flex-col items-center justify-center pointer-events-none"
                    >
                      <svg className="w-16 h-16 mx-auto text-ronda-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="mb-2 text-xl font-semibold text-ronda-muted sm:text-2xl">Arrastra una imagen aquí</p>
                      <p className="text-sm text-ronda-muted">o haz clic para seleccionar</p>
                    </div>

                    <div className="flex items-center gap-3 w-full pointer-events-none">
                      <div className="flex-1 border-t border-ronda-border/30" />
                      <p className="text-xs text-ronda-muted">o</p>
                      <div className="flex-1 border-t border-ronda-border/30" />
                    </div>

                    <div className="pointer-events-auto grid w-full max-w-xs gap-2 sm:flex" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="url"
                        placeholder="Pega la URL"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                        className="flex-1 rounded-lg border border-ronda-border bg-ronda-surface px-3 py-1.5 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
                      />
                      <button
                        type="button"
                        onClick={handleUrlSubmit}
                        disabled={!urlInput.trim()}
                        className="shrink-0 px-3 py-1.5 text-sm rounded-lg bg-ronda-gold text-white font-semibold transition hover:bg-ronda-gold-dark disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}
                <input
                  id="file-input-library"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {/* Footer */}
              <div className="flex gap-3 border-t border-ronda-border px-4 py-4 sm:justify-end sm:px-6">
                <button
                  onClick={() => {
                    if (isUploading) {
                      setIsUploading(false);
                    } else if (isEditing) {
                      handleCancel();
                    } else {
                      setOpenModal(false);
                    }
                  }}
                  className="flex-1 rounded-lg border border-ronda-border px-4 py-2 font-semibold text-ronda-text transition hover:bg-ronda-bg sm:flex-none"
                >
                  {isUploading ? 'Atrás' : 'Cancelar'}
                </button>
                {isUploading ? (
                  <button
                    onClick={handleUpload}
                    disabled={!uploadData.title || !uploadData.categoryId || isUploadingImage}
                    className="flex-1 rounded-lg bg-ronda-gold px-4 py-2 font-semibold text-white transition hover:bg-ronda-gold-dark disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                  >
                    {isUploadingImage ? 'Subiendo...' : 'Subir imagen'}
                  </button>
                ) : isEditing ? (
                  <button
                    onClick={handleSave}
                    className="flex-1 rounded-lg bg-ronda-gold px-4 py-2 font-semibold text-white transition hover:bg-ronda-gold-dark sm:flex-none"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={!imageUrl}
                    className="flex-1 rounded-lg bg-ronda-gold px-4 py-2 font-semibold text-white transition hover:bg-ronda-gold-dark disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                  >
                    Guardar
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Visualizar Imagen */}
      {selectedImage && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedImage(null)} />
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <div className="flex h-dvh w-full flex-col overflow-hidden rounded-t-2xl border border-ronda-border bg-ronda-surface shadow-xl sm:h-[90vh] sm:max-w-6xl sm:rounded-2xl lg:h-[80vh] lg:flex-row lg:overflow-visible">
              {/* Imagen - Izquierda */}
              <div className="flex min-h-0 flex-1 items-center justify-center bg-black/20 p-4 sm:p-6">
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.title}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>

              {/* Sidemenu Metadatos - Derecha */}
              <aside className="flex max-h-[48vh] w-full flex-col gap-5 overflow-y-auto overflow-x-visible border-t border-ronda-border bg-ronda-surface p-4 sm:p-6 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0 lg:gap-6">
                {/* Header con botón Cerrar */}
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold text-ronda-text flex-1">Detalles</h2>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-1 rounded-lg text-ronda-muted hover:bg-ronda-bg transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {isEditingImage ? (
                  <>
                    {/* Modo Edición */}
                    {/* Título */}
                    <div>
                      <label className="text-xs font-semibold text-ronda-muted block mb-2">Título</label>
                      <input
                        type="text"
                        value={editImageData.title}
                        onChange={(e) => setEditImageData({ ...editImageData, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-ronda-border bg-ronda-surface text-ronda-text placeholder:text-ronda-muted/60 outline-none transition focus:ring-2 focus:ring-ronda-gold focus:border-ronda-gold"
                      />
                    </div>

                    {/* Categoría */}
                    <div>
                      <label className="text-xs font-semibold text-ronda-muted block mb-2">Categoría</label>
                      <CategoryDropdown
                        value={editImageData.categoryId}
                        onChange={(categoryId) => setEditImageData({ ...editImageData, categoryId })}
                        categories={categories}
                        onCreateCategory={handleCreateCategory}
                      />
                    </div>

                    {/* Descripción */}
                    <div>
                      <label className="text-xs font-semibold text-ronda-muted block mb-2">Descripción</label>
                      <textarea
                        value={editImageData.description}
                        onChange={(e) => setEditImageData({ ...editImageData, description: e.target.value })}
                        className="w-full h-20 px-3 py-2 rounded-lg border border-ronda-border bg-ronda-surface text-ronda-text placeholder:text-ronda-muted/60 outline-none transition focus:ring-2 focus:ring-ronda-gold focus:border-ronda-gold resize-none"
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="text-xs font-semibold text-ronda-muted block mb-2">Tags</label>
                      <input
                        type="text"
                        placeholder="Escribe tags y sepáralos por ,"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const input = e.currentTarget.value.trim();
                            if (input) {
                              setEditImageData({
                                ...editImageData,
                                tags: [...editImageData.tags, input],
                              });
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pastedText = e.clipboardData.getData('text');
                          const newTags = pastedText
                            .split(',')
                            .map((tag) => tag.trim())
                            .filter((tag) => tag.length > 0);
                          if (newTags.length > 0) {
                            setEditImageData({
                              ...editImageData,
                              tags: [...editImageData.tags, ...newTags],
                            });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-ronda-border bg-ronda-surface text-ronda-text placeholder:text-ronda-muted/60 outline-none transition focus:ring-2 focus:ring-ronda-gold focus:border-ronda-gold"
                      />
                      {editImageData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {editImageData.tags.map((tag, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ronda-gold/10 text-ronda-gold text-xs font-medium"
                            >
                              {tag}
                              <button
                                onClick={() =>
                                  setEditImageData({
                                    ...editImageData,
                                    tags: editImageData.tags.filter((_, i) => i !== idx),
                                  })
                                }
                                className="hover:text-ronda-gold-dark transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Botones Guardar/Cancelar */}
                    <div className="flex gap-2 pt-4 border-t border-ronda-border">
                      <button
                        onClick={() => setIsEditingImage(false)}
                        className="flex-1 px-3 py-2 rounded-lg border border-ronda-border text-ronda-text text-sm font-semibold transition hover:bg-ronda-bg"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          if (selectedImage) {
                            // TODO: Implementar API call para guardar cambios
                            setIsEditingImage(false);
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-lg bg-ronda-gold text-white text-sm font-semibold transition hover:bg-ronda-gold-dark"
                      >
                        Guardar
                      </button>
                    </div>

                    {/* Botón Eliminar */}
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full px-3 py-2 rounded-lg bg-red-500/10 text-red-500 text-sm font-semibold transition hover:bg-red-500/20 mt-2"
                    >
                      Eliminar imagen
                    </button>
                  </>
                ) : (
                  <>
                    {/* Modo Vista */}
                    {/* Título */}
                    <div>
                      <h3 className="text-lg font-semibold text-ronda-text">{selectedImage.title}</h3>
                    </div>

                    {/* Categoría */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-ronda-muted mb-2">Categoría</p>
                      <p className="text-sm text-ronda-text">{selectedImage.category.name}</p>
                    </div>

                    {/* Descripción */}
                    {selectedImage.description && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-ronda-muted mb-2">Descripción</p>
                        <p className="text-sm text-ronda-text">{selectedImage.description}</p>
                      </div>
                    )}

                    {/* Tags */}
                    {selectedImage.tags && selectedImage.tags.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold uppercase text-ronda-muted">Tags</p>
                          <button
                            onClick={async () => {
                              const tagsText = selectedImage.tags.join(',');
                              await navigator.clipboard.writeText(tagsText);
                              addToast('Tags copiados al portapapeles', 'success');
                            }}
                            className="text-xs text-ronda-gold hover:text-ronda-gold-dark transition font-semibold"
                          >
                            Copiar
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedImage.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-3 py-1 rounded-full bg-ronda-gold/10 text-ronda-gold text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fecha */}
                    <div className="pt-4 border-t border-ronda-border">
                      <p className="text-xs font-semibold uppercase text-ronda-muted mb-2">Subida</p>
                      <p className="text-sm text-ronda-text">
                        {new Date(selectedImage.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Botón Editar */}
                    <button
                      onClick={() => setIsEditingImage(true)}
                      className="w-full px-4 py-2 rounded-lg bg-ronda-gold text-white font-semibold transition hover:bg-ronda-gold-dark"
                    >
                      Editar
                    </button>
                  </>
                )}
              </aside>
            </div>
          </div>
        </>
      )}

      {/* Modal Confirmar Eliminación */}
      {showDeleteConfirm && selectedImage && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="bg-ronda-surface rounded-2xl shadow-xl border border-ronda-border max-w-sm p-6">
              <h2 className="text-lg font-semibold text-ronda-text mb-2">Eliminar imagen</h2>
              <p className="text-sm text-ronda-muted mb-6">
                ¿Estás seguro de que quieres eliminar "{selectedImage.title}"? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-ronda-border text-ronda-text font-semibold transition hover:bg-ronda-bg"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!selectedImage) return;
                    try {
                      await deleteImage(selectedImage.id);
                      setShowDeleteConfirm(false);
                      setSelectedImage(null);
                      setImages(images.filter(img => img.id !== selectedImage.id));
                      addToast('Imagen eliminada correctamente', 'success');
                    } catch (error) {
                      addToast('Error al eliminar la imagen', 'error');
                      console.error('Failed to delete image:', error);
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-semibold transition hover:bg-red-600"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
