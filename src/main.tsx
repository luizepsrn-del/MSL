import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// The design system's stylesheet is imported once, here, and nowhere else.
import '../design-system/styles.css';

import { ThemeProvider } from './theme';
import { ProvedorBanco } from './dados/BancoContexto';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ProvedorBanco>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ProvedorBanco>
    </ThemeProvider>
  </React.StrictMode>,
);
