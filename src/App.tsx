import { useMemo } from 'react';
import './App.css';
import { Login } from './components/Login';
import { SummaryBar } from './components/SummaryBar';
import { TipForm } from './components/TipForm';
import { TipList } from './components/TipList';
import { useSession } from './hooks/useSession';
import { useTips } from './hooks/useTips';
import { supabase } from './lib/supabase';

function App() {
  const { session, loading: sessionLoading } = useSession();

  if (sessionLoading) return null;
  if (!session) return <Login />;

  return <TipApp />;
}

function TipApp() {
  const { verboseMode } = useSession();
  const { tips, loading, error, create, createVerbose, remove } = useTips();

  const knownSources = useMemo(() => {
    // Historical entries mix straight and curly apostrophes for the same
    // source ("Louie's" vs "Louie's") - normalize so they merge into one
    // suggestion instead of showing as near-duplicates.
    const normalize = (s: string) => s.replace(/[‘’]/g, "'");
    const counts = new Map<string, number>();
    for (const tip of tips) {
      if (!tip.source) continue;
      const key = normalize(tip.source);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([source]) => source);
  }, [tips]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Tips</h1>
        <button className="app__signout" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>

      <SummaryBar tips={tips} />

      <TipForm
        onSubmit={create}
        knownSources={knownSources}
        verboseMode={verboseMode}
        onSubmitVerbose={createVerbose}
      />

      {error && <p className="app__error">{error}</p>}
      {loading ? <p className="app__loading">Loading…</p> : <TipList tips={tips} onDelete={remove} />}
    </div>
  );
}

export default App;
