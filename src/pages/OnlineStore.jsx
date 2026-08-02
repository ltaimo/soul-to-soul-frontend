import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Leaf,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Trash2,
  Truck,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const defaultCheckout = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerCode: '',
  deliveryAddress: '',
  paymentMethod: 'M-Pesa',
  notes: '',
};

const paymentOptions = [
  { value: 'M-Pesa', label: 'M-Pesa', hint: 'Prompt automatico quando activo' },
  { value: 'E-Mola', label: 'E-Mola', hint: 'Confirmacao manual' },
  { value: 'Bank Transfer', label: 'Transferencia', hint: 'Enviar comprovativo' },
  { value: 'Pay on Pickup', label: 'Na recolha', hint: 'Paga ao levantar' },
];

const handleImageFallback = (event) => {
  event.currentTarget.onerror = null;
  event.currentTarget.src = '/logo.png';
};

export const OnlineStore = () => {
  const [catalog, setCatalog] = useState({ products: [], settings: null, warehouse: null });
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(null);
  const [checkout, setCheckout] = useState(defaultCheckout);

  const settings = catalog.settings || {};
  const whatsappNumber = String(settings.companyWhatsApp || '').replace(/\D/g, '');
  const categories = useMemo(
    () => ['All', ...new Set(catalog.products.map((product) => product.category).filter(Boolean))],
    [catalog.products],
  );

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/store/catalog`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Could not load store catalog.');
        setCatalog({
          ...data,
          products: [...(data.products || [])].sort((a, b) => Number(b.storeFeatured) - Number(a.storeFeatured)),
        });
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
    return catalog.products.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const matchesSearch = !term || `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [catalog.products, category, query]);

  const featuredProducts = catalog.products.filter((product) => product.storeFeatured).slice(0, 4);

  const cartLines = cart
    .map((line) => {
      const product = catalog.products.find((item) => item.id === line.productId);
      return {
        ...line,
        product,
        total: (product?.sellingPrice || 0) * line.quantity,
        points: (product?.loyaltyPointsEarned || 0) * line.quantity,
      };
    })
    .filter((line) => line.product);

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
      setCheckout(defaultCheckout);
    } catch (error) {
      setErrorMsg(error.message || 'Nao foi possivel enviar a encomenda.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="store-shell">
      <section className="store-hero">
        <div className="store-hero-copy">
          <span className="store-kicker"><Leaf size={16} /> Natureza. Conexao. Equilibrio.</span>
          <h1>Cuidado natural, simples de encomendar.</h1>
          <p>Escolha os produtos Soul2Soul, confirme a encomenda e receba acompanhamento por WhatsApp. A equipa confirma pagamento, stock e entrega.</p>
          <div className="store-hero-actions">
            <a className="btn btn-primary" href="#store-products">Comprar agora <ArrowRight size={18} /></a>
            {whatsappNumber && (
              <a className="btn btn-secondary" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">
                <Phone size={18} /> Falar no WhatsApp
              </a>
            )}
          </div>
          <div className="store-trust-row">
            <span><Truck size={16} /> Entrega ou recolha</span>
            <span><CreditCard size={16} /> M-Pesa preparado</span>
            <span><Star size={16} /> Pontos de fidelizacao</span>
          </div>
        </div>
        <div className="store-brand-card">
          <img src="/logo.png" alt="Soul2Soul" />
          <strong>{settings.companyName || 'Soul2Soul'}</strong>
          <span>{catalog.warehouse?.name || 'Online stock'}</span>
        </div>
      </section>

      {errorMsg && <div className="inline-alert inline-alert-danger store-message">{errorMsg}</div>}
      {success && (
        <div className="store-success">
          <CheckCircle2 size={24} />
          <div>
            <strong>Encomenda recebida: {success.orderReference}</strong>
            <p>{success.message}</p>
            {success.payment?.reference && <small>Referencia de pagamento: {success.payment.reference}</small>}
          </div>
        </div>
      )}

      {featuredProducts.length > 0 && (
        <section className="store-featured-strip">
          <div>
            <span className="store-kicker"><Star size={15} /> Destaques</span>
            <h2>Produtos em evidencia</h2>
          </div>
          <div className="store-featured-list">
            {featuredProducts.map((product) => (
              <button type="button" key={product.id} onClick={() => addToCart(product)}>
                <img src={product.imageUrl} alt="" onError={handleImageFallback} />
                <span>{product.name}</span>
                <strong>{formatCurrency(product.sellingPrice, settings)}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="store-layout" id="store-products">
        <div className="store-products-panel">
          <div className="store-section-heading store-shop-toolbar">
            <div>
              <h2>Produtos disponiveis</h2>
              <p>{loading ? 'A carregar catalogo...' : `${filteredProducts.length} produtos prontos para encomenda`}</p>
            </div>
            <div className="store-search-wrap">
              <Search size={17} />
              <input
                className="store-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar produto..."
              />
            </div>
          </div>

          <div className="store-category-pills">
            {categories.map((item) => (
              <button
                className={item === category ? 'is-active' : ''}
                key={item}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item === 'All' ? 'Todos' : item}
              </button>
            ))}
          </div>

          <div className="store-product-grid">
            {filteredProducts.map((product) => (
              <article className="store-product-card" key={product.id}>
                <div className="store-product-image">
                  <img src={product.imageUrl} alt={product.name} loading="lazy" onError={handleImageFallback} />
                  {product.storeFeatured && <span className="store-featured-badge">Destaque</span>}
                </div>
                <div className="store-product-copy">
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
            {!loading && filteredProducts.length === 0 && (
              <div className="store-empty-products">
                <ShoppingBag size={30} />
                <strong>Nenhum produto encontrado</strong>
                <span>Tente outra categoria ou pesquisa.</span>
              </div>
            )}
          </div>
        </div>

        <aside className="store-cart-card">
          <div className="store-cart-top">
            <div>
              <span className="store-kicker"><ShoppingBag size={15} /> Carrinho</span>
              <h2>{totals.units} unidades</h2>
            </div>
            <strong>{formatCurrency(totals.amount, settings)}</strong>
          </div>

          <div className="store-cart-lines">
            {cartLines.map((line) => (
              <div className="store-cart-line" key={line.productId}>
                <img src={line.product.imageUrl} alt="" onError={handleImageFallback} />
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
            {!cartLines.length && <div className="empty-cart">O carrinho esta vazio. Escolha um produto para comecar.</div>}
          </div>

          <form className="store-checkout" id="store-checkout" onSubmit={submitOrder}>
            <h3>Dados da encomenda</h3>
            <input required value={checkout.customerName} onChange={(event) => updateCheckout('customerName', event.target.value)} placeholder="Nome completo" />
            <input required value={checkout.customerPhone} onChange={(event) => updateCheckout('customerPhone', event.target.value)} placeholder="Telefone / WhatsApp" />
            <input type="email" value={checkout.customerEmail} onChange={(event) => updateCheckout('customerEmail', event.target.value)} placeholder="Email opcional" />
            <input value={checkout.customerCode} onChange={(event) => updateCheckout('customerCode', event.target.value)} placeholder="Codigo de fidelizacao, se tiver" />
            <textarea value={checkout.deliveryAddress} onChange={(event) => updateCheckout('deliveryAddress', event.target.value)} placeholder="Endereco de entrega ou ponto de recolha" />
            <div className="store-payment-options">
              {paymentOptions.map((option) => (
                <button
                  className={checkout.paymentMethod === option.value ? 'is-active' : ''}
                  key={option.value}
                  type="button"
                  onClick={() => updateCheckout('paymentMethod', option.value)}
                >
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                </button>
              ))}
            </div>
            <textarea value={checkout.notes} onChange={(event) => updateCheckout('notes', event.target.value)} placeholder="Notas opcionais" />
            <div className="store-total-box">
              <span>Total</span>
              <strong>{formatCurrency(totals.amount, settings)}</strong>
              {totals.points > 0 && <small>Ganha {totals.points} pontos apos confirmacao.</small>}
            </div>
            <button className="btn btn-primary store-submit" type="submit" disabled={submitting || !cartLines.length}>
              {submitting ? 'A enviar...' : 'Confirmar encomenda'} <MessageCircle size={18} />
            </button>
          </form>
        </aside>
      </section>

      {cartLines.length > 0 && (
        <div className="store-mobile-checkout-bar" aria-label="Resumo do carrinho">
          <div>
            <span>{totals.units} unidades</span>
            <strong>{formatCurrency(totals.amount, settings)}</strong>
          </div>
          <a className="btn btn-primary" href="#store-checkout">Finalizar</a>
        </div>
      )}
    </main>
  );
};
