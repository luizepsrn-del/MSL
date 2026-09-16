import { Routes, Route, Navigate } from 'react-router-dom';
import { Casca } from './casca/Casca';
import { PILAR_INICIAL } from './casca/navegacao';
import { Showcase } from './routes/Showcase';

/**
 * As rotas do sistema.
 *
 * Cada pilar tem URL própria (`/app/tarefas`), o que o AdminShell nunca teve —
 * ele roteava por estado local. URL própria é o que permite abrir direto no
 * telefone, voltar pelo botão do navegador e instalar atalho para uma área.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/app/${PILAR_INICIAL}`} replace />} />
      <Route path="/app" element={<Navigate to={`/app/${PILAR_INICIAL}`} replace />} />
      <Route path="/app/:pilar" element={<Casca />} />
      <Route path="/design-system" element={<Showcase />} />
      <Route path="*" element={<Navigate to={`/app/${PILAR_INICIAL}`} replace />} />
    </Routes>
  );
}
