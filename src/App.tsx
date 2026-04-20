import { useState, useMemo, useEffect } from 'react';
import { useAuth }           from '@/contexts/AuthContext';
import { useProducts }       from '@/contexts/ProductContext';
import { useSettings }       from '@/contexts/SettingsContext';
import { useAcessorios }     from '@/contexts/AcessorioContext';
import { useMaterials }      from '@/contexts/MaterialContext';
import { useToast }          from '@/contexts/ToastContext';
import { useTour }           from '@/contexts/TourContext';
import { LoginPage }         from '@/components/auth/LoginPage';
import { Header }            from '@/components/layout/Header';
import { Dashboard }         from '@/components/dashboard/Dashboard';
import { ProductsTab }       from '@/components/products/ProductsTab';
import { EstoqueTab }        from '@/components/estoque/EstoqueTab';
import { MateriaisTab }      from '@/components/materiais/MateriaisTab';
import { ProductModal }      from '@/components/products/ProductModal';
import { EditProductModal }  from '@/components/products/EditProductModal';
import { NovaModal }           from '@/components/products/NovaModal';
import { FloatingHelpButton }  from '@/components/shared/FloatingHelpButton';
import type { AppTab, Product, EstoqueMovimento } from '@/types';


export default function App() {
  const { isAuthenticated }                                     = useAuth();
  const { products, addProduct, updateProduct, removeProduct }  = useProducts();
  const { registrarVenda }                                      = useSettings();
  const { addMovimento }                                        = useAcessorios();
  const { materials, updateMaterial }                           = useMaterials();
  const { addToast }                                            = useToast();
  const { startTour, tourCompleted, registerNavigate }          = useTour();

  const [tab, setTab]                   = useState<AppTab>('dashboard');
  const [selected, setSelected]         = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showNova, setShowNova]         = useState(false);

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

  if (!isAuthenticated) return <LoginPage />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      <Header
        tab={tab}
        setTab={setTab}
        totalEstoque={totalEstoque}
        onNovaPeca={() => setShowNova(true)}
        breakEvenCount={breakEvenCount}
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
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
            onEdit={setEditingProduct}
            onRemove={removeProduct}
          />
        )}
        {tab === 'materiais' && <MateriaisTab />}
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
              updateProduct(id, {
                estoque: (product.estoque ?? 0) - vendendo,
                totalVendido: (product.totalVendido ?? 0) + vendendo,
                movimentosEstoque: [mov, ...(product.movimentosEstoque ?? [])].slice(0, 50),
              });
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
            onAjustar={(id, qty) => {
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
            }}
          />
        )}
      </main>

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

      {/* Botão flutuante (?) para relançar o tour */}
      <FloatingHelpButton />
    </div>
  );
}
