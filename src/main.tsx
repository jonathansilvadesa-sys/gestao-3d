import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider }     from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ProductProvider }  from '@/contexts/ProductContext';
import { MaterialProvider } from '@/contexts/MaterialContext';
import { CanaisProvider }   from '@/contexts/CanaisContext';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <CanaisProvider>
          <ProductProvider>
            <MaterialProvider>
              <App />
            </MaterialProvider>
          </ProductProvider>
        </CanaisProvider>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>
);
