import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ApplicationState } from '../../types';
import { Loader2 } from 'lucide-react';

/** 申込IDのstate を読み取り、対応するページへリダイレクトする。 */
const STATE_PATHS: Record<ApplicationState, string> = {
  S01: 'form',
  S02: 'form',
  S03: 'credit',
  S04: 'identity',
  S05: 'waiting',
  S06: 'contract',
  S07: 'complete',
  S99: 'rejected',
};

export function ApplyRedirect() {
  const { id } = useParams<{ id: string }>();
  const [path, setPath] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) {
      setError(true);
      return;
    }
    supabase
      .from('applications')
      .select('state')
      .eq('id', id)
      .single()
      .then(({ data, error: dbError }) => {
        if (dbError || !data) {
          setError(true);
          return;
        }
        setPath(STATE_PATHS[data.state as ApplicationState] ?? 'form');
      });
  }, [id]);

  if (error) return <Navigate to="/" replace />;
  if (!path) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return <Navigate to={`/apply/${id}/${path}`} replace />;
}
