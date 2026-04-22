import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider }      from '@/contexts/AuthContext';
import { TenantProvider }    from '@/contexts/TenantContext';
import { SettingsProvider }  from '@/contexts/SettingsContext';
import { ProductProvider }   from '@/contexts/ProductContext';
import { MaterialProvider }  from '@/contexts/MaterialContext';
import { CanaisProvider }    from '@/contexts/CanaisContext';
import { AcessorioProvider } from '@/contexts/AcessorioContext';
import { ThemeProvider }     from '@/contexts/ThemeContext';
import { HardwareProvider }  from '@/contexts/HardwareContext';
import { PedidosProvider }   from '@/contexts/PedidosContext';
import { ToastProvider }     from '@/contexts/ToastContext';
import { TourProvider }      from '@/contexts/TourContext';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        {/* TenantProvider usa useAuth() internamente — fica dentro de AuthProvider */}
        <TenantProvider>
          <SettingsProvider>
            <CanaisProvider>
              <ProductProvider>
                <MaterialProvider>
                  <AcessorioProvider>
                    <HardwareProvider>
                      <PedidosProvider>
                        <ToastProvider>
                          <TourProvider>
                            <App />
                          </TourProvider>
                        </ToastProvider>
                      </PedidosProvider>
                    </HardwareProvider>
                  </AcessorioProvider>
                </MaterialProvider>
              </ProductProvider>
            </CanaisProvider>
          </SettingsProvider>
        </TenantProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
