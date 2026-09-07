import { useState, useEffect } from 'react';
import { getBoundary } from '@/lib/api';

export function useBoundaries() {
  const [data, setData] = useState<{
    mpas: any | null;
    eez: any | null;
    imbl: any | null;
  }>({
    mpas: null,
    eez: null,
    imbl: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchBoundaries() {
      try {
        setLoading(true);
        const [mpas, eez, imbl] = await Promise.all([
          getBoundary('mpas').catch(() => null),
          getBoundary('eez').catch(() => null),
          getBoundary('imbl').catch(() => null),
        ]);

        if (mounted) {
          setData({ mpas, eez, imbl });
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to fetch boundaries');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchBoundaries();

    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error };
}
