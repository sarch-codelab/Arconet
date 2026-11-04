"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Topbar } from "./topbar";
import AiOrb from "../ai-orb";
import PromptBar from "@/components/ui/prompt-bar/prompt-bar";
import ThoughtLine from "@/components/ui/thought-line/thought-line";
import styles from "./ia-section.module.css";

const suggestions = ["Explorar soluciones de fibra", "Consultar el catálogo", "Conocer los servicios", "Contactar con Arconet"];

export default function IaSection({ session }) {
  const input = useRef(null);
  const transcript = useRef(null);
  const pending = useRef(null);
  const retry = useRef(null);
  const [busy, setBusy] = useState(false);
  const [thought, setThought] = useState(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  useEffect(() => () => { pending.current?.abort(); }, []);

  function reset() {
    pending.current?.abort();
    pending.current = null;
    retry.current = null;
    setBusy(false);
    setMessages([]);
    setThought(null);
    setDraft("");
    setError("");
    input.current?.focus();
  }

  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = messages.length ? transcript.current.scrollHeight : 0;
  }, [messages, busy]);

  function stop() {
    if (!pending.current) return;
    pending.current.abort();
    pending.current = null;
    if (retry.current) {
      setMessages(retry.current.messages);
      setDraft(retry.current.text);
      retry.current = null;
    }
    setThought(current => current ? { ...current, cancelled: true } : null);
    setBusy(false);
    setError("");
    requestAnimationFrame(() => input.current?.focus());
  }

  async function send(value) {
    const text = value.trim();
    if (!text || pending.current) return;
    const history = [...messages.slice(-8), { role: "user", content: text }];
    if (history.reduce((n, m) => n + m.content.length, 0) > 16000) {
      setError("La conversación es demasiado larga. Cierra y vuelve a abrir el chat para comenzar otra.");
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    retry.current = { messages: history.slice(0, -1), text };
    setBusy(true);
    setThought({ id: crypto.randomUUID(), index: history.length, failed: false });
    setError("");
    setMessages(history);
    setDraft("");
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }), signal: controller.signal,
      });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok || typeof data.message !== "string") throw new Error(data.error || "No se recibió una respuesta válida.");
      setMessages([...history, { role: "assistant", content: data.message }]);
    } catch (failure) {
      if (controller.signal.aborted) return;
      setThought(current => current ? { ...current, failed: true } : null);
      setMessages(history.slice(0, -1));
      setDraft(text);
      setError(failure.message || "No se pudo enviar el mensaje.");
    } finally {
      if (!controller.signal.aborted) { pending.current = null; retry.current = null; setBusy(false); input.current?.focus(); }
    }
  }

  const thoughtLine = thought && <ThoughtLine key={thought.id} working={busy} label="Pensando…"
    doneLabel={thought.cancelled ? "Solicitud detenida" : thought.failed ? "Solicitud finalizada sin respuesta" : "Respuesta preparada en"}
    color="var(--ia-thought-ink)" fontSize={14} collapsible={false} className={styles.thought} />;

  return <>
    <Topbar title="IA" subtitle="Monica IA, tu asistente de inteligencia artificial con NVIDIA." session={session} />
    <section className={styles.panel} data-border-glow="off" aria-labelledby="ai-chat-title">
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>ARCONET · NVIDIA</p><h2 id="ai-chat-title">Monica IA</h2></div>
        <button type="button" className={styles.close} aria-label="Nueva conversación" onClick={reset}><RotateCcw size={18} /></button>
      </header>
      <p id="ai-chat-description" className={styles.preview}><span /> Asistente con NVIDIA · Las respuestas pueden contener errores</p>
      <div ref={transcript} className={styles.messages} role="log" aria-label="Mensajes del chat" aria-live="polite" aria-relevant="additions">
        {!messages.length && <div className={styles.welcome}>
          <div className={styles.welcomeOrb}><AiOrb size={160} /></div>
          <p className={styles.orbName}>Monica IA</p>
          <p className={styles.kicker}>TU ESPACIO PARA CONECTAR</p>
          <div className={styles.suggestions}>{suggestions.map(text => <button type="button" key={text} onClick={() => { setDraft(text); input.current?.focus(); }}>{text}<span aria-hidden="true">↗</span></button>)}</div>
        </div>}
        {messages.slice(0, thought?.index ?? messages.length).map((message, index) => <div key={index} className={styles.message}><span>{message.role === "user" ? "Tú" : "Monica IA"}</span><p>{message.content}</p></div>)}
        {thoughtLine}
        {thought && messages.slice(thought.index).map((message, index) => <div key={index} className={styles.message}><span>{message.role === "user" ? "Tú" : "Monica IA"}</span><p>{message.content}</p></div>)}
      </div>
      <footer className={styles.footer}>
        {error && <p role="alert" className={styles.notice}>{error}</p>}
        <PromptBar inputRef={input} value={draft} onChange={setDraft} onSend={send} onStop={stop}
          busy={busy} className={styles.composer} />
        <p id="ai-chat-privacy" className={styles.privacy}>Los mensajes se envían a NVIDIA para responder. No incluyas datos sensibles. El historial local se borra al salir de esta sección.</p>
      </footer>
    </section>
  </>;
}
