import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = path => readFileSync(`app/admin/${path}`, 'utf8');
describe('Sheet únicamente en edición administrativa', () => {
  it.each(['categorias','clientes','sucursales','workers','products','roles','cotizaciones'])('%s diferencia editar de crear', name => {
    const source = read(`${name}-section.js`);
    expect(source).toContain('<EditDialog open={modalOpen} editing={Boolean(editingId)}');
    expect(source).not.toContain('{modalOpen &&');
    expect(source).toContain('setModalOpen(false)');
  });
  it('conserva contenido durante salida y delega foco y scroll de la hoja a React Aria', () => {
    const source = read('edit-dialog.js');
    expect(source).toContain('const [snapshot, setSnapshot]');
    expect(source).toContain('const child = open && editing ? children : snapshot');
    expect(source).toContain('open && !editing && present');
    expect(source).toContain('inline ? children : <DialogBackdrop');
    expect(source).toContain('Boolean(open && editing && present)');
    expect(source).toContain("'aria-modal': undefined");
    expect(source).toContain('clearTimeout(timer)');
  });
  it('altas y consultas no activan edición en compras y precios', () => {
    expect(read('purchase-editor.js')).toContain('editing={Boolean(initial?.id)}');
    expect(read('precios-panel.js')).toContain('open={Boolean(selected)} editing={canWrite}');
    expect(read('compras-panel.js')).toContain('<AnimatePresence>{editing');
    expect(read('proveedores-panel.js')).toContain('editing={Boolean(editing.id)} inline');
  });
  it('cubre las ediciones antes embebidas de perfil y áreas', () => {
    expect(read('perfil-section.js')).toContain('inline editing={editMode} label="Editar perfil"');
    expect(read('solicitudes-panel.js')).toContain('inline editing={Boolean(editingArea)} label="Editar área"');
  });
  it('desactiva los hooks clásicos solo para edición para no cerrar dos veces', () => {
    expect(read('edit-dialog.js')).toContain('useEscapeKey(classicOpen');
    expect(read('edit-dialog.js')).toContain('useBodyScrollLock(classicOpen)');
    for (const name of ['clientes','sucursales','workers','products','roles','cotizaciones']) {
      expect(read(`${name}-section.js`)).not.toContain('useEscapeKey(');
      expect(read(`${name}-section.js`)).not.toContain('useBodyScrollLock(');
    }
  });
});
