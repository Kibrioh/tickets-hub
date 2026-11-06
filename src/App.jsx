import { useEffect, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
if (!API_BASE) {
  throw new Error("VITE_API_BASE_URL is not configured");
}
const apiUrl = (path) => `${API_BASE}${path}`;

const assetUrl = (path) => {
  if (!path) return "";

  // Admin-uploaded images stored on Flask backend
  if (path.startsWith("/uploads/")) {
    return apiUrl(path);
  }

  // Frontend static images in public/images
  if (path.startsWith("/images/")) {
    return path;
  }

  // External image URLs
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return path;
};


const money = (n) => `KES ${n.toLocaleString()}`;
const when = (d) =>
  new Date(d + "T00:00").toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

function Logo() {
  return (
    <svg width="38" height="38" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#00B8D9" />
      <path d="M32 12C22 12 17 20 17 28c0 11 15 26 15 26s15-15 15-26c0-8-5-16-15-16Z" fill="none" stroke="#0B1F3A" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="32" cy="28" r="4.5" fill="#0B1F3A" />
    </svg>
  );
}

const DEFAULT_EVENT_IMAGES = {
  "Bayern Munchen Vs Ajax": "/images/image_73154e41.jpg",
  "Startup Pitch Night": "/images/startup_pitch_night.png",
  "Laugh Out Loud Comedy Night": "/images/laugh_out_loud_comedy_night.png",
  "Sunset Afrobeats Live": "/images/sunset_afrobeats_live.png",
  "Rugby Sevens Showdown": "/images/rugby_sevens_showdown.png",
  "Naivasha Food and Music Fest": "/images/naivasha_food_and_music_fest.png",
  "Jazz at the Gardens": "/images/jazz_at_the_gardens.png",
  "Nairobi Tech Summit 2027": "/images/Nairobi Tech Summit 2027 Poster.png",
};



function Art({ e }) {
  const image = DEFAULT_EVENT_IMAGES[e.title] || e.image;

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [image]);

  return (
    <div className="art">
      {/* Placeholder displayed while image loads */}
      <div
        className={`art-placeholder ${
          imageLoaded ? "placeholder-hidden" : ""
        }`}
      >
        <span>{e.title}</span>
      </div>

      {/* Actual event image */}
      {image && !imageError && (
        <img
          key={image}
          src={assetUrl(image)}
          alt={e.blurb || e.title}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className={`event-image ${
            imageLoaded ? "image-visible" : ""
          }`}
        />
      )}
    </div>
  );
}


function Ticket({ e, cats, onBuy, big }) {
  const left = e.left > 0;
  return (
    <article className={`ticket${big ? " big" : ""}`} data-cat={e.category}>
      <Art e={e} />
      <div className="body">
        <span className="tag">{cats[e.category]}</span>
        <h3>{e.title}</h3>
        <p className="where">{when(e.date)}</p>
        <p className="where">{e.venue}, {e.city}</p>
      </div>
      <div className="stub">
        <strong>{money(e.price)}</strong>
        <small>{left ? `${e.left} tickets left` : "Sold out"}</small>
        <button className="btn" disabled={!left} onClick={() => onBuy(e)}>{left ? "Buy tickets" : "Sold out"}</button>
      </div>
    </article>
  );
}

function Checkout({ e, onClose }) {
  const [f, setF] = useState({ name: "", email: "", qty: 1 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (ev) => setF({ ...f, [k]: ev.target.value });

  useEffect(() => {
    const esc = (ev) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const pay = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(apiUrl("/api/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: e.id, ...f, qty: Number(f.qty) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      window.location = d.authorization_url;
    } catch (x) {
      setError(x.message || "Something went wrong. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={`Buy tickets for ${e.title}`} onClick={(x) => x.stopPropagation()} onSubmit={pay}>
        <h2>{e.title}</h2>
        <p className="where">{when(e.date)} at {e.venue}</p>
        <label>Full name<input required value={f.name} onChange={set("name")} autoComplete="name" /></label>
        <label>Email address<input required type="email" value={f.email} onChange={set("email")} autoComplete="email" /></label>
        <label>Tickets
          <select value={f.qty} onChange={set("qty")}>
            {Array.from({ length: Math.min(10, e.left) }, (_, i) => <option key={i + 1}>{i + 1}</option>)}
          </select>
        </label>
        <p className="total">Total: <strong>{money(e.price * f.qty)}</strong></p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? "Opening Paystack" : "Pay with Paystack"}</button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cat, setCat] = useState("");
  const [buying, setBuying] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    Promise.all([fetch(apiUrl("/api/events")).then((r) => r.json()), fetch(apiUrl("/api/categories")).then((r) => r.json())])
      .then(([ev, c]) => { setEvents(ev); setCategories(c); })
      .catch(() => setLoadError(true));

    const p = new URLSearchParams(location.search);
    const ref = p.get("reference") || p.get("trxref");
    if (ref) {
      fetch(apiUrl(`/api/verify/${ref}`)).then((r) => r.json()).then((d) => {
        setNotice(d.order?.status === "paid"
          ? { ok: true, download: d.download, text: `Payment confirmed. ${d.order.qty} ticket(s) for ${d.event}. Your ticket reference is ${d.order.ref}. Show it at the gate.` }
          : { ok: false, text: d.error || "Your payment was not completed. Pick the event again to retry." });
        history.replaceState({}, "", "/");
      }).catch(() => setNotice({ ok: false, text: "Could not confirm your payment. Check your connection and refresh." }));
    }
  }, []);

  const names = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const featured = events.filter((e) => e.featured);
  const shown = events.filter((e) => !cat || e.category === cat);
  const count = (id) => events.filter((e) => e.category === id).length;
  const hero = featured[0];

  return (
    <>
      <header className="top">
        <a className="brand" href="/"><Logo /><span>TechPoint <em>Solutions</em></span></a>
        <nav><a href="#featured">Featured</a><a href="#events">Events</a><a href="#how">How it works</a></nav>
      </header>

      {notice && <div className={`notice ${notice.ok ? "ok" : "bad"}`} role="status"><span>{notice.text}{notice.download && <a className="btn dl" href={assetUrl(notice.download)}>Download ticket (PDF)</a>}</span><button onClick={() => setNotice(null)} aria-label="Dismiss">Close</button></div>}

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>Tickets for the nights worth leaving home for.</h1>
            <p className="lead">Football, concerts, festivals, tech summits and comedy across Kenya. Pick an event, pay securely with Paystack by card or mobile money, and get your ticket reference straight away.</p>
            <div className="row">
              <a className="btn" href="#events">Browse all events</a>
              <a className="ghost light" href="#featured">See featured events</a>
            </div>
          </div>
          {hero && (
            <aside className="hero-ticket" aria-label="Featured event preview">
              <Art e={hero} />
              <p className="where">Admit one</p>
              <h2>{hero.title}</h2>
              <p>{when(hero.date)}</p>
              <p>{hero.venue}, {hero.city}</p>
              <div className="perf"><strong>{money(hero.price)}</strong><button className="btn" onClick={() => setBuying(hero)}>Get tickets</button></div>
            </aside>
          )}
        </div>
      </section>

      <main className="wrap">
        {loadError && <p className="error">Events could not be loaded. Make sure the Flask server is running on port 5000.</p>}

        <section id="featured">
          <h2>Featured events</h2>
          <p className="sub">Hand-picked events selling fastest this month.</p>
          <div className="featured">{featured.map((e) => <Ticket key={e.id} e={e} cats={names} onBuy={setBuying} big />)}</div>
        </section>

        <section id="events">
          <h2>Browse by category</h2>
          <div className="cats">
            <button className={!cat ? "on" : ""} onClick={() => setCat("")}>All events<small>{events.length} events</small></button>
            {categories.map((c) => (
              <button key={c.id} data-cat={c.id} className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>
                {c.name}<small>{count(c.id)} events</small>
              </button>
            ))}
          </div>
          <div className="list">
            {shown.map((e) => <Ticket key={e.id} e={e} cats={names} onBuy={setBuying} />)}
          </div>
        </section>

        <section id="how">
          <h2>How it works</h2>
          <ol className="steps">
            <li><h3>Pick an event</h3><p>Filter by sport, music, festivals, tech or comedy and choose how many tickets you need.</p></li>
            <li><h3>Pay with Paystack</h3><p>Use your card or mobile money on Paystack's secure page. We never see your card details.</p></li>
            <li><h3>Show your reference</h3><p>You get a ticket reference as soon as the payment clears. Show it at the gate.</p></li>
          </ol>
        </section>
      </main>

      <footer>
        <div className="wrap"><strong>TechPoint Solutions</strong><p>Events and ticketing. Payments by Paystack.</p></div>
      </footer>

      {buying && <Checkout e={buying} onClose={() => setBuying(null)} />}
    </>
  );
}
