"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Calendar, Camera, Lock, LogIn, Pencil, Phone, RotateCw, Save, ShieldCheck, User, Users, X } from "lucide-react";
import styles from "./admin-experience.module.css";
import { useToast } from "./admin-ui";
import { compressImage } from "./image-utils";
import { branchLabel, formatDate, initials, statusLabel } from "./workers-store";
import { Topbar, SectionTabs } from "./topbar";
import { SECTION_NAV_CONFIG } from "./admin-nav";

export default function MiPerfilSection({ session, workers = [] }) {
  const [activeTab, setActiveTab] = useState("all");
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [profileError, setProfileError] = useState("");
  const [twoFactorFlow, setTwoFactorFlow] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const myWorker = useMemo(() => {
    if (profile?.trabajador) return profile.trabajador;
    if (!session?.correo) return null;
    return workers.find((w) => w.correo?.toLowerCase() === session.correo.toLowerCase()) || null;
  }, [profile, workers, session?.correo]);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/perfil", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el perfil.");
      setProfile(data);
      setActivity(Array.isArray(data.activity) ? data.activity : []);
      setFormData({ nombre: data.nombre || "", correo: data.correo || "", telefono: data.trabajador?.telefono || "" });
      setProfileError("");
    } catch (error) {
      setProfileError(error.message);
    }
  }, []);
  useEffect(() => { refreshProfile(); }, [refreshProfile]);
  const refreshSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const response = await fetch("/api/perfil/sesiones", { cache: "no-store" });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar las sesiones.");
      setSessions(Array.isArray(data) ? data : []);
      setSessionsError("");
    } catch (error) { setSessionsError(error.message); }
    finally { setSessionsLoading(false); }
  }, []);
  useEffect(() => { if (activeTab === "security") refreshSessions(); }, [activeTab, refreshSessions]);

  const [formData, setFormData] = useState({
    nombre: session?.nombre || "",
    correo: session?.correo || "",
    telefono: myWorker?.telefono || "",
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [securityModals, setSecurityModals] = useState({ password: false });
  const [passwordForm, setPasswordForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const { show } = useToast();

  const userStats = profile?.stats || { completedOrders: 0, daysOnPlatform: 0, loginsThisMonth: 0 };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      show("El archivo debe ser una imagen.", "error");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      show("La imagen original no debe superar 8 MB.", "error");
      return;
    }
    try {
      const compressed = await compressImage(file, { maxDimension: 384, quality: 0.72 });
      if (compressed.length > 280000) throw new Error("La imagen sigue siendo demasiado grande. Elige una imagen más pequeña.");
      setPhotoPreview(compressed);
    } catch (error) {
      show(error.message || "No se pudo procesar la imagen.", "error");
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/perfil", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: formData.nombre, telefono: formData.telefono, ...(photoPreview ? { foto: photoPreview } : {}) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el perfil.");
      setEditMode(false);
      setPhotoPreview(null);
      await refreshProfile();
      // La cabecera (avatar) escucha este evento y recarga la foto guardada.
      window.dispatchEvent(new Event("arconet:profile-updated"));
      show("Perfil actualizado correctamente.");
    } catch (error) {
      show(error.message || "No se pudo guardar el perfil.", "error");
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    setFormData({
      nombre: profile?.nombre || session?.nombre || "",
      correo: profile?.correo || session?.correo || "",
      telefono: myWorker?.telefono || "",
    });
    setPhotoPreview(null);
    setEditMode(false);
  };

  const openSecurityModal = (type) => setSecurityModals((prev) => ({ ...prev, [type]: true }));
  const closeSecurityModal = (type) => setSecurityModals((prev) => ({ ...prev, [type]: false }));

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    if (passwordForm.nueva !== passwordForm.confirmar) {
      show("Las contraseñas no coinciden.", "error");
      return;
    }
    if (passwordForm.nueva.length < 12) {
      show("La contraseña debe tener al menos 12 caracteres.", "error");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/perfil/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(passwordForm) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar la contraseña.");
      setPasswordForm({ actual: "", nueva: "", confirmar: "" });
      closeSecurityModal("password");
      show("Contraseña actualizada correctamente.");
    } catch (error) {
      show(error.message || "No se pudo actualizar la contraseña.", "error");
    } finally { setSaving(false); }
  };

  const startTwoFactorSetup = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/perfil/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setup" }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo iniciar la configuración.");
      setTwoFactorFlow({ mode: "setup", secret: data.secret, uri: data.uri, codigo: "", password: "" });
    } catch (error) { show(error.message, "error"); }
    finally { setSaving(false); }
  };

  const submitTwoFactor = async (event) => {
    event.preventDefault();
    if (!twoFactorFlow || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/perfil/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: twoFactorFlow.mode === "setup" ? "enable" : "disable", codigo: twoFactorFlow.codigo, ...(twoFactorFlow.mode === "disable" ? { password: twoFactorFlow.password } : {}) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar la autenticación.");
      setTwoFactorFlow(null);
      await refreshProfile();
      show(data.enabled ? "Autenticación en dos pasos activada." : "Autenticación en dos pasos desactivada.");
    } catch (error) { show(error.message, "error"); }
    finally { setSaving(false); }
  };

  const revokeSession = async (sessionId) => {
    try {
      const response = await fetch("/api/perfil/sesiones", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo cerrar la sesión.");
      setSessions((current) => current.filter((item) => item.sessionId !== sessionId));
      show("Sesión cerrada.");
    } catch (error) { show(error.message, "error"); }
  };

  const revokeOtherSessions = async () => {
    try {
      const response = await fetch("/api/perfil/sesiones", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allOther: true }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudieron cerrar las sesiones.");
      setSessions((current) => current.filter((item) => item.current));
      show(`${data.revoked || 0} sesiones cerradas.`);
    } catch (error) { show(error.message, "error"); }
  };

  return (
    <>
      <Topbar
        title="Mi perfil"
        subtitle="Información personal y configuración de mi cuenta."
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <SectionTabs
          tabs={SECTION_NAV_CONFIG["mi-perfil"]?.tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          label="Secciones de mi perfil"
        />

        {activeTab === "all" && (
          <section className={styles.card} aria-label="Perfil de usuario">
            <header className={styles.cardHeader}>
              <h3><User size={18} /> Perfil</h3>
              {!editMode && (
                <button type="button" className={styles.ghostBtn} onClick={() => setEditMode(true)}>
                  <Pencil size={14} /> Editar
                </button>
              )}
            </header>

            <form className={styles.profileForm} onSubmit={handleSave}>
              <div className={styles.profileCard}>
                <div className={styles.profileAvatarLarge}>
                  {photoPreview ? (
                    <img src={photoPreview} alt={formData.nombre || "Usuario"} width={120} height={120} />
                  ) : myWorker?.foto ? (
                    <img src={myWorker.foto} alt={session?.nombre || "Usuario"} width={120} height={120} />
                  ) : (
                    <span className={styles.avatarFallback}>{initials(formData.nombre || session?.nombre)}</span>
                  )}
                  {editMode && (
                    <label className={styles.avatarUpload}>
                      <Camera size={18} />
                      <input type="file" accept="image/*" onChange={handlePhotoChange} />
                    </label>
                  )}
                </div>
                <div className={styles.profileInfo}>
                  {editMode ? (
                    <div className={styles.editGrid}>
                      <label className={styles.editField}>
                        <span>Nombre completo</span>
                        <input
                          type="text"
                          value={formData.nombre}
                          onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                          required
                        />
                      </label>
                      <label className={styles.editField}>
                        <span>Correo electrónico</span>
                        <input
                          type="email"
                          value={formData.correo}
                          readOnly
                        />
                      </label>
                      <label className={styles.editField}>
                        <span>Teléfono</span>
                        <input
                          type="tel"
                          value={formData.telefono}
                          onChange={(e) => setFormData((prev) => ({ ...prev, telefono: e.target.value }))}
                          placeholder="+504 XXXX-XXXX"
                        />
                      </label>
                    </div>
                  ) : (
                    <>
                      <h4>{profile?.nombre || session?.nombre || "Usuario"}</h4>
                      <p className={styles.profileRole}>
                        <span className={styles.badge}>
                          {profile?.rolNombre || session?.rolNombre || session?.rol || "Usuario"}
                        </span>
                        {myWorker?.sucursal ? (
                          <span className={styles.badge}>{branchLabel(myWorker.sucursal)}</span>
                        ) : session?.sucursal ? (
                          <span className={styles.badge}>{branchLabel(session.sucursal)}</span>
                        ) : null}
                      </p>
                      <p className={styles.profileEmail}>{profile?.correo || session?.correo}</p>
                      {myWorker?.telefono && <p className={styles.profileMeta}><Phone size={14} /> {myWorker.telefono}</p>}
                      {profileError && <p className={styles.dangerText} role="alert">{profileError} <button type="button" className={styles.clearBtn} onClick={refreshProfile}>Reintentar</button></p>}
                    </>
                  )}
                </div>
              </div>

              {editMode && (
                <footer className={styles.modalActions}>
                  <button type="button" className={styles.ghostBtn} onClick={handleCancel}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.submit} disabled={saving}>
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </footer>
              )}

              {!editMode && (
                <>
                  <div className={styles.statsGrid}>
                    <div className={styles.profileStatCard}>
                      <div className={styles.profileStatIcon}>
                        <Activity size={20} />
                      </div>
                      <div className={styles.statContent}>
                        <span className={styles.profileStatValue}>{userStats.completedOrders}</span>
                        <span className={styles.profileStatLabel}>Órdenes completadas</span>
                      </div>
                    </div>
                    <div className={styles.profileStatCard}>
                      <div className={styles.profileStatIcon}>
                        <Calendar size={20} />
                      </div>
                      <div className={styles.statContent}>
                        <span className={styles.profileStatValue}>{userStats.daysOnPlatform}</span>
                        <span className={styles.profileStatLabel}>Días en la plataforma</span>
                      </div>
                    </div>
                    <div className={styles.profileStatCard}>
                      <div className={styles.profileStatIcon}>
                        <LogIn size={20} />
                      </div>
                      <div className={styles.statContent}>
                        <span className={styles.profileStatValue}>{userStats.loginsThisMonth}</span>
                        <span className={styles.profileStatLabel}>Sesiones este mes</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailGrid}>
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Rol</span>
                      <span className={styles.detailValue}>
                        {session?.rolNombre || "Usuario"}
                      </span>
                    </div>
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Sucursal</span>
                      <span className={styles.detailValue}>
                        {myWorker?.sucursal ? branchLabel(myWorker.sucursal) : (session?.sucursal ? branchLabel(session.sucursal) : "Matriz")}
                      </span>
                    </div>
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Estado</span>
                      <span className={styles.detailValue}>
                        {myWorker?.estado ? (
                          <span className={`${styles.pill} ${styles[`status_${myWorker.estado}`]}`}>
                            {statusLabel(myWorker.estado)}
                          </span>
                        ) : (
                          <> <span className={styles.statusDotActive} /> Activo </>
                        )}
                      </span>
                    </div>
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Fecha de ingreso</span>
                      <span className={styles.detailValue}>
                        {myWorker?.ingreso ? formatDate(myWorker.ingreso) : "—"}
                      </span>
                    </div>
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Último acceso</span>
                      <span className={styles.detailValue}>
                        {(() => { const lastLogin = activity.find((entry) => entry.category === "auth" && entry.message.startsWith("Inicio de sesión")); return lastLogin ? new Date(lastLogin.createdAt).toLocaleString("es-HN") : "—"; })()}
                      </span>
                    </div>
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>ID de usuario</span>
                      <span className={styles.detailValue} style={{fontFamily:"monospace",fontSize:"12px"}}>{myWorker?.id || session?.id || "—"}</span>
                    </div>
                  </div>
                </>
              )}
            </form>
          </section>
        )}

        {activeTab === "activity" && (
          <section className={styles.card} aria-label="Mi actividad">
            <header className={styles.cardHeader}>
              <h3><Activity size={18} /> Actividad reciente</h3>
            </header>
            <div className={styles.activityList}>
              {profileError ? <p className={styles.activityNote}>{profileError}</p> : activity.length ? activity.map((entry) => <article className={styles.activityItem} key={entry.id}><div className={styles.activityIcon}><Activity size={16} /></div><div className={styles.activityContent}><p>{entry.message}</p><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString("es-HN", { dateStyle: "medium", timeStyle: "short" })}</time>{entry.route && <small>{entry.route}</small>}</div><span className={styles.activityBadge}>{entry.category}</span></article>) : <p className={styles.activityNote}>No hay actividad registrada para esta cuenta.</p>}
            </div>
          </section>
        )}

        {activeTab === "security" && (
          <section className={styles.card} aria-label="Seguridad de mi cuenta">
            <header className={styles.cardHeader}>
              <h3><ShieldCheck size={18} /> Seguridad</h3>
            </header>
            <div className={styles.securityGrid}>
              <div className={styles.securityCard}>
                <h4><Lock size={16} /> Contraseña</h4>
                <p>Cambia tu contraseña para mantener tu cuenta segura.</p>
                <button type="button" className={styles.ghostBtn} onClick={() => openSecurityModal("password")}>
                  <RotateCw size={14} /> Cambiar contraseña
                </button>
              </div>
              <div className={styles.securityCard}>
                <h4><ShieldCheck size={16} /> Autenticación de dos factores (2FA)</h4>
                <p>{profile?.twoFactorEnabled ? "Tu cuenta solicita un código de autenticación además de la contraseña al iniciar sesión." : "Protege tu cuenta con un código temporal de una aplicación de autenticación."}</p>
                <button type="button" className={profile?.twoFactorEnabled ? styles.dangerBtn : styles.ghostBtn} disabled={saving} onClick={profile?.twoFactorEnabled ? () => setTwoFactorFlow({ mode: "disable", secret: "", uri: "", codigo: "", password: "" }) : startTwoFactorSetup}>
                  <ShieldCheck size={14} /> {profile?.twoFactorEnabled ? "Desactivar verificación en dos pasos" : "Configurar verificación en dos pasos"}
                </button>
              </div>
              <div className={styles.securityCard}>
                <h4><Users size={16} /> Sesiones activas</h4>
                <p>Revisa los accesos vigentes de tu cuenta y cierra los que no reconozcas.</p>
                {sessionsError ? <p className={styles.dangerText} role="alert">{sessionsError} <button type="button" className={styles.clearBtn} onClick={refreshSessions}>Reintentar</button></p> : sessionsLoading ? <p>Cargando sesiones…</p> : <div className={styles.sessionList}>{sessions.map((item) => <article className={styles.sessionItem} key={item.id}><div className={styles.sessionInfo}><strong>{item.current ? "Esta sesión" : item.userAgent || "Dispositivo sin información"}</strong><span>{new Date(item.createdAt).toLocaleString("es-HN", { dateStyle: "medium", timeStyle: "short" })} · {item.current ? "Activa ahora" : "Sesión activa"}</span></div>{item.current ? <span className={styles.badge}>Actual</span> : <button type="button" className={styles.ghostBtn} onClick={() => revokeSession(item.sessionId)}>Cerrar</button>}</article>)}{!sessions.length && <p>No hay sesiones activas registradas.</p>}</div>}
                {sessions.filter((item) => !item.current).length > 0 && <button type="button" className={styles.dangerBtn} onClick={revokeOtherSessions}>Cerrar las demás sesiones</button>}
              </div>
            </div>
          </section>
        )}

        {/* Modales de seguridad */}
        {securityModals.password && (
          <div className={styles.overlay} onClick={() => closeSecurityModal("password")} role="presentation">
            <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Cambiar contraseña" onClick={(e) => e.stopPropagation()}>
              <h3><Lock size={20} /> Cambiar contraseña</h3>
              <form onSubmit={handlePasswordSave}>
                <div className={styles.modalField}>
                  <label>Contraseña actual</label>
                  <input type="password" value={passwordForm.actual} onChange={(e) => setPasswordForm((p) => ({ ...p, actual: e.target.value }))} required />
                </div>
                <div className={styles.modalField}>
                  <label>Nueva contraseña</label>
                  <input type="password" value={passwordForm.nueva} onChange={(e) => setPasswordForm((p) => ({ ...p, nueva: e.target.value }))} required minLength={12} />
                </div>
                <div className={styles.modalField}>
                  <label>Confirmar nueva contraseña</label>
                  <input type="password" value={passwordForm.confirmar} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmar: e.target.value }))} required />
                </div>
                <footer className={styles.modalActions}>
                  <button type="button" className={styles.ghostBtn} onClick={() => closeSecurityModal("password")}>Cancelar</button>
                  <button type="submit" className={styles.submit} disabled={saving}>{saving ? "Guardando..." : "Actualizar"}</button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {twoFactorFlow && (
          <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTwoFactorFlow(null); }}>
            <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Verificación en dos pasos">
              <h3><ShieldCheck size={20} /> {twoFactorFlow.mode === "setup" ? "Configurar verificación en dos pasos" : "Desactivar verificación en dos pasos"}</h3>
              {twoFactorFlow.mode === "setup" ? <div className={styles.twofaSetup}><p>Agrega esta clave manualmente en tu aplicación de autenticación. La clave se guarda cifrada.</p><code className={styles.totpSecret}>{twoFactorFlow.secret}</code><a className={styles.clearBtn} href={twoFactorFlow.uri}>Abrir en una aplicación compatible</a><p className={styles.twofaNote}>Ingresa el código actual para confirmar la configuración.</p></div> : <div className={styles.modalField}><label>Contraseña actual</label><input type="password" autoComplete="current-password" value={twoFactorFlow.password} onChange={(event) => setTwoFactorFlow((current) => ({ ...current, password: event.target.value }))} required /></div>}
              <form onSubmit={submitTwoFactor}>
                <div className={styles.modalField}><label>Código de autenticación</label><input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={twoFactorFlow.codigo} onChange={(event) => setTwoFactorFlow((current) => ({ ...current, codigo: event.target.value.replace(/\D/g, "").slice(0, 6) }))} required /></div>
                <footer className={styles.modalActions}><button type="button" className={styles.ghostBtn} onClick={() => setTwoFactorFlow(null)}>Cancelar</button><button type="submit" className={styles.submit} disabled={saving}>{saving ? "Verificando…" : twoFactorFlow.mode === "setup" ? "Activar" : "Desactivar"}</button></footer>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
