import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

// ─── dados iniciais ─────────────────────────────────────────────────────────
const initialProducts = [
  {
    id: 1, nome: "Pikachu", tempo: 20, peso: 379, unidades: 25,
    filamentoCustoKg: 99, custoFilamento: 37.52, potenciaW: 350, custoKwh: 0.84,
    custoEnergia: 2.94, amortizacao: 6.0, custoFixoMes: 300, unidadesMes: 10,
    acessorios: [{ nome: "Embalagem", qtd: 25, custoUn: 1.0 }, { nome: "Chaveiro", qtd: 25, custoUn: 1.0 }],
    markup: 8, falhas: 15, imposto: 8, txCartao: 5, custoAnuncio: 20,
    custoTotal: 93.4, custoUn: 3.74, precoConsumidor: 29.89, precoLojista: 14.94,
    lucroLiquidoConsumidor: 17.52, lucroLiquidoLojista: 10.31, estoque: 0,
  },
  {
    id: 2, nome: "Mimikyu", tempo: 33, peso: 160, unidades: 3,
    filamentoCustoKg: 99, custoFilamento: 15.84, potenciaW: 350, custoKwh: 0.84,
    custoEnergia: 4.85, amortizacao: 9.9, custoFixoMes: 300, unidadesMes: 10,
    acessorios: [{ nome: "Embalagem", qtd: 1, custoUn: 2.5 }],
    markup: 5, falhas: 15, imposto: 8, txCartao: 5, custoAnuncio: 20,
    custoTotal: 47.38, custoUn: 15.79, precoConsumidor: 78.96, precoLojista: 39.48,
    lucroLiquidoConsumidor: 42.32, lucroLiquidoLojista: 21.79, estoque: 0,
  },
  {
    id: 3, nome: "Grade Fan", tempo: 2, peso: 44, unidades: 3,
    filamentoCustoKg: 99, custoFilamento: 4.36, potenciaW: 360, custoKwh: 0.84,
    custoEnergia: 0.3, amortizacao: 0.6, custoFixoMes: 300, unidadesMes: 10,
    acessorios: [{ nome: "Embalagem", qtd: 1, custoUn: 2.5 }],
    markup: 2, falhas: 15, imposto: 8, txCartao: 5, custoAnuncio: 20,
    custoTotal: 26.98, custoUn: 8.99, precoConsumidor: 17.99, precoLojista: 8.99,
    lucroLiquidoConsumidor: 6.03, lucroLiquidoLojista: 0, estoque: 0,
  },
  {
    id: 4, nome: "Scratt", tempo: 28, peso: 508.86, unidades: 1,
    filamentoCustoKg: 110, custoFilamento: 55.97, potenciaW: 360, custoKwh: 0.84,
    custoEnergia: 4.23, amortizacao: 8.4, custoFixoMes: 300, unidadesMes: 10,
    acessorios: [{ nome: "Embalagem", qtd: 1, custoUn: 2.5 }],
    markup: 5, falhas: 15, imposto: 8, txCartao: 5, custoAnuncio: 20,
    custoTotal: 77.98, custoUn: 77.98, precoConsumidor: 389.9, precoLojista: 194.95,
    lucroLiquidoConsumidor: 208.99, lucroLiquidoLojista: 107.61, estoque: 0,
  },
  {
    id: 5, nome: "Suporte Placa de Vídeo", tempo: 2, peso: 20.26, unidades: 1,
    filamentoCustoKg: 110, custoFilamento: 2.23, potenciaW: 360, custoKwh: 0.84,
    custoEnergia: 0.3, amortizacao: 0.6, custoFixoMes: 0, unidadesMes: 40,
    acessorios: [{ nome: "Embalagem", qtd: 1, custoUn: 2.5 }],
    markup: 4, falhas: 15, imposto: 8, txCartao: 5, custoAnuncio: 20,
    custoTotal: 4.27, custoUn: 4.27, precoConsumidor: 17.08, precoLojista: 8.54,
    lucroLiquidoConsumidor: 8.58, lucroLiquidoLojista: 3.93, estoque: 0,
  },
  {
    id: 6, nome: "Bob Joe", tempo: 3, peso: 29.95, unidades: 1,
    filamentoCustoKg: 110, custoFilamento: 3.29, potenciaW: 360, custoKwh: 0.84,
    custoEnergia: 0.76, amortizacao: 0.9, custoFixoMes: 300, unidadesMes: 10,
    acessorios: [{ nome: "Embalagem", qtd: 1, custoUn: 2.5 }],
    markup: 5, falhas: 15, imposto: 8, txCartao: 5, custoAnuncio: 20,
    custoTotal: 5.49, custoUn: 5.49, precoConsumidor: 27.46, precoLojista: 13.73,
    lucroLiquidoConsumidor: 21.97, lucroLiquidoLojista: 8.24, estoque: 0,
  },
];

// ─── helpers ─────────────────────────────────────────────────────────────────
const R = (v) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v) => `${(v ?? 0).toFixed(1)}%`;
const margem = (lucro, preco) => preco > 0 ? ((lucro / preco) * 100).toFixed(1) : "0.0";
const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

function recalcPrices(p, newMarkup) {
  const mk = parseFloat(newMarkup) || p.markup;
  const precoConsumidor = +(p.custoUn * mk).toFixed(2);
  const precoLojista = +(precoConsumidor / 2).toFixed(2);
  const descontosC = (p.imposto + p.txCartao + p.custoAnuncio) / 100;
  const lucroLiquidoConsumidor = +((precoConsumidor - p.custoUn) - precoConsumidor * descontosC).toFixed(2);
  const descontosL = (p.imposto + p.txCartao) / 100;
  const lucroLiquidoLojista = +((precoLojista - p.custoUn) - precoLojista * descontosL).toFixed(2);
  return { markup: mk, precoConsumidor, precoLojista, lucroLiquidoConsumidor, lucroLiquidoLojista };
}

// ─── stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "indigo" }) {
  const colors = {
    indigo: "from-indigo-500 to-indigo-700",
    purple: "from-purple-500 to-purple-700",
    pink: "from-pink-500 to-pink-700",
    emerald: "from-emerald-500 to-emerald-700",
    amber: "from-amber-500 to-amber-700",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-5 text-white shadow-lg`}>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  );
}

function Badge({ v, bg = "#6366f1" }) {
  return (
    <span style={{ background: bg, color: "#fff", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
      {v}
    </span>
  );
}

// ─── modal de detalhes ────────────────────────────────────────────────────────
function ProductModal({ product: p, onClose }) {
  if (!p) return null;
  const custoAcess = p.acessorios.reduce((a, x) => a + x.qtd * x.custoUn, 0);
  const margemC = margem(p.lucroLiquidoConsumidor, p.precoConsumidor);
  const margemL = margem(p.lucroLiquidoLojista, p.precoLojista);
  const breakdownData = [
    { name: "Filamento", value: p.custoFilamento },
    { name: "Energia", value: p.custoEnergia },
    { name: "Amortização", value: p.amortizacao },
    { name: "Custo Fixo", value: p.custoFixoMes > 0 ? +(p.custoFixoMes / p.unidadesMes).toFixed(2) : 0 },
    { name: "Acessórios", value: custoAcess / p.unidades },
  ].filter((d) => d.value > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 overflow-y-auto" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-3xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{p.nome}</h2>
              <p className="text-sm opacity-80 mt-1">{p.tempo}h · {p.peso}g · {p.unidades} unid. · Markup {p.markup}x</p>
            </div>
            <button onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-3xl font-light leading-none">×</button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Consumidor Final</p>
              <p className="text-2xl font-bold text-indigo-700 mt-1">{R(p.precoConsumidor)}</p>
              <p className="text-sm text-gray-500 mt-1">Lucro líq.: <span className="font-semibold text-emerald-600">{R(p.lucroLiquidoConsumidor)}</span></p>
              <p className="text-xs text-gray-400">Margem {margemC}%</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Preço Lojista</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">{R(p.precoLojista)}</p>
              <p className="text-sm text-gray-500 mt-1">Lucro líq.: <span className="font-semibold text-emerald-600">{R(p.lucroLiquidoLojista)}</span></p>
              <p className="text-xs text-gray-400">Margem {margemL}%</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Custo por Unidade</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{R(p.custoUn)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Custo total do lote</p>
              <p className="text-lg font-semibold text-gray-700">{R(p.custoTotal)}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Composição do Custo</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={breakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {breakdownData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => R(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Detalhamento</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {[
                  ["Filamento", R(p.custoFilamento)],
                  ["Energia elétrica", R(p.custoEnergia)],
                  ["Amortização da impressora", R(p.amortizacao)],
                  ["Custo fixo rateado", R(p.custoFixoMes > 0 ? p.custoFixoMes / p.unidadesMes : 0)],
                  ["Acessórios / embalagem (total)", R(custoAcess)],
                  ["Imposto", pct(p.imposto)],
                  ["Taxa de cartão", pct(p.txCartao)],
                  ["Custo de anúncio", pct(p.custoAnuncio)],
                  ["Taxa de falhas", pct(p.falhas)],
                ].map(([k, v]) => (
                  <tr key={k}><td className="py-2 text-gray-600">{k}</td><td className="py-2 text-right font-medium text-gray-800">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {p.acessorios.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Acessórios e Embalagens</p>
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 text-xs"><th className="text-left pb-1">Item</th><th className="text-right pb-1">Qtd</th><th className="text-right pb-1">Custo un.</th><th className="text-right pb-1">Total</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {p.acessorios.map((a, i) => (
                    <tr key={i}><td className="py-1 text-gray-700">{a.nome}</td><td className="py-1 text-right text-gray-600">{a.qtd}</td><td className="py-1 text-right text-gray-600">{R(a.custoUn)}</td><td className="py-1 text-right font-medium">{R(a.qtd * a.custoUn)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── modal de edição de markup ────────────────────────────────────────────────
function EditMarkupModal({ product: p, onClose, onSave }) {
  if (!p) return null;
  const [markup, setMarkup] = useState(String(p.markup));
  const preview = useMemo(() => recalcPrices(p, markup), [p, markup]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-3xl p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Editar Markup</h2>
            <p className="text-sm opacity-80 mt-0.5">{p.nome}</p>
          </div>
          <button onClick={onClose} className="text-3xl font-light opacity-70 hover:opacity-100">×</button>
        </div>
        <div className="p-6 space-y-5">
          {/* input markup */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Novo Markup</label>
            <div className="mt-2 flex items-center gap-3">
              <button onClick={() => setMarkup((v) => String(Math.max(1, parseFloat(v) - 0.5)))} className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-bold text-gray-600 flex items-center justify-center">−</button>
              <input
                type="number" step="0.5" min="1"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                className="flex-1 text-center text-2xl font-bold border-2 border-amber-300 rounded-xl py-2 focus:outline-none focus:border-amber-500"
              />
              <button onClick={() => setMarkup((v) => String(parseFloat(v) + 0.5))} className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-bold text-gray-600 flex items-center justify-center">+</button>
            </div>
          </div>

          {/* preview comparativo */}
          <div className="bg-amber-50 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Comparação</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-center text-gray-500 font-semibold uppercase tracking-wide">
              <span></span><span>Atual</span><span>Novo</span>
            </div>
            {[
              ["Markup", `${p.markup}x`, `${parseFloat(markup) || p.markup}x`],
              ["Preço Consumidor", R(p.precoConsumidor), R(preview.precoConsumidor)],
              ["Preço Lojista", R(p.precoLojista), R(preview.precoLojista)],
              ["Lucro Líq. Consumidor", R(p.lucroLiquidoConsumidor), R(preview.lucroLiquidoConsumidor)],
              ["Lucro Líq. Lojista", R(p.lucroLiquidoLojista), R(preview.lucroLiquidoLojista)],
            ].map(([label, old, novo]) => (
              <div key={label} className="grid grid-cols-3 gap-2 text-sm items-center">
                <span className="text-gray-500 text-xs">{label}</span>
                <span className="text-center font-medium text-gray-400 line-through">{old}</span>
                <span className="text-center font-bold text-amber-700">{novo}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-500 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition">Cancelar</button>
            <button onClick={() => { onSave(p.id, preview); onClose(); }} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-2xl hover:opacity-90 transition">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── formulário nova peça ─────────────────────────────────────────────────────
const emptyForm = {
  nome: "", tempo: "", peso: "", unidades: 1, filamentoCustoKg: 99,
  potenciaW: 350, custoKwh: 0.84, custoFixoMes: 300, unidadesMes: 10,
  markup: 5, falhas: 15, imposto: 8, txCartao: 5, custoAnuncio: 20,
  acessNome: "Embalagem", acessQtd: 1, acessCusto: 2.5,
};

function calcProduct(f) {
  const peso = parseFloat(f.peso) || 0;
  const tempo = parseFloat(f.tempo) || 0;
  const potW = parseFloat(f.potenciaW) || 350;
  const kwh = parseFloat(f.custoKwh) || 0.84;
  const kgPreco = parseFloat(f.filamentoCustoKg) || 99;
  const custoFixoMes = parseFloat(f.custoFixoMes) || 0;
  const unidadesMes = parseFloat(f.unidadesMes) || 1;
  const unidades = parseFloat(f.unidades) || 1;
  const markup = parseFloat(f.markup) || 1;
  const falhas = parseFloat(f.falhas) || 0;
  const imposto = parseFloat(f.imposto) || 0;
  const txCartao = parseFloat(f.txCartao) || 0;
  const custoAnuncio = parseFloat(f.custoAnuncio) || 0;
  const acessQtd = parseFloat(f.acessQtd) || 0;
  const acessCusto = parseFloat(f.acessCusto) || 0;
  const custoFilamento = (peso / 1000) * kgPreco;
  const gastoWh = potW * tempo;
  const custoEnergia = (gastoWh / 1000) * kwh;
  const amortizacao = (tempo / 20000) * 6000;
  const custoFixoRateado = custoFixoMes / unidadesMes;
  const custoAcess = (acessQtd * acessCusto) / unidades;
  const custoBase = custoFilamento + custoEnergia + amortizacao + custoFixoRateado + custoAcess;
  const custoUn = +(custoBase * (1 + falhas / 100)).toFixed(2);
  const custoTotal = +(custoUn * unidades).toFixed(2);
  const precoConsumidor = +(custoUn * markup).toFixed(2);
  const precoLojista = +(precoConsumidor / 2).toFixed(2);
  const descontosC = (imposto + txCartao + custoAnuncio) / 100;
  const lucroLiquidoConsumidor = +((precoConsumidor - custoUn) - precoConsumidor * descontosC).toFixed(2);
  const descontosL = (imposto + txCartao) / 100;
  const lucroLiquidoLojista = +((precoLojista - custoUn) - precoLojista * descontosL).toFixed(2);
  return {
    custoFilamento: +custoFilamento.toFixed(2), custoEnergia: +custoEnergia.toFixed(2),
    amortizacao: +amortizacao.toFixed(2), custoUn, custoTotal, precoConsumidor,
    precoLojista, lucroLiquidoConsumidor, lucroLiquidoLojista,
  };
}

function NovaModal({ onClose, onAdd }) {
  const [f, setF] = useState(emptyForm);
  const calc = useMemo(() => calcProduct(f), [f]);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const handleAdd = () => {
    if (!f.nome || !f.peso || !f.tempo) return alert("Preencha nome, tempo e peso.");
    onAdd({
      id: Date.now(), nome: f.nome, tempo: +f.tempo, peso: +f.peso, unidades: +f.unidades,
      filamentoCustoKg: +f.filamentoCustoKg, potenciaW: +f.potenciaW, custoKwh: +f.custoKwh,
      custoFixoMes: +f.custoFixoMes, unidadesMes: +f.unidadesMes,
      acessorios: f.acessNome ? [{ nome: f.acessNome, qtd: +f.acessQtd, custoUn: +f.acessCusto }] : [],
      markup: +f.markup, falhas: +f.falhas, imposto: +f.imposto, txCartao: +f.txCartao,
      custoAnuncio: +f.custoAnuncio, estoque: 0, ...calc,
    });
    onClose();
  };
  const Field = ({ label, k, type = "number", step = "0.01" }) => (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input type={type} step={step} value={f[k]} onChange={set(k)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 overflow-y-auto" style={{ maxHeight: "92vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-3xl p-6 text-white flex justify-between items-center">
          <h2 className="text-2xl font-bold">Nova Peça</h2>
          <button onClick={onClose} className="text-3xl font-light opacity-70 hover:opacity-100">×</button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome da Peça</label>
              <input type="text" value={f.nome} onChange={set("nome")} placeholder="Ex: Pikachu" className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <Field label="Tempo (horas)" k="tempo" /><Field label="Peso (gramas)" k="peso" />
            <Field label="Unidades no lote" k="unidades" step="1" /><Field label="Filamento R$/kg" k="filamentoCustoKg" />
            <Field label="Potência da imp. (W)" k="potenciaW" step="1" /><Field label="Custo kWh (R$)" k="custoKwh" />
            <Field label="Custo Fixo/mês (R$)" k="custoFixoMes" /><Field label="Unid. produzidas/mês" k="unidadesMes" step="1" />
            <Field label="Markup" k="markup" step="0.5" /><Field label="Taxa de Falhas (%)" k="falhas" />
            <Field label="Imposto (%)" k="imposto" /><Field label="Taxa Cartão (%)" k="txCartao" />
            <Field label="Custo Anúncio (%)" k="custoAnuncio" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Acessório / Embalagem</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</label>
              <input type="text" value={f.acessNome} onChange={set("acessNome")} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <Field label="Quantidade" k="acessQtd" step="1" /><Field label="Custo un. (R$)" k="acessCusto" />
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Preview do Cálculo</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["Custo por unidade", R(calc.custoUn)], ["Custo total do lote", R(calc.custoTotal)], ["Preço consumidor", R(calc.precoConsumidor)], ["Preço lojista", R(calc.precoLojista)], ["Lucro líq. consumidor", R(calc.lucroLiquidoConsumidor)], ["Lucro líq. lojista", R(calc.lucroLiquidoLojista)]].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-gray-500">{k}</span><span className="font-bold text-gray-800">{v}</span></div>
              ))}
            </div>
          </div>
          <button onClick={handleAdd} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3 rounded-2xl hover:opacity-90 transition">Adicionar Peça</button>
        </div>
      </div>
    </div>
  );
}

// ─── aba estoque ──────────────────────────────────────────────────────────────
function EstoqueTab({ products, onUpdateEstoque }) {
  const totalItens = products.reduce((a, p) => a + (p.estoque || 0), 0);
  const valorEstoque = products.reduce((a, p) => a + (p.estoque || 0) * p.custoUn, 0);
  const valorVenda = products.reduce((a, p) => a + (p.estoque || 0) * p.precoConsumidor, 0);

  return (
    <div className="space-y-6">
      {/* resumo */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total em estoque" value={`${totalItens} un.`} color="indigo" />
        <StatCard label="Valor de custo" value={R(valorEstoque)} color="purple" />
        <StatCard label="Valor de venda" value={R(valorVenda)} color="emerald" />
      </div>

      {/* tabela */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-700">Controle de Estoque</h3>
          <p className="text-xs text-gray-400 mt-1">Ajuste a quantidade de impressões disponíveis para cada peça</p>
        </div>
        <div className="divide-y divide-gray-50">
          {products.map((p, i) => {
            const estoque = p.estoque || 0;
            const statusColor = estoque === 0 ? "#ef4444" : estoque <= 2 ? "#f59e0b" : "#10b981";
            const statusLabel = estoque === 0 ? "Sem estoque" : estoque <= 2 ? "Estoque baixo" : "Em estoque";
            return (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                {/* avatar */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }}>
                  {p.nome[0]}
                </div>
                {/* info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{p.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span style={{ background: statusColor, color: "#fff", padding: "1px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{statusLabel}</span>
                    <span className="text-xs text-gray-400">Preço: {R(p.precoConsumidor)}</span>
                  </div>
                </div>
                {/* valor em estoque */}
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-400">Valor em estoque</p>
                  <p className="font-semibold text-gray-700">{R(estoque * p.precoConsumidor)}</p>
                </div>
                {/* controle quantidade */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onUpdateEstoque(p.id, Math.max(0, estoque - 1))}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-600 font-bold text-lg flex items-center justify-center transition"
                  >−</button>
                  <input
                    type="number" min="0"
                    value={estoque}
                    onChange={(e) => onUpdateEstoque(p.id, Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 text-center font-bold text-lg border-2 border-gray-200 rounded-xl py-1 focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={() => onUpdateEstoque(p.id, estoque + 1)}
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 text-gray-600 font-bold text-lg flex items-center justify-center transition"
                  >+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* gráfico estoque */}
      {totalItens > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-700 mb-4">Distribuição do Estoque</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={products.filter(p => (p.estoque || 0) > 0).map(p => ({ name: p.nome.length > 10 ? p.nome.slice(0,10)+"…" : p.nome, Unidades: p.estoque || 0, "Valor (R$)": +(p.precoConsumidor * (p.estoque || 0)).toFixed(2) }))} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v, name) => name === "Valor (R$)" ? R(v) : `${v} un.`} />
              <Legend />
              <Bar yAxisId="left" dataKey="Unidades" fill="#6366f1" radius={[6,6,0,0]}>
                {products.filter(p => (p.estoque || 0) > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── app principal ────────────────────────────────────────────────────────────
export default function App() {
  const [products, setProducts] = useState(initialProducts);
  const [tab, setTab] = useState("dashboard");
  const [selected, setSelected] = useState(null);
  const [editingMarkup, setEditingMarkup] = useState(null);
  const [showNova, setShowNova] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = products.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()));

  const totals = useMemo(() => ({
    totalPecas: products.length,
    totalLucroC: products.reduce((a, p) => a + p.lucroLiquidoConsumidor, 0),
    totalLucroL: products.reduce((a, p) => a + p.lucroLiquidoLojista, 0),
    avgMarkup: (products.reduce((a, p) => a + p.markup, 0) / products.length).toFixed(1),
    maisLucrativo: [...products].sort((a, b) => b.lucroLiquidoConsumidor - a.lucroLiquidoConsumidor)[0],
    totalEstoque: products.reduce((a, p) => a + (p.estoque || 0), 0),
  }), [products]);

  const chartData = products.map((p) => ({
    name: p.nome.length > 10 ? p.nome.slice(0, 10) + "…" : p.nome,
    "Custo Un": p.custoUn, "Preço": p.precoConsumidor, "Lucro Líq.": p.lucroLiquidoConsumidor,
  }));

  const removeProduct = (id) => setProducts((ps) => ps.filter((p) => p.id !== id));

  const saveMarkup = (id, newValues) => {
    setProducts((ps) => ps.map((p) => p.id === id ? { ...p, ...newValues } : p));
  };

  const updateEstoque = (id, qty) => {
    setProducts((ps) => ps.map((p) => p.id === id ? { ...p, estoque: qty } : p));
  };

  const TABS = [["dashboard", "Dashboard"], ["produtos", "Produtos"], ["estoque", "Estoque"]];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Topbar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">🖨</div>
            <div>
              <h1 className="font-bold text-gray-800 leading-none">Gestão 3D</h1>
              <p className="text-xs text-gray-400">Controle de Custos</p>
            </div>
          </div>
          <nav className="flex gap-1">
            {TABS.map(([k, v]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition relative ${tab === k ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                {v}
                {k === "estoque" && totals.totalEstoque > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{totals.totalEstoque > 9 ? "9+" : totals.totalEstoque}</span>
                )}
              </button>
            ))}
          </nav>
          <button onClick={() => setShowNova(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition">
            + Nova Peça
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── dashboard ── */}
        {tab === "dashboard" && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total de peças" value={totals.totalPecas} color="indigo" />
              <StatCard label="Lucro total (consumidor)" value={R(totals.totalLucroC)} color="emerald" />
              <StatCard label="Lucro total (lojista)" value={R(totals.totalLucroL)} color="purple" />
              <StatCard label="Markup médio" value={`${totals.avgMarkup}x`} sub={`+ lucrativo: ${totals.maisLucrativo?.nome}`} color="pink" />
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">Custo × Preço × Lucro por Peça</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v) => R(v)} />
                  <Legend />
                  <Bar dataKey="Custo Un" fill="#e0e7ff" radius={[4,4,0,0]} />
                  <Bar dataKey="Preço" fill="#6366f1" radius={[4,4,0,0]} />
                  <Bar dataKey="Lucro Líq." fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((p, i) => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: COLORS[i % COLORS.length] }}>{p.nome[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate">{p.nome}</p>
                      <p className="text-xs text-gray-400">{p.tempo}h · {p.peso}g · {p.unidades} unid.</p>
                    </div>
                    <Badge v={`${p.markup}x`} bg={COLORS[i % COLORS.length]} />
                    {/* botão editar markup */}
                    <button
                      onClick={() => setEditingMarkup(p)}
                      title="Editar markup"
                      className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-xl py-2"><p className="text-xs text-gray-400">Custo Un</p><p className="font-bold text-gray-700 text-sm">{R(p.custoUn)}</p></div>
                    <div className="bg-indigo-50 rounded-xl py-2"><p className="text-xs text-indigo-400">Preço</p><p className="font-bold text-indigo-700 text-sm">{R(p.precoConsumidor)}</p></div>
                    <div className="bg-emerald-50 rounded-xl py-2"><p className="text-xs text-emerald-400">Lucro Líq.</p><p className="font-bold text-emerald-700 text-sm">{R(p.lucroLiquidoConsumidor)}</p></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Margem {margem(p.lucroLiquidoConsumidor, p.precoConsumidor)}%</span>
                    <button onClick={() => setSelected(p)} className="text-indigo-500 font-semibold">Ver detalhes →</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── produtos ── */}
        {tab === "produtos" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
              <h3 className="font-bold text-gray-700 flex-1">Todas as Peças</h3>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar peça..." className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Peça", "Tempo", "Peso", "Custo Un", "Markup", "Preço Final", "Preço Lojista", "Lucro Líq.", "Ações"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((p, i) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelected(p)}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: COLORS[i % COLORS.length] }}>{p.nome[0]}</div>
                          <span className="font-semibold text-gray-800">{p.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.tempo}h</td>
                      <td className="px-4 py-3 text-gray-600">{p.peso}g</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{R(p.custoUn)}</td>
                      <td className="px-4 py-3"><Badge v={`${p.markup}x`} bg={COLORS[i % COLORS.length]} /></td>
                      <td className="px-4 py-3 font-bold text-indigo-700">{R(p.precoConsumidor)}</td>
                      <td className="px-4 py-3 text-purple-600">{R(p.precoLojista)}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">{R(p.lucroLiquidoConsumidor)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* editar markup */}
                          <button
                            onClick={() => setEditingMarkup(p)}
                            title="Editar markup"
                            className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          {/* remover */}
                          <button
                            onClick={() => { if (confirm(`Remover "${p.nome}"?`)) removeProduct(p.id); }}
                            title="Remover"
                            className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition text-red-400 hover:text-red-600 font-bold text-lg"
                          >×</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── estoque ── */}
        {tab === "estoque" && (
          <EstoqueTab products={products} onUpdateEstoque={updateEstoque} />
        )}
      </main>

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
      {editingMarkup && <EditMarkupModal product={editingMarkup} onClose={() => setEditingMarkup(null)} onSave={saveMarkup} />}
      {showNova && <NovaModal onClose={() => setShowNova(false)} onAdd={(p) => setProducts((ps) => [p, ...ps])} />}
    </div>
  );
}
