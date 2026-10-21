import { lazy, Suspense, useMemo, useState } from 'react';
import './App.css';
import { Login } from './components/Login';
import { SummaryBar } from './components/SummaryBar';
import { TipForm } from './components/TipForm';
import { TipList } from './components/TipList';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { useSession } from './hooks/useSession';
import { useTips } from './hooks/useTips';
import { normalizeSource } from './lib/sources';
import { supabase } from './lib/supabase';
import type { Tip } from './types';

const ChartsSection = lazy(() =>
  import('./components/ChartsSection').then((m) => ({ default: m.ChartsSection }))
);

function App() {
  const { session, loading: sessionLoading } = useSession();

  if (sessionLoading) return null;
  if (!session) return <Login />;

  return <TipApp />;
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function TipApp() {
  const { verboseMode, chartsEnabled } = useSession();
  const { tips, loading, error, reload, create, createVerbose, update, remove, sessionTipIds } = useTips();
  const [editingTip, setEditingTip] = useState<Tip | null>(null);
  const [chartsExpanded, setChartsExpanded] = useState(false);

  const [dateFilter, setDateFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { pulling, distance, refreshing, threshold } = usePullToRefresh(reload);

  const knownSources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tip of tips) {
      if (!tip.source) continue;
      const key = normalizeSource(tip.source);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([source]) => source);
  }, [tips]);

  const dateOptions = useMemo(() => {
    const years = new Set<string>();
    const months = new Set<string>();
    for (const tip of tips) {
      const ym = tip.date.slice(0, 7);
      years.add(tip.date.slice(0, 4));
      months.add(ym);
    }
    return {
      years: [...years].sort().reverse(),
      months: [...months].sort().reverse(),
    };
  }, [tips]);

  // Charts get date+source filtering only - a category filter would leave the
  // Tips vs Wages chart with a single bar.
  const chartTips = useMemo(
    () =>
      tips.filter(
        (tip) =>
          (!dateFilter || tip.date.startsWith(dateFilter)) && (!sourceFilter || normalizeSource(tip.source) === sourceFilter)
      ),
    [tips, dateFilter, sourceFilter]
  );

  const filteredTips = useMemo(() => {
    return chartTips.filter((tip) => {
      if (categoryFilter) {
        if (categoryFilter === 'Tips' || categoryFilter === 'Wages') {
          if (tip.category !== categoryFilter) return false;
        } else {
          if (tip.shiftType !== categoryFilter) return false;
        }
      }
      return true;
    });
  }, [chartTips, categoryFilter]);

  const isFiltered = dateFilter || sourceFilter || categoryFilter;

  return (
    <div className="app">
      {(pulling || refreshing) && (
        <div
          className={'pull-indicator' + (refreshing ? ' pull-indicator--refreshing' : '')}
          style={pulling ? { height: distance } : undefined}
        >
          <span
            className="pull-indicator__arrow"
            style={pulling ? { transform: `rotate(${distance >= threshold ? 180 : 0}deg)` } : undefined}
          >
            {refreshing ? '↻' : '↓'}
          </span>
        </div>
      )}

      <header className="app__header">
        <h1>Tips</h1>
        <button className="app__signout" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>

      <SummaryBar tips={tips} />

      <div className="tip-filters">
        <select
          className="tip-filters__select"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="">All time</option>
          <optgroup label="Year">
            {dateOptions.years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </optgroup>
          <optgroup label="Month">
            {dateOptions.months.map((ym) => (
              <option key={ym} value={ym}>{formatMonthLabel(ym)}</option>
            ))}
          </optgroup>
        </select>

        <select
          className="tip-filters__select"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="">All sources</option>
          {knownSources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          className="tip-filters__select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All types</option>
          <option value="Tips">Tips</option>
          <option value="Wages">Wages</option>
          {verboseMode && <option value="bar">Bar</option>}
          {verboseMode && <option value="floor">Floor</option>}
        </select>
      </div>

      {chartsEnabled && (
        <div className="charts-toggle">
          <button
            type="button"
            className="charts-toggle__button"
            onClick={() => setChartsExpanded((v) => !v)}
            aria-expanded={chartsExpanded}
          >
            Charts
            <span className="charts-toggle__chevron" aria-hidden="true">
              {chartsExpanded ? '▲' : '▼'}
            </span>
          </button>
          {chartsExpanded && (
            <Suspense fallback={null}>
              <ChartsSection
                tips={chartTips}
                dateFilter={dateFilter}
                periodLabel={
                  dateFilter.length === 7 ? formatMonthLabel(dateFilter) : dateFilter || 'All time'
                }
              />
            </Suspense>
          )}
        </div>
      )}

      <TipForm
        key={editingTip?.id ?? 'new'}
        onSubmit={create}
        knownSources={knownSources}
        verboseMode={verboseMode}
        onSubmitVerbose={createVerbose}
        editing={
          editingTip
            ? {
                tip: editingTip,
                onSave: async (tip) => {
                  await update(tip);
                  setEditingTip(null);
                },
                onCancel: () => setEditingTip(null),
              }
            : undefined
        }
      />

      {error && <p className="app__error">{error}</p>}
      {loading ? (
        <p className="app__loading">Loading...</p>
      ) : (
        <>
          {isFiltered && (
            <p className="tip-list__filter-count">
              Showing {filteredTips.length} of {tips.length}
            </p>
          )}
          <TipList
            tips={filteredTips}
            onDelete={(id) => {
              if (editingTip?.id === id) setEditingTip(null);
              remove(id);
            }}
            onEdit={(tip) => {
              setEditingTip(tip);
              document.querySelector('.tip-form')?.scrollIntoView({ behavior: 'smooth' });
            }}
            sessionTipIds={sessionTipIds}
          />
        </>
      )}
    </div>
  );
}

export default App;
