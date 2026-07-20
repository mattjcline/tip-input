import './App.css';
import { SummaryBar } from './components/SummaryBar';
import { TipForm } from './components/TipForm';
import { TipList } from './components/TipList';
import { useTips } from './hooks/useTips';

function App() {
  const { tips, loading, error, create, remove } = useTips();

  return (
    <div className="app">
      <header className="app__header">
        <h1>Tips</h1>
      </header>

      <SummaryBar tips={tips} />

      <TipForm onSubmit={create} />

      {error && <p className="app__error">{error}</p>}
      {loading ? <p className="app__loading">Loading…</p> : <TipList tips={tips} onDelete={remove} />}
    </div>
  );
}

export default App;
