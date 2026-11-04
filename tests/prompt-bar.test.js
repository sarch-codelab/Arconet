import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const component = readFileSync('components/ui/prompt-bar/prompt-bar.js', 'utf8');
const chat = readFileSync('app/admin/ia-section.js', 'utf8');
const css = readFileSync('components/ui/prompt-bar/prompt-bar.css', 'utf8');
describe('PromptBar de Monica IA', () => {
  it('usa borrador controlado para conservar sugerencias y restaurar errores', () => {
    expect(chat).toContain('value={draft} onChange={setDraft} onSend={send} onStop={stop}');
    expect(component).toContain('value={value}');
    expect(component).toContain('maxLength = 2000');
    expect(chat).toContain('setDraft(text)');
  });
  it('no envía vacíos ni duplicados y mantiene Shift+Enter y composición IME', () => {
    expect(component).toContain('if (!busy && canSend) onSend(value)');
    expect(component).toContain('!event.shiftKey && !event.nativeEvent.isComposing');
    expect(chat).toContain('if (!text || pending.current) return');
  });
  it('muta el icono y ofrece cancelar una petición real, sin borrar la conversación', () => {
    expect(component).toContain('useMotionValueEvent');
    expect(component).toContain('controls.stop()');
    expect(component).toContain("busy ? 'Detener respuesta' : 'Enviar mensaje'");
    expect(chat).toContain('pending.current.abort()');
    expect(chat).toContain('setMessages(retry.current.messages)');
    expect(chat).toContain('setDraft(retry.current.text)');
    expect(chat).toContain('Solicitud detenida');
    expect(chat).toContain('if (controller.signal.aborted) return');
  });
  it('acota el crecimiento sin animar dimensiones continuamente', () => {
    expect(component).toContain('maxRows = 5');
    expect(component).toContain('Math.min(height, max)');
    expect(css).not.toMatch(/transition:[^;]*(height|width)/);
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('focus-within');
    expect(css).toContain('focus-visible');
  });
  it('no promete adjuntos, búsqueda, dictado ni modelos que el backend no admite', () => {
    expect(component).not.toMatch(/onAttach|onDictate|Choose model|Choose effort|DEFAULT_MODELS/);
    expect(component).toContain('htmlFor="ai-chat-message"');
    expect(component).toContain('aria-describedby="ai-chat-privacy"');
  });
});
