import { useState, useEffect, useCallback } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d) =>
  new Date(d).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error del servidor");
  return data;
}

// ─── Rating badges ─────────────────────────────────────────────────────────────
const RATING_COLORS = {
  G:    { bg: "#1a6e3c", text: "#d4f7e5" },
  PG:   { bg: "#1a4e8e", text: "#d0e8ff" },
  "PG-13": { bg: "#7a4e00", text: "#ffe4a0" },
  R:    { bg: "#8e1a1a", text: "#ffd0d0" },
  "NC-17": { bg: "#3d0060", text: "#e8c8ff" },
  TP:   { bg: "#1a6e3c", text: "#d4f7e5" },
  "+7": { bg: "#1a4e8e", text: "#d0e8ff" },
  "+13":{ bg: "#7a4e00", text: "#ffe4a0" },
  "+16":{ bg: "#8e2a00", text: "#ffe0cc" },
  "+18":{ bg: "#8e1a1a", text: "#ffd0d0" },
};

const RatingBadge = ({ rating }) => {
  const colors = RATING_COLORS[rating] || { bg: "#444", text: "#fff" };
  return (
    <span style={{
      background: colors.bg, color: colors.text,
      fontSize: "11px", fontWeight: 700, padding: "2px 8px",
      borderRadius: "4px", letterSpacing: "0.05em",
      fontFamily: "'DM Mono', monospace",
    }}>{rating}</span>
  );
};

// ─── Top nav ──────────────────────────────────────────────────────────────────
function Nav({ page, setPage, isAdmin, onLogout }) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(8,8,12,0.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px", height: "60px",
    }}>
      <button onClick={() => setPage("catalog")} style={{
        background: "none", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <span style={{ fontSize: "22px", filter: "drop-shadow(0 0 8px rgba(255,180,0,0.6))" }}>🎬</span>
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: "24px",
          letterSpacing: "0.12em", color: "#f5c842",
        }}>CINEMAX</span>
      </button>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {isAdmin ? (
          <>
            <NavBtn active={page === "admin"} onClick={() => setPage("admin")}>Panel Admin</NavBtn>
            <NavBtn onClick={onLogout} danger>Cerrar sesión</NavBtn>
          </>
        ) : (
          <>
            <NavBtn active={page === "catalog"} onClick={() => setPage("catalog")}>Cartelera</NavBtn>
            <NavBtn onClick={() => setPage("login")}>Admin</NavBtn>
          </>
        )}
      </div>
    </nav>
  );
}

function NavBtn({ children, active, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "#f5c842" : danger ? "rgba(220,50,50,0.15)" : "rgba(255,255,255,0.06)",
      color: active ? "#08080c" : danger ? "#ff6b6b" : "rgba(255,255,255,0.8)",
      border: `1px solid ${active ? "#f5c842" : danger ? "rgba(220,50,50,0.4)" : "rgba(255,255,255,0.1)"}`,
      borderRadius: "6px", padding: "6px 16px", fontSize: "13px",
      fontWeight: active ? 700 : 400, cursor: "pointer",
      transition: "all 0.15s", fontFamily: "inherit",
    }}>{children}</button>
  );
}

// ─── Movie card ────────────────────────────────────────────────────────────────
function MovieCard({ movie, onBuy }) {
  const [hovered, setHovered] = useState(false);
  const available = movie.asientos_vip_disponibles + movie.asientos_estandar_disponibles;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? "rgba(245,200,66,0.4)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "12px", overflow: "hidden",
        transition: "all 0.2s", transform: hovered ? "translateY(-4px)" : "none",
        boxShadow: hovered ? "0 20px 40px rgba(0,0,0,0.5)" : "none",
        cursor: "default",
      }}
    >
      {/* Poster placeholder */}
      <div style={{
        height: "220px", position: "relative",
        background: `linear-gradient(135deg, ${movie._color || "#1a1a2e"} 0%, #16213e 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "64px",
      }}>
        {movie.emoji || "🎥"}
        <div style={{
          position: "absolute", top: "10px", left: "10px",
        }}>
          <RatingBadge rating={movie.clasificacion} />
        </div>
        {available === 0 && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.7)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#ff6b6b", fontWeight: 700, fontSize: "16px", letterSpacing: "0.1em" }}>AGOTADO</span>
          </div>
        )}
      </div>

      <div style={{ padding: "16px" }}>
        <h3 style={{
          margin: "0 0 6px", fontSize: "16px", fontWeight: 700,
          color: "#fff", fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: "0.05em", lineHeight: 1.2,
        }}>{movie.titulo}</h3>

        <p style={{
          margin: "0 0 12px", fontSize: "12px",
          color: "rgba(255,255,255,0.5)", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{movie.descripcion}</p>

        {movie.horario && (
          <div style={{
            fontSize: "11px", color: "rgba(255,255,255,0.4)",
            marginBottom: "12px",
          }}>
            🕐 {fmtDate(movie.horario)}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
          <PricePill label="Estándar" price={movie.precio_estandar} seats={movie.asientos_estandar_disponibles} />
          <PricePill label="VIP" price={movie.precio_vip} seats={movie.asientos_vip_disponibles} gold />
        </div>

        <button
          onClick={() => onBuy(movie)}
          disabled={available === 0}
          style={{
            width: "100%", padding: "10px",
            background: available === 0 ? "rgba(255,255,255,0.05)" : "#f5c842",
            color: available === 0 ? "rgba(255,255,255,0.3)" : "#08080c",
            border: "none", borderRadius: "8px",
            fontWeight: 700, fontSize: "13px", cursor: available === 0 ? "not-allowed" : "pointer",
            fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.1em",
            transition: "all 0.15s",
          }}
        >
          {available === 0 ? "SIN DISPONIBILIDAD" : "COMPRAR BOLETOS"}
        </button>
      </div>
    </div>
  );
}

function PricePill({ label, price, seats, gold }) {
  return (
    <div style={{
      flex: 1, padding: "8px",
      background: gold ? "rgba(245,200,66,0.08)" : "rgba(255,255,255,0.05)",
      border: `1px solid ${gold ? "rgba(245,200,66,0.2)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: "8px", textAlign: "center",
    }}>
      <div style={{ fontSize: "10px", color: gold ? "#f5c842" : "rgba(255,255,255,0.4)", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "13px", fontWeight: 700, color: gold ? "#f5c842" : "#fff" }}>{fmt(price)}</div>
      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>{seats} disp.</div>
    </div>
  );
}

// ─── Purchase modal ────────────────────────────────────────────────────────────
function PurchaseModal({ movie, onClose, onSuccess }) {
  const [form, setForm] = useState({ nombre: "", email: "", tipo: "estandar", cantidad: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const maxSeats = form.tipo === "vip" ? movie.asientos_vip_disponibles : movie.asientos_estandar_disponibles;
  const precio = form.tipo === "vip" ? movie.precio_vip : movie.precio_estandar;
  const total = precio * form.cantidad;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nombre.trim() || !form.email.trim()) { setError("Completa todos los campos."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Email inválido."); return; }
    if (form.cantidad < 1 || form.cantidad > maxSeats) { setError(`Máximo ${maxSeats} asientos disponibles.`); return; }
    setError(""); setLoading(true);
    try {
      const result = await apiFetch("/compras", {
        method: "POST",
        body: JSON.stringify({
  pelicula_id: movie.id,
  nombre_cliente: form.nombre,
  email_cliente: form.email,
  tipo_boleto: form.tipo,
  cantidad: form.cantidad
}),
      });
      onSuccess(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "28px", minWidth: "360px", maxWidth: "440px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: "22px", letterSpacing: "0.05em", color: "#f5c842" }}>
              Comprar boletos
            </h2>
            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>{movie.titulo}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "20px", padding: "0" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Field label="Nombre completo">
            <Input value={form.nombre} onChange={v => set("nombre", v)} placeholder="Ej: Carlos Pérez" />
          </Field>
          <Field label="Correo electrónico">
            <Input value={form.email} onChange={v => set("email", v)} placeholder="correo@ejemplo.com" type="email" />
          </Field>
          <Field label="Tipo de boleto">
            <div style={{ display: "flex", gap: "8px" }}>
              {["estandar", "vip"].map(t => (
                <button key={t} onClick={() => { set("tipo", t); set("cantidad", 1); }} style={{
                  flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer",
                  background: form.tipo === t ? (t === "vip" ? "#f5c842" : "#fff") : "rgba(255,255,255,0.06)",
                  color: form.tipo === t ? "#08080c" : "rgba(255,255,255,0.6)",
                  border: `1px solid ${form.tipo === t ? "transparent" : "rgba(255,255,255,0.1)"}`,
                  fontWeight: 700, fontSize: "13px", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}>
                  {t === "vip" ? "⭐ VIP" : "🎟 Estándar"}<br />
                  <span style={{ fontWeight: 400, fontSize: "11px" }}>{fmt(t === "vip" ? movie.precio_vip : movie.precio_estandar)}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label={`Cantidad (máx. ${maxSeats})`}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={() => set("cantidad", Math.max(1, form.cantidad - 1))} style={qtyBtn}>−</button>
              <span style={{ fontSize: "20px", fontWeight: 700, color: "#fff", minWidth: "30px", textAlign: "center" }}>{form.cantidad}</span>
              <button onClick={() => set("cantidad", Math.min(maxSeats, form.cantidad + 1))} style={qtyBtn}>+</button>
            </div>
          </Field>
        </div>

        {error && (
          <div style={{ marginTop: "12px", padding: "10px 12px", background: "rgba(220,50,50,0.15)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: "8px", color: "#ff8080", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <div style={{
          marginTop: "20px", padding: "14px",
          background: "rgba(245,200,66,0.08)", border: "1px solid rgba(245,200,66,0.2)",
          borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>Total a pagar</span>
          <span style={{ color: "#f5c842", fontSize: "22px", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmt(total)}</span>
        </div>

        <button onClick={handleSubmit} disabled={loading || maxSeats === 0} style={{
          marginTop: "16px", width: "100%", padding: "14px",
          background: loading ? "rgba(255,255,255,0.1)" : "#f5c842",
          color: loading ? "rgba(255,255,255,0.4)" : "#08080c",
          border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.1em",
          transition: "all 0.15s",
        }}>
          {loading ? "PROCESANDO..." : "CONFIRMAR COMPRA"}
        </button>
      </div>
    </Overlay>
  );
}

const qtyBtn = {
  width: "36px", height: "36px", borderRadius: "8px",
  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff", fontSize: "18px", cursor: "pointer", fontFamily: "inherit",
};

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "10px 12px", boxSizing: "border-box",
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "8px", color: "#fff", fontSize: "14px", fontFamily: "inherit",
        outline: "none",
      }}
    />
  );
}

// ─── Invoice / confirmation ────────────────────────────────────────────────────
function InvoicePage({ invoice, onBack }) {
  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", padding: "40px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎉</div>
        <h1 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", color: "#f5c842", letterSpacing: "0.1em" }}>¡COMPRA EXITOSA!</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>Tu factura fue enviada a <strong style={{ color: "#fff" }}>{invoice.email_cliente}</strong></p>
      </div>

      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "16px", overflow: "hidden",
      }}>
        <div style={{ background: "rgba(245,200,66,0.1)", borderBottom: "1px solid rgba(245,200,66,0.2)", padding: "16px 24px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#f5c842", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>FACTURA #{invoice.numero_factura}</span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>{fmtDate(invoice.fecha_compra)}</span>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {[
            ["Cliente", invoice.nombre_cliente],
            ["Correo", invoice.email_cliente],
            ["Película", invoice.titulo_pelicula],
            ["Tipo de boleto", invoice.tipo_boleto === "vip" ? "⭐ VIP" : "🎟 Estándar"],
            ["Cantidad", `${invoice.cantidad} boleto${invoice.cantidad > 1 ? "s" : ""}`],
            ["Asientos asignados", invoice.asientos?.join(", ") || "—"],
            ["Total", fmt(invoice.total)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "12px" }}>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>{k}</span>
              <span style={{ color: k === "Total" ? "#f5c842" : "#fff", fontWeight: k === "Total" ? 700 : 400, fontSize: k === "Total" ? "20px" : "14px", fontFamily: k === "Asientos asignados" || k === "Total" ? "'DM Mono', monospace" : "inherit" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onBack} style={{
        marginTop: "24px", width: "100%", padding: "14px",
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px", color: "#fff", fontSize: "14px", cursor: "pointer",
        fontFamily: "inherit",
      }}>
        ← Volver a la cartelera
      </button>
    </div>
  );
}

// ─── Catalog page ──────────────────────────────────────────────────────────────
function CatalogPage({ onBuy }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/peliculas");
      const colors = ["#1a1a2e","#16213e","#0f3460","#1b1b2f","#162032","#1e1428","#1a2818"];
      const emojis = ["🎬","🎥","🎞","🍿","🎦","🎭","🌟","🔥","💥","👾"];
      setMovies(data.map((m, i) => ({ ...m, _color: colors[i % colors.length], emoji: emojis[i % emojis.length] })));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: "36px" }}>
        <h1 style={{ margin: "0 0 8px", fontFamily: "'Bebas Neue', sans-serif", fontSize: "40px", letterSpacing: "0.08em", color: "#fff" }}>
          CARTELERA <span style={{ color: "#f5c842" }}>HOY</span>
        </h1>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
          Selecciona tu película y compra tus boletos en segundos
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "80px", color: "rgba(255,255,255,0.3)" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎬</div>
          Cargando cartelera...
        </div>
      )}
      {error && <ErrorBox msg={error} onRetry={load} />}
      {!loading && !error && movies.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px", color: "rgba(255,255,255,0.3)" }}>
          No hay películas disponibles
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: "20px",
      }}>
        {movies.map(m => <MovieCard key={m.id} movie={m} onBuy={onBuy} />)}
      </div>
    </div>
  );
}

// ─── Admin login ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.email || !form.password) { setError("Completa los campos."); return; }
    setLoading(true); setError("");
    try {
      const data = await apiFetch("/admin/login", { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("admin_token", data.token);
      onLogin();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)", padding: "24px" }}>
      <div style={{
        width: "100%", maxWidth: "380px", padding: "36px",
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
      }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>🔐</div>
          <h2 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: "24px", color: "#f5c842", letterSpacing: "0.08em" }}>ACCESO ADMIN</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Field label="Email">
            <Input value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="admin@cinemax.com" type="email" />
          </Field>
          <Field label="Contraseña">
            <Input value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="••••••••" type="password" />
          </Field>
        </div>
        {error && <div style={{ marginTop: "12px", color: "#ff8080", fontSize: "13px" }}>{error}</div>}
        <button onClick={submit} disabled={loading} style={{
          marginTop: "20px", width: "100%", padding: "12px",
          background: "#f5c842", color: "#08080c", border: "none",
          borderRadius: "8px", fontWeight: 700, fontSize: "14px",
          cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.1em",
        }}>
          {loading ? "VERIFICANDO..." : "INGRESAR"}
        </button>
      </div>
    </div>
  );
}

// ─── Admin panel ───────────────────────────────────────────────────────────────
function AdminPanel() {
  const [tab, setTab] = useState("movies");
  const [movies, setMovies] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadMovies = async () => {
    try { setMovies(await apiFetch("/peliculas")); }
    catch (e) { setError(e.message); }
  };
  const loadSales = async () => {
    try { setSales(await apiFetch("/admin/ventas")); }
    catch (e) { setError(e.message); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMovies(), loadSales()]).finally(() => setLoading(false));
  }, []);

  const deleteMovie = async (id) => {
    if (!confirm("¿Eliminar esta película?")) return;
    try {
      await apiFetch(`/admin/peliculas/${id}`, { method: "DELETE" });
      await loadMovies();
    } catch (e) { setError(e.message); }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ margin: "0 0 24px", fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", color: "#f5c842", letterSpacing: "0.1em" }}>
        PANEL DE ADMINISTRACIÓN
      </h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "28px" }}>
        {["movies", "sales"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px",
            background: tab === t ? "#f5c842" : "rgba(255,255,255,0.06)",
            color: tab === t ? "#08080c" : "rgba(255,255,255,0.7)",
            border: `1px solid ${tab === t ? "#f5c842" : "rgba(255,255,255,0.1)"}`,
            fontWeight: tab === t ? 700 : 400,
          }}>
            {t === "movies" ? "🎬 Películas" : "📊 Ventas"}
          </button>
        ))}
      </div>

      {error && <ErrorBox msg={error} onRetry={() => setError("")} />}

      {tab === "movies" && (
        <>
          <button onClick={() => setCreating(true)} style={{
            marginBottom: "20px", padding: "10px 20px",
            background: "#f5c842", color: "#08080c", border: "none",
            borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: "0.08em",
          }}>
            + AGREGAR PELÍCULA
          </button>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Título", "Clasificación", "Precio Std", "Precio VIP", "Asientos Std", "Asientos VIP", "Horario", "Acciones"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "rgba(255,255,255,0.4)", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movies.map(m => (
                  <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "12px", color: "#fff", fontWeight: 500 }}>{m.titulo}</td>
                    <td style={{ padding: "12px" }}><RatingBadge rating={m.clasificacion} /></td>
                    <td style={{ padding: "12px", color: "rgba(255,255,255,0.7)", fontFamily: "'DM Mono', monospace" }}>{fmt(m.precio_estandar)}</td>
                    <td style={{ padding: "12px", color: "#f5c842", fontFamily: "'DM Mono', monospace" }}>{fmt(m.precio_vip)}</td>
                    <td style={{ padding: "12px", color: "rgba(255,255,255,0.6)" }}>{m.asientos_estandar_disponibles}/{m.asientos_estandar_total}</td>
                    <td style={{ padding: "12px", color: "rgba(255,255,255,0.6)" }}>{m.asientos_vip_disponibles}/{m.asientos_vip_total}</td>
                    <td style={{ padding: "12px", color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>{m.horario ? fmtDate(m.horario) : "—"}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <ActionBtn onClick={() => setEditing(m)}>✏️ Editar</ActionBtn>
                        <ActionBtn onClick={() => deleteMovie(m.id)} danger>🗑️ Eliminar</ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "sales" && (
        <div>
          <div style={{ marginBottom: "16px", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
            Total de ventas: <strong style={{ color: "#fff" }}>{sales.length}</strong> — Recaudado: <strong style={{ color: "#f5c842" }}>{fmt(sales.reduce((a, s) => a + Number(s.total), 0))}</strong>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Factura", "Cliente", "Email", "Película", "Tipo", "Cant.", "Asientos", "Total", "Fecha"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "rgba(255,255,255,0.4)", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "10px 12px", fontFamily: "'DM Mono', monospace", color: "#f5c842", fontSize: "11px" }}>{s.numero_factura}</td>
                    <td style={{ padding: "10px 12px", color: "#fff" }}>{s.nombre_cliente}</td>
                    <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>{s.email_cliente}</td>
                    <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.7)" }}>{s.titulo_pelicula}</td>
                    <td style={{ padding: "10px 12px" }}>{s.tipo_boleto === "vip" ? <span style={{ color: "#f5c842" }}>⭐ VIP</span> : "Std"}</td>
                    <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.6)", textAlign: "center" }}>{s.cantidad}</td>
                    <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{s.asientos_asignados}</td>
                    <td style={{ padding: "10px 12px", color: "#f5c842", fontFamily: "'DM Mono', monospace" }}>{fmt(s.total)}</td>
                    <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>{fmtDate(s.fecha_compra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(creating || editing) && (
        <MovieFormModal
          movie={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); loadMovies(); }}
        />
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 10px", borderRadius: "6px", cursor: "pointer",
      background: danger ? "rgba(220,50,50,0.1)" : "rgba(255,255,255,0.06)",
      border: `1px solid ${danger ? "rgba(220,50,50,0.3)" : "rgba(255,255,255,0.1)"}`,
      color: danger ? "#ff8080" : "rgba(255,255,255,0.7)",
      fontSize: "12px", fontFamily: "inherit",
    }}>{children}</button>
  );
}

// ─── Movie form modal ──────────────────────────────────────────────────────────
const EMPTY_MOVIE = {
  titulo: "", descripcion: "", clasificacion: "TP",
  precio_vip: "", precio_estandar: "",
  asientos_vip_total: 30, asientos_estandar_total: 80,
  horario: "",
};

function MovieFormModal({ movie, onClose, onSaved }) {
  const [form, setForm] = useState(movie ? {
    ...movie,
    horario: movie.horario ? new Date(movie.horario).toISOString().slice(0, 16) : "",
  } : EMPTY_MOVIE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.titulo.trim()) { setError("El título es requerido."); return; }
    setLoading(true); setError("");
    try {
      const payload = { ...form, precio_vip: Number(form.precio_vip), precio_estandar: Number(form.precio_estandar) };
      if (movie) {
        await apiFetch(`/admin/peliculas/${movie.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/admin/peliculas", { method: "POST", body: JSON.stringify(payload) });
      }
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const ratings = ["TP", "+7", "+13", "+16", "+18", "G", "PG", "PG-13", "R", "NC-17"];

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "28px", width: "100%", maxWidth: "480px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", color: "#f5c842", fontSize: "20px" }}>
            {movie ? "EDITAR PELÍCULA" : "NUEVA PELÍCULA"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "20px" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Field label="Título"><Input value={form.titulo} onChange={v => set("titulo", v)} placeholder="Nombre de la película" /></Field>
          <Field label="Descripción">
            <textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)}
              placeholder="Sinopsis breve..." rows={3}
              style={{ width: "100%", padding: "10px 12px", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", fontSize: "14px", fontFamily: "inherit", resize: "vertical" }} />
          </Field>
          <Field label="Clasificación por edad">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {ratings.map(r => (
                <button key={r} onClick={() => set("clasificacion", r)} style={{
                  padding: "4px 12px", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit",
                  background: form.clasificacion === r ? "#f5c842" : "rgba(255,255,255,0.06)",
                  color: form.clasificacion === r ? "#08080c" : "rgba(255,255,255,0.6)",
                  border: `1px solid ${form.clasificacion === r ? "#f5c842" : "rgba(255,255,255,0.1)"}`,
                  fontSize: "12px", fontWeight: 700,
                }}>{r}</button>
              ))}
            </div>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Precio Estándar (COP)"><Input value={form.precio_estandar} onChange={v => set("precio_estandar", v)} placeholder="18000" /></Field>
            <Field label="Precio VIP (COP)"><Input value={form.precio_vip} onChange={v => set("precio_vip", v)} placeholder="28000" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Asientos Estándar"><Input value={form.asientos_estandar_total} onChange={v => set("asientos_estandar_total", Number(v))} /></Field>
            <Field label="Asientos VIP"><Input value={form.asientos_vip_total} onChange={v => set("asientos_vip_total", Number(v))} /></Field>
          </div>
          <Field label="Horario de función">
            <input type="datetime-local" value={form.horario} onChange={e => set("horario", e.target.value)}
              style={{ width: "100%", padding: "10px 12px", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", fontSize: "14px", fontFamily: "inherit" }} />
          </Field>
        </div>

        {error && <div style={{ marginTop: "12px", color: "#ff8080", fontSize: "13px" }}>{error}</div>}

        <button onClick={submit} disabled={loading} style={{
          marginTop: "20px", width: "100%", padding: "12px",
          background: "#f5c842", color: "#08080c", border: "none",
          borderRadius: "8px", fontWeight: 700, cursor: "pointer",
          fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.1em",
        }}>
          {loading ? "GUARDANDO..." : movie ? "GUARDAR CAMBIOS" : "CREAR PELÍCULA"}
        </button>
      </div>
    </Overlay>
  );
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px", overflowY: "auto",
      }}
    >
      <div style={{
        background: "#0f0f17", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "16px", width: "100%", maxHeight: "90vh", overflowY: "auto",
      }}>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ msg, onRetry }) {
  return (
    <div style={{ padding: "16px", background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: "10px", color: "#ff8080", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>{msg}</span>
      {onRetry && <button onClick={onRetry} style={{ background: "rgba(220,50,50,0.2)", border: "1px solid rgba(220,50,50,0.4)", color: "#ff8080", borderRadius: "6px", padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>Reintentar</button>}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px", color: "rgba(255,255,255,0.3)" }}>
      Cargando...
    </div>
  );
}

// ─── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("catalog");
  const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem("admin_token"));
  const [buyMovie, setBuyMovie] = useState(null);
  const [invoice, setInvoice] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAdmin(false);
    setPage("catalog");
  };

  const handlePurchaseSuccess = (inv) => {
    setBuyMovie(null);
    setInvoice(inv);
    setPage("invoice");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#08080c", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      <Nav page={page} setPage={setPage} isAdmin={isAdmin} onLogout={handleLogout} />

      {page === "catalog" && <CatalogPage onBuy={m => setBuyMovie(m)} />}
      {page === "invoice" && invoice && <InvoicePage invoice={invoice} onBack={() => setPage("catalog")} />}
      {page === "login" && !isAdmin && <LoginPage onLogin={() => { setIsAdmin(true); setPage("admin"); }} />}
      {page === "admin" && isAdmin && <AdminPanel />}

      {buyMovie && (
        <PurchaseModal
          movie={buyMovie}
          onClose={() => setBuyMovie(null)}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  );
}
