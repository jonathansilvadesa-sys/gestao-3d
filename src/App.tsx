import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useAuth }           from '@/contexts/AuthContext';
import { useTenant }         from '@/contexts/TenantContext';
import { useProducts }       from '@/contexts/ProductContext';
import { useSettings }       from '@/contexts/SettingsContext';
import { useAcessorios }     from '@/contexts/AcessorioContext';
import { useMaterials }      from '@/contexts/MaterialContext';
import { useToast }          from '@/contexts/ToastContext';
import { useTour }           from '@/contexts/TourContext';
import { usePermissions }    from '@/contexts/PermissionsContext';
import { LoginPage }         from '@/components/auth/LoginPage';
import { SignupPage }        from '@/components/auth/SignupPage';
import { OnboardingTenant }  from '@/components/auth/OnboardingTenant';
import { Header }            from '@/components/layout/Header';
import { Dashboard }         from '@/components/dashboard/Dashboard';
import { ProductsTab }       from '@/components/products/ProductsTab';
import { EstoqueTab }        from '@/components/estoque/EstoqueTab';
import { MateriaisTab }      from '@/components/materiais/MateriaisTab';
import { PedidosTab }        from '@/components/pedidos/PedidosTab';
import { FloatingHelpButton }  from '@/components/shared/FloatingHelpButton';
import { BottomTabBar }         from '@/components/layout/BottomTabBar';
import { QuickActionFAB }       from '@/components/shared/QuickActionFAB';
import { GlobalSearch }         from '@/components/shared/GlobalSearch';
import { SkeletonDashboard }    from '@/components/shared/Skeleton';
import { OfflineBanner }        from '@/components/shared/OfflineBanner';
import { pedirPermissaoNotificacao, notificarEstoqueZerado } from '@/utils/notifications';
import type { AppTab, Product, EstoqueMovimento } from '@/types';

// ── Lazy loading — modais só carregam quando abertos ─────────────────────────
const ProductModal     = lazy(() => import('@/components/products/ProductModal').then((m) => ({ default: m.ProductModal })));
const EditProductModal = lazy(() => import('@/components/products/EditProductModal').then((m) => ({ default: m.EditProductModal })));
const NovaModal        = lazy(() => import('@/components/products/NovaModal').then((m) => ({ default: m.NovaModal })));
const ImportModal      = lazy(() => import('@/components/products/ImportModal').then((m) => ({ default: m.ImportModal })));


export default function App() {
  const { isAuthenticated, authLoading, user }                  = useAuth();
  const { needsTenantSetup, tenantLoading }                     = useTenant();
  const { products, addProduct, updateProduct, removeProduct }  = useProducts();
  const { registrarVenda }                                      = useSettings();
  const { addMovimento }                                        = useAcessorios();
  const { materials, updateMaterial }                           = useMaterials();
  const { addToast }                                            = useToast();
  const { startTour, tourCompleted, registerNavigate }          = useTour();
  const { can }                                                 = usePermissions();

  const [authView, setAuthView]          = useState<'login' | 'signup'>('login');
  const [tab, setTab]                   = useState<AppTab>('dashboard');
  const [selected, setSelected]         = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showNova, setShowNova]         = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [showSearch, setShowSearch]     = useState(false);
  const [appReady, setAppReady]         = useState(false);

  // ── Primeiro render: mostrar skeleton por 1 ciclo de RAF ──────────────────
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAppReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Atalho Cmd/Ctrl+K para abrir busca global ─────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ── Pedir permissão de notificação após autenticação ──────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      // Pequeno delay para não sobrepor o onboarding tour
      const t = setTimeout(() => pedirPermissaoNotificacao(), 3000);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated]);

  const totalEstoque = products.reduce((a, p) => a + (p.estoque ?? 0), 0);

  // Injeta a função de navegação de aba no TourContext (uma vez na montagem)
  useEffect(() => {
    registerNavigate(setTab);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-inicia o tour na primeira vez que o usuário faz login
  useEffect(() => {
    if (isAuthenticated && !tourCompleted) {
      // Pequeno delay para o DOM estar pronto com os data-tour targets
      const t = setTimeout(() => startTour(), 800);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Contagem de alertas de break-even para o sininho do Header
  const breakEvenCount = useMemo(() => products.filter((p) => {
    if (p.lucroLiquidoConsumidor <= 0) return false;
    const lote = (p.estoque ?? 0) > 0 ? (p.estoque ?? 0) : p.unidades;
    if (lote <= 0) return false;
    const bk = Math.ceil((p.custoUn * lote) / p.lucroLiquidoConsumidor);
    return (p.estoque ?? 0) < bk;
  }).length, [products]);

  // Mensagem de conexão lenta após 3 s na tela de loading
  const [loadingSlow, setLoadingSlow] = useState(false);
  useEffect(() => {
    if (!authLoading && !(isAuthenticated && tenantLoading)) return;
    const t = setTimeout(() => setLoadingSlow(true), 3000);
    return () => clearTimeout(t);
  }, [authLoading, isAuthenticated, tenantLoading]);

  // Aguarda Supabase verificar sessão + tenant antes de decidir o que mostrar
  if (authLoading || (isAuthenticated && tenantLoading)) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center shadow-2xl">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl animate-pulse flex items-center justify-center text-xl">🖨</div>
        </div>
        <p className="text-white/80 text-sm font-medium tracking-wide">Carregando…</p>
        {loadingSlow && (
          <p className="text-white/40 text-xs text-center max-w-[200px] leading-relaxed">
            Conectando ao servidor…<br />Pode levar alguns segundos.
          </p>
        )}
      </div>
    </div>
  );

  if (!isAuthenticated) {
    if (authView === 'signup') return <SignupPage onBack={() => setAuthView('login')} />;
    return <LoginPage onShowSignup={() => setAuthView('signup')} />;
  }

  // Developer sem empresa configurada: pula onboarding, usa o DeveloperPanel para criar
  // Usuários normais sem empresa → onboarding obrigatório
  if (needsTenantSetup && user?.role !== 'developer') return <OnboardingTenant />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      {/* Banner de modo offline */}
      <OfflineBanner />

      <Header
        tab={tab}
        setTab={setTab}
        totalEstoque={totalEstoque}
        onNovaPeca={can('manage_products') ? () => setShowNova(true) : () => {}}
        onSearch={() => setShowSearch(true)}
        breakEvenCount={breakEvenCount}
      />

      {/* pb-24 no mobile: espaço para a BottomTabBar */}
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6 space-y-6">
        {/* Skeleton durante o primeiro render */}
        {!appReady && <SkeletonDashboard />}

        {/* Conteúdo real — key no tab dispara a animação de entrada */}
        {appReady && (
          <div key={tab} className="tab-enter space-y-6">
            {tab === 'dashboard' && (
              <Dashboard
                products={products}
                onSelect={setSelected}
                onEdit={setEditingProduct}
              />
            )}
        {tab === 'produtos' && (
          <ProductsTab
            products={products}
            onSelect={setSelected}
            onEdit={can('manage_products') ? setEditingProduct : undefined}
            onRemove={can('manage_products') ? removeProduct : () => {}}
            onImport={can('import_export_data') ? () => setShowImport(true) : undefined}
          />
        )}
            {tab === 'materiais' && <MateriaisTab />}
            {tab === 'pedidos'   && <PedidosTab />}
            {tab === 'estoque' && (
              <EstoqueTab
            products={products}

            // ── Produção: soma ao estoque + deduz filamentos ──────────────────
            onProduzir={(id, qty) => {
              const product = products.find((p) => p.id === id);
              if (!product || qty <= 0) return;

              // Deduz peso dos filamentos vinculados
              product.filamentos.forEach((fl) => {
                if (fl.materialId != null) {
                  const mat = materials.find((m) => m.id === fl.materialId);
                  if (mat) {
                    updateMaterial(fl.materialId, {
                      pesoAtual: Math.max(0, +(mat.pesoAtual - fl.peso * qty).toFixed(1)),
                    });
                  }
                }
              });

              // Registra movimento e atualiza estoque + contador produzidas
              const mov: EstoqueMovimento = {
                id: `em_${Date.now()}`,
                tipo: 'producao',
                quantidade: qty,
                data: new Date().toISOString(),
                motivo: `Produção de ${qty} un.`,
              };
              updateProduct(id, {
                estoque: (product.estoque ?? 0) + qty,
                unidadesProduzidas: (product.unidadesProduzidas ?? 0) + qty,
                movimentosEstoque: [mov, ...(product.movimentosEstoque ?? [])].slice(0, 50),
              });
              // Toast de confirmação com resumo do abatimento de filamentos
              const nomesFil = product.filamentos
                .filter((fl) => fl.materialId != null)
                .map((fl) => {
                  const m = materials.find((x) => x.id === fl.materialId);
                  return m ? `${(fl.peso * qty).toFixed(1)}g de ${m.nome}` : null;
                })
                .filter(Boolean)
                .join(', ');
              addToast(
                nomesFil
                  ? `✅ ${qty} un. produzida${qty > 1 ? 's' : ''}! Descontado: ${nomesFil}`
                  : `✅ ${qty} un. de "${product.nome}" adicionada${qty > 1 ? 's' : ''} ao estoque`,
                'success',
              );
            }}

            // ── Venda: subtrai do estoque + registra faturamento + deduz acessórios
            onVender={(id, qty) => {
              const product = products.find((p) => p.id === id);
              if (!product || qty <= 0) return;
              const vendendo = Math.min(qty, product.estoque ?? 0);
              if (vendendo <= 0) return;

              // Registra faturamento
              registrarVenda(vendendo * product.precoConsumidor);

              // Deduz acessórios vinculados do catálogo
              product.acessorios.forEach((a) => {
                if (a.catalogId && a.varianteId) {
                  addMovimento(a.catalogId, {
                    tipo: 'saida',
                    varianteId: a.varianteId,
                    quantidade: vendendo * a.qtd,
                    motivo: `Venda de ${vendendo} un. de ${product.nome}`,
                  });
                }
              });

              // Registra movimento e atualiza estoque + totalVendido
              const mov: EstoqueMovimento = {
                id: `em_${Date.now()}`,
                tipo: 'venda',
                quantidade: vendendo,
                data: new Date().toISOString(),
                motivo: `Venda de ${vendendo} un.`,
              };
              const novoEstoque = (product.estoque ?? 0) - vendendo;
              updateProduct(id, {
                estoque: novoEstoque,
                totalVendido: (product.totalVendido ?? 0) + vendendo,
                movimentosEstoque: [mov, ...(product.movimentosEstoque ?? [])].slice(0, 50),
              });
              // Notificação PWA quando estoque zerar
              if (novoEstoque <= 0) {
                notificarEstoqueZerado(product.nome);
              }
              // Toast de confirmação de venda
              const nomesAcc = product.acessorios
                .filter((a) => a.catalogId && a.varianteId)
                .map((a) => a.nome)
                .filter(Boolean)
                .join(', ');
              addToast(
                nomesAcc
                  ? `🏷️ Venda de ${vendendo} un.! Acessórios descontados: ${nomesAcc}`
                  : `🏷️ Venda de ${vendendo} un. de "${product.nome}" registrada`,
                'success',
              );
            }}

            // ── Falha de impressão: deduz filamento, não mexe em acessórios ──
            onFalha={(id, qty) => {
              const product = products.find((p) => p.id === id);
              if (!product || qty <= 0) return;

              // Deduz peso dos filamentos (material foi consumido na tentativa)
              product.filamentos.forEach((fl) => {
                if (fl.materialId != null) {
                  const mat = materials.find((m) => m.id === fl.materialId);
                  if (mat) {
                    updateMaterial(fl.materialId, {
                      pesoAtual: Math.max(0, +(mat.pesoAtual - fl.peso * qty).toFixed(1)),
                    });
                  }
                }
              });

              // Registra movimento, incrementa contadores (sem alterar estoque de peças prontas)
              const mov: EstoqueMovimento = {
                id: `em_${Date.now()}`,
                tipo: 'falha',
                quantidade: qty,
                data: new Date().toISOString(),
                motivo: `Falha de impressão: ${qty} un. perdida${qty !== 1 ? 's' : ''}`,
              };
              updateProduct(id, {
                unidadesPerdidas: (product.unidadesPerdidas ?? 0) + qty,
                unidadesProduzidas: (product.unidadesProduzidas ?? 0) + qty, // também conta como tentativa
                movimentosEstoque: [mov, ...(product.movimentosEstoque ?? [])].slice(0, 50),
              });
              // Toast de falha
              const nomesFalha = product.filamentos
                .filter((fl) => fl.materialId != null)
                .map((fl) => {
                  const m = materials.find((x) => x.id === fl.materialId);
                  return m ? `${(fl.peso * qty).toFixed(1)}g de ${m.nome}` : null;
                })
                .filter(Boolean)
                .join(', ');
              addToast(
                nomesFalha
                  ? `⚠️ Falha registrada. Filamento consumido: ${nomesFalha}`
                  : `⚠️ Falha de ${qty} un. de "${product.nome}" registrada`,
                'warning',
              );
            }}

            // ── Ajuste manual: seta diretamente, sem gatilhos de insumos ─────
            onAjustar={can('adjust_stock') ? (id, qty) => {
              const product = products.find((p) => p.id === id);
              if (!product) return;
              const mov: EstoqueMovimento = {
                id: `em_${Date.now()}`,
                tipo: 'ajuste',
                quantidade: qty,
                data: new Date().toISOString(),
                motivo: `Ajuste manual → ${qty} un.`,
              };
              updateProduct(id, {
                estoque: Math.max(0, qty),
                movimentosEstoque: [mov, ...(product.movimentosEstoque ?? [])].slice(0, 50),
              });
            } : undefined}
            />
          )}
          </div>
        )}
      </main>

      {/* ── Modais lazy ──────────────────────────────────────────────────── */}
      <Suspense fallback={null}>
        {selected && (
          <ProductModal product={selected} onClose={() => setSelected(null)} />
        )}
        {editingProduct && (
          <EditProductModal
            product={editingProduct}
            onClose={() => setEditingProduct(null)}
            onSave={(id, updates) => { updateProduct(id, updates); setEditingProduct(null); }}
          />
        )}
        {showNova && (
          <NovaModal onClose={() => setShowNova(false)} onAdd={addProduct} />
        )}
        {showImport && (
          <ImportModal onClose={() => setShowImport(false)} />
        )}
      </Suspense>

      {/* ── Busca global ─────────────────────────────────────────────────── */}
      {showSearch && (
        <GlobalSearch
          products={products}
          materials={materials}
          onNavigate={(t) => setTab(t)}
          onSelectProduct={(p) => { setSelected(p); }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Botão flutuante (?) — no mobile sobe para não sobrepor a BottomTabBar */}
      <FloatingHelpButton />

      {/* BottomTabBar — só mobile */}
      <BottomTabBar
        tab={tab}
        setTab={setTab}
        totalEstoque={totalEstoque}
      />

      {/* FAB de ação rápida — só mobile */}
      <QuickActionFAB
        products={products}
        onProduzir={(id, qty) => {
          const product = products.find((p) => p.id === id);
          if (!product || qty <= 0) return;
          product.filamentos.forEach((fl) => {
            if (fl.materialId != null) {
              const mat = materials.find((m) => m.id === fl.materialId);
              if (mat) {
                updateMaterial(fl.materialId, {
                  pesoAtual: Math.max(0, +(mat.pesoAtual - fl.peso * qty).toFixed(1)),
                });
              }
            }
          });
          const mov: EstoqueMovimento = {
            id: `em_${Date.now()}`,
            tipo: 'producao',
            quantidade: qty,
            data: new Date().toISOString(),
            motivo: `Produção rápida de ${qty} un. (FAB)`,
          };
          updateProduct(id, {
            estoque: (product.estoque ?? 0) + qty,
            unidadesProduzidas: (product.unidadesProduzidas ?? 0) + qty,
            movimentosEstoque: [...(product.movimentosEstoque ?? []), mov],
          });
          const nomes = product.filamentos
            .filter((fl) => fl.materialId != null)
            .map((fl) => {
              const mat = materials.find((m) => m.id === fl.materialId);
              return mat ? `${(fl.peso * qty).toFixed(1)}g de ${mat.nome}` : null;
            })
            .filter(Boolean);
          addToast(
            nomes.length
              ? `+${qty} ${product.nome} · ${nomes.join(', ')}`
              : `+${qty} ${product.nome} adicionado(s) ao estoque`,
            'success'
          );
        }}
        onFalha={(id, qty) => {
          const product = products.find((p) => p.id === id);
          if (!product || qty <= 0) return;
          product.filamentos.forEach((fl) => {
            if (fl.materialId != null) {
              const mat = materials.find((m) => m.id === fl.materialId);
              if (mat) {
                updateMaterial(fl.materialId, {
                  pesoAtual: Math.max(0, +(mat.pesoAtual - fl.peso * qty).toFixed(1)),
                });
              }
            }
          });
          const mov: EstoqueMovimento = {
            id: `em_${Date.now()}`,
            tipo: 'falha',
            quantidade: qty,
            data: new Date().toISOString(),
            motivo: `Falha registrada via FAB`,
          };
          updateProduct(id, {
            unidadesProduzidas: (product.unidadesProduzidas ?? 0) + qty,
            unidadesPerdidas: (product.unidadesPerdidas ?? 0) + qty,
            movimentosEstoque: [...(product.movimentosEstoque ?? []), mov],
          });
          addToast(`💀 ${qty} falha(s) de ${product.nome} registrada(s)`, 'warning');
        }}
        onNovaPeca={() => setShowNova(true)}
      />
    </div>
  );
}
