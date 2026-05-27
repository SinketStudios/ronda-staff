const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getCategories(): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`${API_URL}/internal/library/categories`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function createCategory(name: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`${API_URL}/internal/library/categories`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create category');
  return res.json();
}

export async function uploadImage(
  file: File,
  title: string,
  description: string,
  categoryId: string,
  tags: string[],
): Promise<{ id: string; imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('description', description);
  formData.append('categoryId', categoryId);
  formData.append('tags', tags.join(','));

  const res = await fetch(`${API_URL}/internal/library/images/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to upload image');
  }

  return res.json();
}

export interface LibraryImage {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  tags: string[];
  category: { id: string; name: string };
  createdAt: string;
}

export async function getImages(): Promise<LibraryImage[]> {
  const res = await fetch(`${API_URL}/internal/library/images`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch images');
  return res.json();
}

export async function deleteImage(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/internal/library/images/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete image');
}
