"use client";

import { useState } from "react";
import { MENU_LIMITS, visibleDockMenu } from "@/lib/dock-menu";
import styles from "./dock-menu-settings.module.css";

const freshId = () => `n-${crypto.randomUUID()}`;

// Edita los mismos datos que la lista de la barra; no hay una segunda copia del menú.
export default function DropdownVisualEditor({ menu, change, canWrite, menuNumber }) {
  const [selectedId, setSelectedId] = useState("");
  const selected = menu.items.find((item) => item.id === selectedId) || menu.items.find((item) => item.groups.length) || menu.items[0];
  const index = menu.items.indexOf(selected);
  const primary = visibleDockMenu(menu).primary;
  const groupsPath = ["items", index, "groups"];
  const updateGroup = (groupIndex, update) => change([...groupsPath, groupIndex], update);
  const updateLink = (groupIndex, linkIndex, update) => change([...groupsPath, groupIndex, "links", linkIndex], update);
  const move = (path, index, step) => change(path, (entries) => {
    const target = index + step;
    if (target >= 0 && target < entries.length) [entries[index], entries[target]] = [entries[target], entries[index]];
    return entries;
  });
  const addGroup = () => change(groupsPath, (groups) => [...groups, { id: freshId(), title: "Nuevo grupo", enabled: true, links: [] }]);
  const addLink = (groupIndex) => change([...groupsPath, groupIndex, "links"], (links) => [...links, { id: freshId(), label: "Nuevo enlace", href: "/", enabled: true }]);
  const removeGroup = (groupIndex) => {
    if (window.confirm("¿Eliminar este grupo y todos sus enlaces? Guarda el menú para aplicar el cambio.")) change(groupsPath, (groups) => groups.filter((_, i) => i !== groupIndex));
  };
  const removeLink = (groupIndex, linkIndex) => {
    if (window.confirm("¿Eliminar este enlace? Guarda el menú para aplicar el cambio.")) change([...groupsPath, groupIndex, "links"], (links) => links.filter((_, i) => i !== linkIndex));
  };
  return (
    <section className={styles.visualEditor} aria-labelledby={`dropdown-editor-title-${menuNumber}`}>
      <div className={styles.visualHeader}>
        <div>
          <h4 id={`dropdown-editor-title-${menuNumber}`}>Editar desplegable visualmente</h4>
          <p className={styles.hint}>Edita directamente las tarjetas y sus enlaces. Los cambios se guardan con el botón «Guardar menú» de abajo.</p>
        </div>
        {selected && <label className={styles.visualSelect}>Desplegable de
          <select value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
            {menu.items.map((item) => <option key={item.id} value={item.id}>{item.label || "Enlace sin nombre"}{!item.enabled ? " (oculto)" : ""}</option>)}
          </select>
        </label>}
      </div>
      {!selected ? <p className={styles.hint}>Añade primero un enlace a la barra para crear su desplegable.</p> : <>
        {!selected.enabled && <p className={styles.visualWarning}>El enlace «{selected.label}» está oculto; su desplegable tampoco aparece en el sitio.</p>}
        <div className={styles.visualPanel}>
          <div className={styles.visualTop} aria-label="Accesos del desplegable (vista informativa)">
            {primary.enabled && <div className={styles.visualPrimary}>
              <strong>{primary.label}</strong>
              <small>{primary.description}</small>
            </div>}
            <span className={styles.visualAuth}>Login</span><span className={styles.visualAdmin}>Admin</span>
          </div>
          <div className={styles.visualGroups}>
            {selected.groups.map((group, gi) => <section className={`${styles.visualGroup}${group.enabled ? "" : ` ${styles.visualHidden}`}`} key={group.id} aria-label={`Grupo ${group.title || gi + 1}`}>
              <label className={styles.visualGroupTitle}>Título del grupo
                <input maxLength={80} value={group.title} disabled={!canWrite} onChange={(event) => { const value = event.target.value; updateGroup(gi, (item) => ({ ...item, title: value })); }} />
              </label>
              <label className={styles.checkbox}><input type="checkbox" checked={group.enabled} disabled={!canWrite} onChange={(event) => { const enabled = event.target.checked; updateGroup(gi, (item) => ({ ...item, enabled })); }} /> Mostrar grupo</label>
              <div className={styles.actions}>
                <button type="button" disabled={!canWrite || gi === 0} onClick={() => move(groupsPath, gi, -1)} aria-label={`Subir grupo ${group.title}`}>↑ Subir</button>
                <button type="button" disabled={!canWrite || gi === selected.groups.length - 1} onClick={() => move(groupsPath, gi, 1)} aria-label={`Bajar grupo ${group.title}`}>↓ Bajar</button>
                <button type="button" disabled={!canWrite} onClick={() => removeGroup(gi)} className={styles.remove} aria-label={`Eliminar grupo ${group.title}`}>Eliminar grupo</button>
              </div>
              {!group.links.some((link) => link.enabled) && <p className={styles.hint}>Sin enlaces visibles, este grupo no aparece en el sitio.</p>}
              <div className={styles.visualLinks}>
                {group.links.map((link, li) => <div className={`${styles.visualLink}${link.enabled ? "" : ` ${styles.visualHidden}`}`} key={link.id} role="group" aria-label={`Enlace ${link.label || li + 1}`}>
                  <div className={styles.fields}>
                    <label>Nombre del enlace<input maxLength={80} value={link.label} disabled={!canWrite} onChange={(event) => { const value = event.target.value; updateLink(gi, li, (item) => ({ ...item, label: value })); }} /></label>
                    <label>Destino<input maxLength={300} value={link.href} disabled={!canWrite} onChange={(event) => { const value = event.target.value; updateLink(gi, li, (item) => ({ ...item, href: value })); }} placeholder="/tienda o #inicio" /></label>
                  </div>
                  <label className={styles.checkbox}><input type="checkbox" checked={link.enabled} disabled={!canWrite} onChange={(event) => { const enabled = event.target.checked; updateLink(gi, li, (item) => ({ ...item, enabled })); }} /> Mostrar enlace</label>
                  <div className={styles.actions}>
                    <button type="button" disabled={!canWrite || li === 0} onClick={() => move([...groupsPath, gi, "links"], li, -1)} aria-label={`Subir enlace ${link.label}`}>↑ Subir</button>
                    <button type="button" disabled={!canWrite || li === group.links.length - 1} onClick={() => move([...groupsPath, gi, "links"], li, 1)} aria-label={`Bajar enlace ${link.label}`}>↓ Bajar</button>
                    <button type="button" disabled={!canWrite} onClick={() => removeLink(gi, li)} className={styles.remove} aria-label={`Eliminar enlace ${link.label}`}>Eliminar</button>
                  </div>
                </div>)}
              </div>
              <button type="button" className={styles.visualAdd} disabled={!canWrite || group.links.length >= MENU_LIMITS.links} onClick={() => addLink(gi)}>+ Añadir enlace al grupo</button>
            </section>)}
          </div>
          <div className={styles.visualLegal}>{menu.legal.filter((link) => link.enabled).map((link) => <span key={link.id}>{link.label}</span>)}</div>
        </div>
        <button type="button" className={styles.visualAdd} disabled={!canWrite || selected.groups.length >= MENU_LIMITS.groups} onClick={addGroup}>+ Añadir grupo desplegable</button>
        <p className={styles.hint}>Los elementos ocultos se muestran atenuados aquí para poder recuperarlos. El acceso destacado y los enlaces inferiores se editan en sus apartados; Login y Admin son fijos.</p>
      </>}
    </section>
  );
}
