import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = path => readFileSync(path, 'utf8');
const source = read('app/admin/categorias-section.js');
const css = read('app/admin/edit-sheet.module.css');
const wrapper = read('app/admin/edit-dialog.js');
describe('Sheet de categorías con Animate UI y React Aria', () => {
  it('usa los primitivos reales y conserva montado el controlador durante la salida', () => {
    expect(source).toContain('editing={Boolean(editingId)}');
    expect(source).toContain('<EditDialog open={modalOpen}');
    expect(wrapper).toContain('from "@animate-ui/react/primitives/react-aria"');
    expect(wrapper).toContain('<ModalOverlay isOpen=');
    expect(wrapper).toContain('<Modal data-side="right"');
    expect(source).not.toContain('{modalOpen &&');
  });
  it('mantiene diálogo accesible, acciones de cierre y foco', () => {
    expect(wrapper).toContain('<Dialog className={sheet.dialog} aria-label=');
    expect(source).toContain('aria-label="Cerrar"');
    expect(wrapper).toContain('onOpenChange={value => { if (!value) onDismiss?.(); }}');
    expect(css).toContain('focus-visible');
  });
  it('conserva el borrador y el título mientras cierra, hasta la siguiente apertura', () => {
    expect(source).toMatch(/function closeModal\(\) \{\s*setModalOpen\(false\);\s*\}/);
    expect(source).toContain('setDraft({ ...EMPTY_CATEGORY })');
    expect(source).toContain('setEditingId(category.id)');
  });
  it('mantiene permisos, imagen, validación y persistencia de categorías', () => {
    expect(source).toContain('disabled={!canWrite}');
    expect(source).toContain('disabled={!canDelete}');
    expect(source).toContain('onChange={handlePhoto}');
    expect(source).toContain('onSubmit={submitCategory}');
    expect(source).toContain('slug: editingId ? draft.slug : categorySlug(nombre)');
    expect(source).toContain('await createCategoria(payload)');
    expect(source).toContain('await updateCategoria(editingId, payload)');
    expect(source).toContain('await deleteCategoria(confirmCategory.id)');
  });
  it('acota la hoja al viewport y mantiene scroll interno y tokens al usar portal', () => {
    expect(css).toContain('width: min(600px, 100%)');
    expect(css).toContain('height: 100dvh');
    expect(css).toContain('overflow-y: auto');
    expect(css).toContain('overscroll-behavior: contain');
    expect(css).toContain('--bg-card: var(--surface');
    expect(css).toContain('safe-area-inset-bottom');
    expect(css).not.toMatch(/transition:.*(?:height|width)/);
  });
});
