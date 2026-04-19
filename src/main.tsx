import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider }      from '@/contexts/AuthContext';
import { SettingsProvider }  from '@/contexts/SettingsContext';
import { ProductProvider }   from '@/contexts/ProductContext';
import { MaterialProvider }  from '@/contexts/MaterialContext';
import { CanaisProvider }    from '@/contexts/CanaisContext';
import { AcessorioProvider } from '@/contexts/AcessorioContext';
import { ThemeProvider }     from '@/contexts/ThemeContext';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <CanaisProvider>
            <ProductProvider>
              <MaterialProvider>
                <AcessorioProvider>
                  <App />
                </AcessorioProvider>
              </MaterialProvider>
            </ProductProvider>
          </CanaisProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
