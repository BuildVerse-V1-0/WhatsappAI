import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function formatPaymentList(payments) {
  if (!Array.isArray(payments) || payments.length === 0) {
    return 'No linked payments';
  }

  return payments.join(', ');
}

function formatMoney(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return value ?? '-';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(number);
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.detail || payload?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

export default function App() {
  const [tenantId, setTenantId] = useState('');
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [googleBusinessId, setGoogleBusinessId] = useState('');
  const [serverStatus, setServerStatus] = useState('Checking API health...');
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const data = await requestJson('/health');

        if (cancelled) {
          return;
        }

        const supabaseStatus = data?.supabase?.status;
        const apiMessage = data?.status || 'ok';
        setServerStatus(
          supabaseStatus === 'connected'
            ? `API online, Supabase connected (${apiMessage})`
            : `API online, Supabase status: ${supabaseStatus || 'unknown'}`
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        setServerStatus(`API offline: ${err.message}`);
      }
    }

    checkHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const trimmedTenantId = tenantId.trim();

    if (!trimmedTenantId) {
      setOrders([]);
      setPayments([]);
      setStatus('Idle');
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      loadOrders(trimmedTenantId);
      loadPayments(trimmedTenantId);
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [tenantId]);

  const orderCount = orders.length;
  const paymentCount = payments.length;

  const tenantSummary = useMemo(() => {
    return tenantId.trim() || 'All tenants';
  }, [tenantId]);

  async function loadOrders(tenantOverride = tenantId.trim()) {
    setError('');
    setLoadingOrders(true);
    const tenantLabel = tenantOverride || 'All tenants';
    setStatus(`Loading orders for ${tenantLabel}...`);

    try {
      const query = tenantOverride ? `?tenant_id=${encodeURIComponent(tenantOverride)}` : '';
      const data = await requestJson(`/orders${query}`);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setStatus(`Loaded ${data.count ?? data.orders?.length ?? 0} orders`);
    } catch (err) {
      setError(err.message);
      setStatus('Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  }

  async function loadPayments(tenantOverride = tenantId.trim()) {
    setError('');
    setLoadingPayments(true);
    const tenantLabel = tenantOverride || 'All tenants';
    setStatus(`Loading payments for ${tenantLabel}...`);

    try {
      const query = tenantOverride ? `?tenant_id=${encodeURIComponent(tenantOverride)}` : '';
      const data = await requestJson(`/payments${query}`);
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setStatus(`Loaded ${data.count ?? data.payments?.length ?? 0} payments`);
    } catch (err) {
      setError(err.message);
      setStatus('Failed to load payments');
    } finally {
      setLoadingPayments(false);
    }
  }

  async function saveBusinessLink(event) {
    event.preventDefault();
    setError('');

    const tenantValue = tenantId.trim();
    const businessValue = googleBusinessId.trim();

    if (!tenantValue || !businessValue) {
      setError('Tenant ID and Google Business ID are required');
      return;
    }

    setSaving(true);
    setStatus('Saving Google Business ID...');

    try {
      const data = await requestJson('/business-link', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantValue,
          google_business_id: businessValue
        })
      });

      setStatus(data.message || 'Business ID saved');
    } catch (err) {
      setError(err.message);
      setStatus('Failed to save business link');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Tenant Portal</p>
          <h1>Orders, payments, and business link management in one place.</h1>
          <p className="hero-copy">
            Connect to the dashboard API, filter by tenant, and keep the Google Business ID updated without leaving the page.
          </p>
        </div>

        <div className="status-card">
          <span className="status-label">API</span>
          <strong>{API_BASE_URL}</strong>
          <span className="status-muted">{serverStatus}</span>
          <span className="status-muted">{status}</span>
          {error ? <span className="status-error">{error}</span> : null}
        </div>
      </section>

      <section className="controls grid-two">
        <article className="panel">
          <h2>Tenant context</h2>
          <label>
            Tenant ID
            <input
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              placeholder="urbanwear"
            />
          </label>
          <p className="hint">Type a tenant ID to auto-load orders and payments. Leave blank to clear current results.</p>
        </article>

        <article className="panel">
          <h2>Google Business ID</h2>
          <form onSubmit={saveBusinessLink} className="stacked-form">
            <label>
              Business ID
              <input
                value={googleBusinessId}
                onChange={(event) => setGoogleBusinessId(event.target.value)}
                placeholder="123456789012345"
              />
            </label>
            <button className="primary-btn" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Business ID'}
            </button>
          </form>
        </article>
      </section>

      <section className="actions panel">
        <div className="actions-row">
          <button className="secondary-btn" onClick={loadOrders} disabled={loadingOrders}>
            {loadingOrders ? 'Loading Orders...' : 'Load Orders'}
          </button>
          <button className="secondary-btn" onClick={loadPayments} disabled={loadingPayments}>
            {loadingPayments ? 'Loading Payments...' : 'Load Payments'}
          </button>
        </div>
        <div className="metrics">
          <div>
            <span>Orders Loaded</span>
            <strong>{orderCount}</strong>
          </div>
          <div>
            <span>Payments Loaded</span>
            <strong>{paymentCount}</strong>
          </div>
          <div>
            <span>Current Tenant</span>
            <strong>{tenantSummary}</strong>
          </div>
        </div>
      </section>

      <section className="grid-two lists">
        <article className="panel">
          <h2>Orders</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Tenant</th>
                  <th>Created</th>
                  <th>Payments</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      Load orders to inspect the latest tenant activity.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.order_id}>
                      <td>{order.order_id}</td>
                      <td>{order.customer_id}</td>
                      <td>{order.tenant_id}</td>
                      <td>{new Date(order.created_at).toLocaleString()}</td>
                      <td>{formatPaymentList(order.payments)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <h2>Payments</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Tenant</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      Load payments to review payment status and totals.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment, index) => (
                    <tr key={payment.payment_id ?? payment.id ?? index}>
                      <td>{payment.payment_id ?? payment.id ?? '-'}</td>
                      <td>{payment.tenant_id ?? '-'}</td>
                      <td>{payment.status ?? payment.payment_status ?? '-'}</td>
                      <td>{formatMoney(payment.amount ?? payment.total_amount ?? payment.value)}</td>
                      <td>{payment.created_at ? new Date(payment.created_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
