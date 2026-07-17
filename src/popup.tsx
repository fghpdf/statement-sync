import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ExtensionPopupMockup } from './components/ExtensionPopupMockup';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ExtensionPopupMockup />
  </StrictMode>,
);
