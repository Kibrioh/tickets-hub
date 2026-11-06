
import { useEffect, useState, useCallback } from "react";

const API_BASE = (
    import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/+$/, "");

if (!API_BASE) {
    throw new Error("VITE_API_BASE_URL is not configured");
}

const apiUrl = (path) => `${API_BASE}${path}`;

const assetUrl = (path) => {
    if (!path) return "";

    if (path.startsWith("/uploads/")) {
        return apiUrl(path);
    }

    if (path.startsWith("/images/")) {
        return path;
    }

    if (
        path.startsWith("http://") ||
        path.startsWith("https://")
    ) {
        return path;
    }

    return path;
};

const money = (n) =>
    `KES ${Number(n || 0).toLocaleString()}`;

const when = (d) =>
    new Date(d + "T00:00").toLocaleDateString("en-KE", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });

function Logo() {
    return (
        <svg
            width="38"
            height="38"
            viewBox="0 0 64 64"
            aria-hidden="true"
        >
            <rect
                width="64"
                height="64"
                rx="16"
                fill="#00B8D9"
            />
            <path
                d="M32 12C22 12 17 20 17 28c0 11 15 26 15 26s15-15 15-26c0-8-5-16-15-16Z"
                fill="none"
                stroke="#0B1F3A"
                strokeWidth="4"
                strokeLinejoin="round"
            />
            <circle
                cx="32"
                cy="28"
                r="4.5"
                fill="#0B1F3A"
            />
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
    "Nairobi Tech Summit 2027": "/images/Nairobi Tech Summit 2027 Poster.png"
};

/* --------------------------------
   EVENT IMAGE
--------------------------------- */

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
            <div
                className={`art-placeholder ${
                    imageLoaded ? "placeholder-hidden" : ""
                }`}
            >
                <span>{e.title}</span>
            </div>

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

/* --------------------------------
   EVENT SKELETON
--------------------------------- */

function EventSkeleton({ count = 4 }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <article
                    className="ticket skeleton-ticket"
                    key={i}
                    aria-hidden="true"
                >
                    <div className="skeleton-art"></div>

                    <div className="skeleton-body">
                        <div className="skeleton-line short"></div>
                        <div className="skeleton-line title"></div>
                        <div className="skeleton-line"></div>
                        <div className="skeleton-line medium"></div>
                    </div>

                    <div className="skeleton-stub">
                        <div className="skeleton-line price"></div>
                        <div className="skeleton-line button"></div>
                    </div>
                </article>
            ))}
        </>
    );
}

/* --------------------------------
   EVENT TICKET
--------------------------------- */

function Ticket({ e, cats, onBuy, big }) {
    const left = Number(e.left) > 0;

    return (
        <article
            className={`ticket${big ? " big" : ""}`}
            data-cat={e.category}
        >
            <Art e={e} />

            <div className="body">
                <span className="tag">
                    {cats[e.category] || "Event"}
                </span>

                <h3>{e.title}</h3>

                <p className="where">
                    {when(e.date)}
                </p>

                <p className="where">
                    {e.venue}, {e.city}
                </p>
            </div>

            <div className="stub">
                <strong>{money(e.price)}</strong>

                <small>
                    {left
                        ? `${e.left} tickets left`
                        : "Sold out"}
                </small>

                <button
                    className="btn"
                    disabled={!left}
                    onClick={() => onBuy(e)}
                >
                    {left ? "Buy tickets" : "Sold out"}
                </button>
            </div>
        </article>
    );
}

/* --------------------------------
   CHECKOUT
--------------------------------- */

function Checkout({ e, onClose }) {
    const [f, setF] = useState({
        name: "",
        email: "",
        qty: 1
    });

    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const set = (k) => (ev) =>
        setF({ ...f, [k]: ev.target.value });

    useEffect(() => {
        const esc = (ev) =>
            ev.key === "Escape" && onClose();

        window.addEventListener("keydown", esc);

        return () =>
            window.removeEventListener("keydown", esc);
    }, [onClose]);

    const pay = async (ev) => {
        ev.preventDefault();
        setBusy(true);
        setError("");

        try {
            const r = await fetch(apiUrl("/api/checkout"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    event_id: e.id,
                    ...f,
                    qty: Number(f.qty)
                })
            });

            const d = await r.json();

            if (!r.ok) {
                throw new Error(
                    d.error || "Payment initialization failed"
                );
            }

            if (!d.authorization_url) {
                throw new Error(
                    "Payment authorization URL was not returned"
                );
            }

            window.location.href = d.authorization_url;

        } catch (x) {
            setError(
                x.message || "Something went wrong. Try again."
            );

            setBusy(false);
        }
    };

    return (
        <div className="overlay" onClick={onClose}>
            <form
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-label={`Buy tickets for ${e.title}`}
                onClick={(x) => x.stopPropagation()}
                onSubmit={pay}
            >
                <h2>{e.title}</h2>

                <p className="where">
                    {when(e.date)} at {e.venue}
                </p>

                <label>
                    Full name
                    <input
                        required
                        value={f.name}
                        onChange={set("name")}
                        autoComplete="name"
                    />
                </label>

                <label>
                    Email address
                    <input
                        required
                        type="email"
                        value={f.email}
                        onChange={set("email")}
                        autoComplete="email"
                    />
                </label>

                <label>
                    Tickets
                    <select
                        value={f.qty}
                        onChange={set("qty")}
                    >
                        {Array.from(
                            {
                                length: Math.max(
                                    1,
                                    Math.min(10, Number(e.left) || 1)
                                )
                            },
                            (_, i) => (
                                <option key={i + 1}>
                                    {i + 1}
                                </option>
                            )
                        )}
                    </select>
                </label>

                <p className="total">
                    Total:{" "}
                    <strong>
                        {money(e.price * Number(f.qty))}
                    </strong>
                </p>

                {error && (
                    <p className="error" role="alert">
                        {error}
                    </p>
                )}

                <div className="row">
                    <button
                        type="button"
                        className="ghost"
                        onClick={onClose}
                    >
                        Cancel
                    </button>

                    <button className="btn" disabled={busy}>
                        {busy
                            ? "Opening Paystack..."
                            : "Pay with Paystack"}
                    </button>
                </div>
            </form>
        </div>
    );
}

/* --------------------------------
   MAIN APPLICATION
--------------------------------- */

export default function App() {
    const [events, setEvents] = useState([]);
    const [categories, setCategories] = useState([]);

    const [cat, setCat] = useState("");
    const [buying, setBuying] = useState(null);
    const [notice, setNotice] = useState(null);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    /* LOAD EVENTS AND CATEGORIES */

    const loadData = useCallback(async () => {
        setLoading(true);
        setLoadError(false);

        try {
            const [eventsResponse, categoriesResponse] =
                await Promise.all([
                    fetch(apiUrl("/api/events")),
                    fetch(apiUrl("/api/categories"))
                ]);

            if (!eventsResponse.ok) {
                throw new Error(
                    `Events API error: ${eventsResponse.status}`
                );
            }

            if (!categoriesResponse.ok) {
                throw new Error(
                    `Categories API error: ${categoriesResponse.status}`
                );
            }

            const [ev, c] = await Promise.all([
                eventsResponse.json(),
                categoriesResponse.json()
            ]);

            const eventList = Array.isArray(ev)
                ? ev
                : ev.events;

            const categoryList = Array.isArray(c)
                ? c
                : c.categories;

            if (!Array.isArray(eventList)) {
                throw new Error(
                    "Invalid events response from server"
                );
            }

            if (!Array.isArray(categoryList)) {
                throw new Error(
                    "Invalid categories response from server"
                );
            }

            setEvents(eventList);
            setCategories(categoryList);

        } catch (error) {
            console.error("Event loading error:", error);
            setLoadError(true);

        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    /* PAYSTACK PAYMENT VERIFICATION */

    useEffect(() => {
        const p = new URLSearchParams(window.location.search);

        const ref =
            p.get("reference") ||
            p.get("trxref");

        if (!ref) return;

        let active = true;

        const verifyPayment = async () => {
            try {
                const response = await fetch(
                    apiUrl(`/api/verify/${encodeURIComponent(ref)}`)
                );

                const d = await response.json();

                if (!response.ok) {
                    throw new Error(
                        d.error || "Payment verification failed"
                    );
                }

                if (!active) return;

                setNotice(
                    d.order?.status === "paid"
                        ? {
                            ok: true,
                            download: d.download,
                            text: `Payment confirmed. ${d.order.qty} ticket(s) for ${d.event}. Your ticket reference is ${d.order.ref}. Show it at the gate.`
                        }
                        : {
                            ok: false,
                            text:
                                d.error ||
                                "Your payment was not completed. Pick the event again to retry."
                        }
                );

                window.history.replaceState(
                    {},
                    "",
                    window.location.pathname
                );

            } catch (error) {
                if (!active) return;

                console.error("Payment verification error:", error);

                setNotice({
                    ok: false,
                    text:
                        "Could not confirm your payment. Check your connection and refresh."
                });
            }
        };

        verifyPayment();

        return () => {
            active = false;
        };
    }, []);

    /* EVENT FILTERING */

    const names = Object.fromEntries(
        categories.map((c) => [c.id, c.name])
    );

    const featured = events.filter((e) => e.featured);

    const shown = events.filter(
        (e) => !cat || e.category === cat
    );

    const count = (id) =>
        events.filter((e) => e.category === id).length;

    const hero = featured[0];

    /* RENDER */

    return (
        <>
            <header className="top">
                <a className="brand" href="/">
                    <Logo />
                    <span>
                        TechPoint <em>Solutions</em>
                    </span>
                </a>

                <nav>
                    <a href="#featured">Featured</a>
                    <a href="#events">Events</a>
                    <a href="#how">How it works</a>
                </nav>
            </header>

            {notice && (
                <div
                    className={`notice ${
                        notice.ok ? "ok" : "bad"
                    }`}
                    role="status"
                >
                    <span>
                        {notice.text}

                        {notice.download && (
                            <a
                                className="btn dl"
                                href={assetUrl(notice.download)}
                            >
                                Download ticket (PDF)
                            </a>
                        )}
                    </span>

                    <button
                        onClick={() => setNotice(null)}
                        aria-label="Dismiss"
                    >
                        Close
                    </button>
                </div>
            )}

            <section className="hero">
                <div className="wrap hero-grid">
                    <div>
                        <h1>
                            Tickets for the nights worth leaving home for.
                        </h1>

                        <p className="lead">
                            Football, concerts, festivals, tech summits
                            and comedy across Kenya. Pick an event, pay
                            securely with Paystack by card or mobile
                            money, and get your ticket reference
                            straight away.
                        </p>

                        <div className="row">
                            <a className="btn" href="#events">
                                Browse all events
                            </a>

                            <a
                                className="ghost light"
                                href="#featured"
                            >
                                See featured events
                            </a>
                        </div>
                    </div>

                    {loading ? (
                        <aside
                            className="hero-ticket skeleton-ticket"
                            aria-label="Loading featured event"
                        >
                            <div className="skeleton-art"></div>
                            <div className="skeleton-body">
                                <div className="skeleton-line title"></div>
                                <div className="skeleton-line"></div>
                                <div className="skeleton-line medium"></div>
                            </div>
                        </aside>
                    ) : hero ? (
                        <aside
                            className="hero-ticket"
                            aria-label="Featured event preview"
                        >
                            <Art e={hero} />

                            <p className="where">Admit one</p>

                            <h2>{hero.title}</h2>

                            <p>{when(hero.date)}</p>

                            <p>
                                {hero.venue}, {hero.city}
                            </p>

                            <div className="perf">
                                <strong>{money(hero.price)}</strong>

                                <button
                                    className="btn"
                                    onClick={() => setBuying(hero)}
                                >
                                    Get tickets
                                </button>
                            </div>
                        </aside>
                    ) : null}
                </div>
            </section>

            <main className="wrap">
                {loadError && (
                    <div className="error" role="alert">
                        <p>
                            We're having trouble connecting to our
                            events server. Please try again.
                        </p>

                        <button
                            className="btn"
                            onClick={loadData}
                            disabled={loading}
                        >
                            {loading ? "Loading..." : "Try Again"}
                        </button>
                    </div>
                )}

                {/* FEATURED EVENTS */}

                <section id="featured">
                    <h2>Featured events</h2>

                    <p className="sub">
                        Hand-picked events selling fastest this month.
                    </p>

                    <div className="featured">
                        {loading ? (
                            <EventSkeleton count={2} />
                        ) : !loadError && featured.length === 0 ? (
                            <p>No featured events available right now.</p>
                        ) : (
                            !loadError &&
                            featured.map((e) => (
                                <Ticket
                                    key={e.id}
                                    e={e}
                                    cats={names}
                                    onBuy={setBuying}
                                    big
                                />
                            ))
                        )}
                    </div>
                </section>

                {/* ALL EVENTS */}

                <section id="events">
                    <h2>Browse by category</h2>

                    <div className="cats">
                        <button
                            className={!cat ? "on" : ""}
                            onClick={() => setCat("")}
                            disabled={loading || loadError}
                        >
                            All events

                            <small>
                                {loading
                                    ? "Loading..."
                                    : `${events.length} events`}
                            </small>
                        </button>

                        {categories.map((c) => (
                            <button
                                key={c.id}
                                data-cat={c.id}
                                className={cat === c.id ? "on" : ""}
                                onClick={() => setCat(c.id)}
                                disabled={loading || loadError}
                            >
                                {c.name}

                                <small>
                                    {loading
                                        ? "Loading..."
                                        : `${count(c.id)} events`}
                                </small>
                            </button>
                        ))}
                    </div>

                    <div className="list">
                        {loading ? (
                            <EventSkeleton count={4} />
                        ) : loadError ? (
                            <p className="error">
                                Events are temporarily unavailable.
                                Please use the retry button above.
                            </p>
                        ) : shown.length === 0 ? (
                            <p>
                                No events available in this category.
                            </p>
                        ) : (
                            shown.map((e) => (
                                <Ticket
                                    key={e.id}
                                    e={e}
                                    cats={names}
                                    onBuy={setBuying}
                                />
                            ))
                        )}
                    </div>
                </section>

                {/* HOW IT WORKS */}

                <section id="how">
                    <h2>How it works</h2>

                    <ol className="steps">
                        <li>
                            <h3>Pick an event</h3>
                            <p>
                                Filter by sport, music, festivals, tech
                                or comedy and choose how many tickets
                                you need.
                            </p>
                        </li>

                        <li>
                            <h3>Pay with Paystack</h3>
                            <p>
                                Use your card or mobile money on
                                Paystack's secure page. We never see
                                your card details.
                            </p>
                        </li>

                        <li>
                            <h3>Show your reference</h3>
                            <p>
                                You get a ticket reference as soon as
                                the payment clears. Show it at the gate.
                            </p>
                        </li>
                    </ol>
                </section>
            </main>

            <footer>
                <div className="wrap">
                    <strong>TechPoint Solutions</strong>
                    <p>Events and ticketing. Payments by Paystack.</p>
                </div>
            </footer>

            {buying && (
                <Checkout
                    e={buying}
                    onClose={() => setBuying(null)}
                />
            )}
        </>
    );
}
