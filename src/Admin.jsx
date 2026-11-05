import { useEffect, useState } from "react";

const money = (c) => `KES ${(c / 100).toLocaleString()}`;
const blank = { title: "", category: "sports", venue: "", city: "Nairobi", date: "", price: 1000, capacity: 100, blurb: "", image: "", featured: false, active: true };

const call = (path, token, method = "GET", body) =>
  fetch(`/api/admin/${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body && JSON.stringify(body),
  }).then(async (r) => {
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || "Request failed"), { status: r.status });
    return d;
  });

export default function Admin() {
  const [token, setToken] = useState(sessionStorage.getItem("tp_admin") || "");
  const [pw, setPw] = useState("");
  const [tab, setTab] = useState("overview");
  const [sum, setSum] = useState(null);
  const [orders, setOrders] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");

  const out = () => { sessionStorage.removeItem("tp_admin"); setToken(""); };
  const fail = (x) => (x.status === 401 ? out() : setMsg(x.message));

  const load = () =>
    Promise.all([call("summary", token), call("orders", token)])
      .then(([s, o]) => { setSum(s); setOrders(o); })
      .catch(fail);

  useEffect(() => {
    if (!token) return;
    load();
    fetch("/api/categories").then((r) => r.json()).then(setCats);
  }, [token]);

  const login = async (e) => {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    const d = await r.json();
    if (!r.ok) return setMsg(d.error);
    sessionStorage.setItem("tp_admin", d.token);
    setToken(d.token);
    setPw("");
  };

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await call(form.id ? `events/${form.id}` : "events", token, form.id ? "PUT" : "POST", form);
      setForm(null);
      load();
    } catch (x) { fail(x); }
  };

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/admin/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
    const d = await r.json();
    if (!r.ok) return setMsg(d.error);
    setForm((f) => ({ ...f, image: d.url }));
  };

  const resend = (ref) =>
    call(`orders/${ref}/resend`, token, "POST").then(() => setMsg(`Receipt for ${ref} is on its way.`)).catch(fail);

  if (!token)
    return (
      <div className="adm-login">
        <form className="modal" onSubmit={login}>
          <h2>TechPoint admin</h2>
          <label>Password<input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          {msg && <p className="error" role="alert">{msg}</p>}
          <button className="btn">Sign in</button>
        </form>
      </div>
    );

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div className="adm">
      <header className="top">
        <strong>TechPoint admin</strong>
        <span className="row"><a href="/">View site</a><button className="ghost light" onClick={out}>Sign out</button></span>
      </header>
      <div className="wrap">
        <div className="adm-tabs">
          {["overview", "orders", "events"].map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        {msg && <p className="notice ok" role="status">{msg}</p>}

        {sum && tab === "overview" && (
          <>
            <div className="stats">
              <div><small>Revenue</small><strong>{money(sum.revenue)}</strong></div>
              <div><small>Tickets sold</small><strong>{sum.tickets}</strong></div>
              <div><small>Paid orders</small><strong>{sum.paid_orders}</strong></div>
              <div><small>Unpaid orders</small><strong>{sum.unpaid_orders}</strong></div>
            </div>
            <div className="tbl"><table>
              <thead><tr><th>Event</th><th>Sold</th><th>Revenue</th></tr></thead>
              <tbody>{sum.events.map((e) => <tr key={e.id}><td>{e.title}</td><td>{e.sold} of {e.capacity}</td><td>{money(e.revenue)}</td></tr>)}</tbody>
            </table></div>
          </>
        )}

        {tab === "orders" && (
          <div className="tbl"><table>
            <thead><tr><th>Reference</th><th>Buyer</th><th>Event</th><th>Qty</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan="7">No orders yet. They appear here once someone starts checkout.</td></tr>}
              {orders.map((o) => (
                <tr key={o.ref}>
                  <td>{o.ref}</td><td>{o.name}<br /><small>{o.email}</small></td><td>{o.event}</td><td>{o.qty}</td><td>{money(o.amount)}</td>
                  <td><span className={`pill ${o.status}`}>{o.status}</span></td>
                  <td>{o.status === "paid" && <button className="ghost" onClick={() => resend(o.ref)}>Resend receipt</button>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

        {sum && tab === "events" && (
          <>
            <button className="btn" onClick={() => setForm({ ...blank })}>Add event</button>
            {form && (
              <form className="adm-form" onSubmit={save}>
                <label>Title<input required value={form.title} onChange={set("title")} /></label>
                <label>Category<select value={form.category} onChange={set("category")}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label>Venue<input required value={form.venue} onChange={set("venue")} /></label>
                <label>City<input required value={form.city} onChange={set("city")} /></label>
                <label>Date<input required type="date" value={form.date} onChange={set("date")} /></label>
                <label>Price (KES)<input required type="number" min="0" value={form.price} onChange={set("price")} /></label>
                <label>Capacity<input required type="number" min="1" value={form.capacity} onChange={set("capacity")} /></label>
                <div className="wide img-field">
                  {form.image && <img src={form.image} alt="" />}
                  <label>Event image (JPG, PNG or WebP)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} /></label>
                  <label>Or image web address<input value={form.image || ""} onChange={set("image")} placeholder="https://..." /></label>
                  <label>Image description for screen readers<input value={form.blurb} onChange={set("blurb")} /></label>
                </div>
                <label className="chk"><input type="checkbox" checked={form.featured} onChange={set("featured")} />Show in featured events</label>
                <label className="chk"><input type="checkbox" checked={form.active} onChange={set("active")} />Visible on the site</label>
                <div className="row wide"><button className="btn">Save event</button><button type="button" className="ghost" onClick={() => setForm(null)}>Cancel</button></div>
              </form>
            )}
            <div className="tbl"><table>
              <thead><tr><th>Event</th><th>Date</th><th>Price</th><th>Left</th><th>Status</th><th></th></tr></thead>
              <tbody>{sum.events.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}</td><td>{e.date}</td><td>KES {e.price.toLocaleString()}</td><td>{e.left}</td>
                  <td>{e.active ? (e.featured ? "Featured" : "Visible") : "Hidden"}</td>
                  <td><button className="ghost" onClick={() => setForm({ ...e })}>Edit</button></td>
                </tr>
              ))}</tbody>
            </table></div>
          </>
        )}
      </div>
    </div>
  );
}
