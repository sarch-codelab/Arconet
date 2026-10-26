// Servicio de correo transaccional. Usa nodemailer contra cualquier relé SMTP
// (Google Workspace, Microsoft 365, cPanel, Resend SMTP, etc.). Variables:
//   SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS, EMAIL_FROM
// Sin SMTP configurado opera en "modo consola": el correo se registra en
// console.log y en la bitácora (Log) para desarrollo y pruebas.

import nodemailer from "nodemailer";
import { writeLog } from "./logs";

export function emailConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;
function getTransporter() {
  if (!emailConfigurado()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export function fromAddress() {
  return process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@arconet.hn";
}

/**
 * Envía un correo. Devuelve { enviado, modo }.
 * En modo consola guarda el contenido en la bitácora para poder revisarlo
 * desde el panel (categoria "sistema", nivel "warn").
 */
export async function sendEmail({ to, subject, text, html = null, tag = "transaccional" }) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`\n[email:modo-consola → ${to}] ${subject}\n${text}\n`);
    await writeLog("sistema", `Correo (modo consola) a ${to}: ${subject}`, {
      nivel: "warn",
      detalle: { tag, to, subject, cuerpo: text.slice(0, 2000) },
    });
    return { enviado: false, modo: "consola" };
  }
  try {
    await transport.sendMail({ from: fromAddress(), to, subject, text, html: html || undefined });
    return { enviado: true, modo: "smtp" };
  } catch (error) {
    console.error("sendEmail", error?.message);
    await writeLog("sistema", `Fallo de correo SMTP a ${to}: ${error?.message}`, {
      nivel: "error",
      detalle: { tag, to, subject },
    });
    throw error;
  }
}

// ── Plantillas ──────────────────────────────────────────────────────────────

const BASE = `
<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px 22px;color:#111827">
  <div style="font-size:13px;letter-spacing:.12em;color:#1544b5;font-weight:700;margin-bottom:18px">ARCONET · HONDURAS</div>
  {{contenido}}
  <p style="margin-top:26px;font-size:11.5px;color:#6b7280">Si no solicitaste este mensaje, ignóralo. Arconet, S.A. · San Pedro Sula, Cortés.</p>
</div>`;

function wrap(inner) {
  return BASE.replace("{{contenido}}", inner);
}

export function emailVerificacion({ nombre, codigo }) {
  return {
    subject: `Verifica tu correo en Arconet (${codigo})`,
    text: `Hola ${nombre},\n\nTu código de verificación es: ${codigo}\n\nVence en 24 horas. Si no creaste esta cuenta, ignora este mensaje.`,
    html: wrap(
      `<p>Hola <strong>${nombre}</strong>,</p>
       <p>Verifica tu correo con este código:</p>
       <p style="font-size:26px;letter-spacing:.18em;font-weight:700;margin:22px 0">${codigo}</p>
       <p style="font-size:13px;color:#6b7280">Vence en 24 horas. Si no creaste esta cuenta, ignora este mensaje.</p>`
    ),
  };
}

export function emailRecuperacion({ nombre, codigo }) {
  return {
    subject: `Recupera tu contraseña de Arconet (${codigo})`,
    text: `Hola ${nombre},\n\nTu código para restablecer la contraseña es: ${codigo}\n\nVence en 30 minutos. Si no lo solicitaste, ignora este mensaje.`,
    html: wrap(
      `<p>Hola <strong>${nombre}</strong>,</p>
       <p>Usa este código para restablecer tu contraseña:</p>
       <p style="font-size:26px;letter-spacing:.18em;font-weight:700;margin:22px 0">${codigo}</p>
       <p style="font-size:13px;color:#6b7280">Vence en 30 minutos. Si no lo solicitaste, ignora este mensaje.</p>`
    ),
  };
}

export function emailCuentaAprobada({ nombre }) {
  return {
    subject: "Tu cuenta en Arconet fue aprobada",
    text: `Hola ${nombre},\n\nTu cuenta fue aprobada. Ya puedes iniciar sesión en el portal de clientes.`,
    html: wrap(
      `<p>Hola <strong>${nombre}</strong>,</p>
       <p>Tu cuenta fue <strong>aprobada</strong>. Ya puedes iniciar sesión en el portal de clientes.</p>
       <p><a href="${process.env.APP_ORIGIN || ""}/login" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#1544b5;color:#fff;text-decoration:none">Iniciar sesión</a></p>`
    ),
  };
}

export function emailCuentaRechazada({ nombre, motivo }) {
  return {
    subject: "Tu solicitud de cuenta en Arconet",
    text: `Hola ${nombre},\n\nTu solicitud de cuenta no fue aprobada.${motivo ? `\nMotivo: ${motivo}` : ""}\n\nSi crees que es un error, responde a este correo.`,
    html: wrap(
      `<p>Hola <strong>${nombre}</strong>,</p>
       <p>Tu solicitud de cuenta <strong>no fue aprobada</strong>.</p>
       ${motivo ? `<p style="font-size:13px;color:#6b7280">Motivo: ${motivo}</p>` : ""}
       <p style="font-size:13px;color:#6b7280">Si crees que es un error, contáctanos en contacto@arconet.hn.</p>`
    ),
  };
}

export function emailIncidente({ titulo, detalle, severidad }) {
  return {
    subject: `[INCIDENTE ${severidad}] ${titulo}`,
    text: `Incidente: ${titulo}\n\nSeveridad: ${severidad}\n\n${detalle}\n\n${new Date().toISOString()}`,
    html: wrap(
      `<p style="font-size:12px;font-weight:700;color:#b91c1c">INCIDENTE ${severidad}</p>
       <h2 style="margin:6px 0 12px">${titulo}</h2>
       <pre style="white-space:pre-wrap;background:#f3f4f6;padding:14px;border-radius:8px;font-size:12px">${detalle}</pre>`
    ),
  };
}
