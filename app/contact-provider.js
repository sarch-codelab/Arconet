"use client";

import { createContext, createElement, useContext } from "react";

const ContactContext = createContext(null);

// El snapshot llega serializado desde RootLayout. No volver a leer variables
// de entorno en el navegador: sus valores se fijan al compilar y pueden ser
// distintos a los usados para producir el HTML de esta petición.
export function ContactProvider({ contact, children }) {
  return createElement(ContactContext.Provider, { value: contact }, children);
}

export function useContact() {
  const contact = useContext(ContactContext);
  if (!contact) throw new Error("useContact debe usarse dentro de <ContactProvider>.");
  return contact;
}
