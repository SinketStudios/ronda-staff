'use client';

import { useEffect } from 'react';
import { getStaffMe } from '@/lib/api';

export function AuthSessionRedirect() {
  useEffect(() => {
    let cancelled = false;

    async function redirectIfAuthenticated() {
      const staff = await getStaffMe();
      if (!cancelled && staff) {
        window.location.replace('/dashboard');
      }
    }

    const handlePageShow = () => {
      void redirectIfAuthenticated();
    };

    void redirectIfAuthenticated();
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      cancelled = true;
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return null;
}
