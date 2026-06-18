import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/Layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Pessoas } from './pages/Pessoas';
import { Produtos } from './pages/Produtos';
import { Movimentacoes } from './pages/Movimentacoes';
import { Estoque } from './pages/Estoque';
import { CodigosBarras } from './pages/CodigosBarras';
import { Relatorios } from './pages/Relatorios';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pessoas" element={<Pessoas />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/codigos-de-barras" element={<CodigosBarras />} />
          <Route path="/movimentacoes" element={<Movimentacoes />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/relatorios" element={<Relatorios />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
