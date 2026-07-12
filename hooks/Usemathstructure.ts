// hooks/useMathStructure.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { getMathStructure } from '@/lib/Mathstructure';
import type { MathStructureDoc } from '@/types/Math';

interface UseMathStructureResult {
  structure: MathStructureDoc | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useMathStructure(): UseMathStructureResult {
  const [structure, setStructure] = useState<MathStructureDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getMathStructure(nonce > 0)
      .then((data) => {
        if (!cancelled) setStructure(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { structure, loading, error, refresh };
}