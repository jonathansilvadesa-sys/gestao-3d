import { useState } from 'react';
import { useAuth }        from '@/contexts/AuthContext';
import { useProducts }    from '@/contexts/ProductContext';
import { LoginPage }      from '@/components/auth/LoginPage';
import { Header }         from '@/components/layout/Header';
import { Dashboard }      from '@/components/dashboard/Dashboard';
import { ProductsTab }    from '@/components/products/ProductsTab';
import { EstoqueTab }     from '@/components/estoque/EstoqueTab';
import { MateriaisTab }   from '@/components/materiais/MateriaisTab';
import { ProductModal }   from '@/components/products/ProductModal';
import { EditMarkupModal } from '@/components/products/EditMarkupModal';
import { NovaModal }      from '@/components/products/NovaModal';
import type { AppTab, Product } from '@/types';

export default function App() {
  const { isAuthenticated }                                     = useAuth();
  const { products, addProduct, updateProduct, removeProduct }  = useProducts();

  const [tab, setTab]                     = useState<AppTab>('dashboard');
  const [selected, setSelected]           = useState<Product | null>(null);
  const [editingMarkup, setEditingMarkup] = useState<Product | null>(null);
  const [showNova, setShowNova]           = useState(false);

  if (!isAuthenticated) return <LoginPage />;

  const totalEstoque = products.reduce((a, p) => a + (p.estoque ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header
        tab={tab}
        setTab={setTab}
        totalEstoque={totalEstoque}
        onNovaPeca={() => setShowNova(true)}
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {tab === 'dashboard' && (
          <Dashboard
            products={products}
            onSelect={setSelected}
            onEditMarkup={setEditingMarkup}
          />
        )}
        {tab === 'produtos' && (
          <ProductsTab
            products={products}
            onSelect={setSelected}
            onEditMarkup={setEditingMarkup}
            onRemove={removeProduct}
          />
        )}
        {tab === 'materiais' && <MateriaisTab />}
        {tab === 'estoque' && (
          <EstoqueTab
            products={products}
            onUpdateEstoque={(id, qty) => updateProduct(id, { estoque: qty })}
          />
        )}
      </main>

      {selected && (
        <ProductModal product={selected} onClose={() => setSelected(null)} />
      )}
      {editingMarkup && (
        <EditMarkupModal
          product={editingMarkup}
          onClose={() => setEditingMarkup(null)}
          onSave={updateProduct}
        />
      )}
      {showNova && (
        <NovaModal onClose={() => setShowNova(false)} onAdd={addProduct} />
      )}
    </div>
  );
}
