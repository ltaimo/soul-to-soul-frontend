import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Leaf, Minus, Phone, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const OnlineStore = () => {
  const [catalog, setCatalog] = useState({ products: [], settings: null, warehouse: null });
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(null);
  const [checkout, setCheckout] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerCode: '',
    deliveryAddress: '',
    paymentMethod: 'M-Pesa',
    notes: '',
  });

  const settings = catalog.settings || {};

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/store/catalog`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Could not load store catalog.');
        setCatalog(data);
      } catch (error) {
        setErrorMsg(error.message || 'Could not load store catalog.');
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return catalog.products;
    return catalog.products.filter((product) =>
      `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(term),
    );
  }, [catalog.products, query]);

  const cartLines = cart.map((line) => {
    const product = catalog.products.find((item) => item.id === line.productId);
    return {
      ...line,
      product,
      total: (product?.sellingPrice || 0) * line.quantity,
      points: (product?.loyaltyPointsEarned || 0) * line.quantity,
    };
  }).filter((line) => line.product);

  const totals = cartLines.reduce(
    (acc, line) => ({
      units: acc.units + line.quantity,
      amount: acc.amount + line.total,
      points: acc.points + line.points,
    }),
    { units: 0, amount: 0, points: 0 },
  );

  const updateCheckout = (field, value) => {
    setCheckout((current) => ({ ...current, [field]: value }));
  };

  const addToCart = (product) => {
    setErrorMsg('');
    setSuccess(null);
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: Math.min(line.quantity + 1, product.availableStock) }
            : line,
        );
      }
      return [...current, { productId: product.id, quantity: 1 }];
    });
  };

  const changeQuantity = (productId, delta) => {
    setCart((current) =>
      current
        .map((line) => {
          if (line.productId !== productId) return line;
          const product = catalog.products.find((item) => item.id === productId);
          const nextQuantity = Math.max(1, Math.min(line.quantity + delta, product?.availableStock || 1));
          return { ...line, quantity: nextQuantity };
        })
        .filter((line) => line.quantity > 0),
    );
  };

  const removeLine = (productId) => {
    setCart((current) => current.filter((line) => line.productId !== productId));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccess(null);

    if (!cartLines.length) {
      setErrorMsg('Adicione pelo menos um produto ao carrinho.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/store/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...checkout,
          items: cartLines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Nao foi possivel enviar a encomenda.');
      setSuccess(data);
      setCart([]);
      setCheckout({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerCode: '',
        deliveryAddress: '',
        paymentMethod: 'M-Pesa',
        notes: '',
      });
    } catch (error) {
      setErrorMsg(error.message || 'Nao foi possivel enviar a encomenda.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="store-shell">
      <section className="store-hero">
        <div>
          <span className="store-kicker"><Leaf size={16} /> Natureza. Conexao. Equilibrio.</span>
          <h1>Soul2Soul Online Store</h1>
          <p>Produtos naturais preparados com cuidado. Escolha, envie a encomenda e a nossa equipa confirma pagamento e entrega por WhatsApp.</p>
          <div className="store-hero-actions">
            <a className="btn btn-primary" href="#store-products">Comprar agora <ArrowRight size={18} /></a>
            {settings.companyWhatsApp && (
              <a className="btn btn-secondary" href={`https://wa.me/${String(settings.companyWhatsApp).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                <Phone size={18} /> WhatsApp
              </a>
            )}
          </div>
        </div>
        <div className="store-brand-card">
          <img src="/logo.png" alt="Soul2Soul" />
          <strong>{settings.companyName || 'Soul2Soul'}</strong>
          <span>{catalog.warehouse?.name || 'Online stock'}</span>
        </div>
      </section>

      {errorMsg && <div className="inline-alert inline-alert-danger">{errorMsg}</div>}
      {success && (
        <div className="store-success">
          <CheckCircle2 size={24} />
          <div>
            <strong>Encomenda recebida: {success.orderReference}</strong>
            <p>{success.message}</p>
          </div>
        </div>
      )}

      <section className="store-layout" id="store-products">
        <div className="store-products-panel">
          <div className="store-section-heading">
            <div>
              <h2>Produtos disponiveis</h2>
              <p>{loading ? 'A carregar catalogo...' : `${filteredProducts.length} produtos prontos para encomenda`}</p>
            </div>
            <input
              className="store-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar produto..."
            />
          </div>

          <div className="store-product-grid">
            {filteredProducts.map((product) => (
              <article className="store-product-card" key={product.id}>
                <div className="store-product-image">
                  <ShoppingBag size={32} />
                </div>
                <div>
                  <span>{product.category}</span>
                  <h3>{product.name}</h3>
                  <p>{product.description || 'Produto natural Soul2Soul selecionado para o seu cuidado diario.'}</p>
                </div>
                <div className="store-product-footer">
                  <div>
                    <strong>{formatCurrency(product.sellingPrice, settings)}</strong>
                    <small>{product.availableStock} disponivel</small>
                  </div>
                  <button className="btn btn-primary" type="button" onClick={() => addToCart(product)}>
                    <Plus size={18} /> Adicionar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="store-cart-card">
          <div className="store-section-heading compact">
            <div>
              <h2>Carrinho</h2>
              <p>{totals.units} unidades</p>
            </div>
            <strong>{formatCurrency(totals.amount, settings)}</strong>
          </div>

          <div className="store-cart-lines">
            {cartLines.map((line) => (
              <div className="store-cart-line" key={line.productId}>
                <div>
                  <strong>{line.product.name}</strong>
                  <span>{formatCurrency(line.product.sellingPrice, settings)} cada</span>
                </div>
                <div className="store-qty">
                  <button type="button" onClick={() => changeQuantity(line.productId, -1)}><Minus size={15} /></button>
                  <span>{line.quantity}</span>
                  <button type="button" onClick={() => changeQuantity(line.productId, 1)}><Plus size={15} /></button>
                </div>
                <button className="icon-danger" type="button" onClick={() => removeLine(line.productId)}><Trash2 size={16} /></button>
              </div>
            ))}
            {!cartLines.length && <div className="empty-cart">O carrinho esta vazio.</div>}
          </div>

          <form className="store-checkout" onSubmit={submitOrder}>
            <h3>Dados da encomenda</h3>
            <input required value={checkout.customerName} onChange={(event) => updateCheckout('customerName', event.target.value)} placeholder="Nome completo" />
            <input required value={checkout.customerPhone} onChange={(event) => updateCheckout('customerPhone', event.target.value)} placeholder="Telefone / WhatsApp" />
            <input type="email" value={checkout.customerEmail} onChange={(event) => updateCheckout('customerEmail', event.target.value)} placeholder="Email opcional" />
            <input value={checkout.customerCode} onChange={(event) => updateCheckout('customerCode', event.target.value)} placeholder="Codigo de fidelizacao opcional" />
            <textarea value={checkout.deliveryAddress} onChange={(event) => updateCheckout('deliveryAddress', event.target.value)} placeholder="Endereco de entrega ou ponto de recolha" />
            <select value={checkout.paymentMethod} onChange={(event) => updateCheckout('paymentMethod', event.target.value)}>
              <option value="M-Pesa">M-Pesa</option>
              <option value="E-Mola">E-Mola</option>
              <option value="Bank Transfer">Transferencia bancaria</option>
              <option value="Pay on Pickup">Pagamento na recolha</option>
            </select>
            <textarea value={checkout.notes} onChange={(event) => updateCheckout('notes', event.target.value)} placeholder="Notas opcionais" />
            <div className="store-total-box">
              <span>Total</span>
              <strong>{formatCurrency(totals.amount, settings)}</strong>
              {totals.points > 0 && <small>Ganha {totals.points} pontos apos confirmacao.</small>}
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting || !cartLines.length}>
              {submitting ? 'A enviar...' : 'Enviar encomenda'}
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
};
