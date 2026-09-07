import { useState, useEffect } from 'react';
import { getFullReport } from '../lib/api';
import type { FullReportResponse } from '../lib/api';

export function useOrcaAPI(lat: number | null, lon: number | null) {
  const [data, setData] = useState<FullReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat === null || lon === null) {
      setLoading(true);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getFullReport(lat, lon)
      .then((report) => {
        if (isMounted) {
          setData(report);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [lat, lon]);

  return { data, loading, error };
}
