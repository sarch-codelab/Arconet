"use client";

import { useState } from "react";

export const DEFAULT_PERSON_PHOTO = "/perfil-predeterminado.webp";

// Solo presentación: no sustituye fotos personales ni escribe el recurso en la DB.
export default function PersonPhoto({ src, alt = "", width = 40, height = 40, ...props }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const image = src && src !== failedSrc ? src : DEFAULT_PERSON_PHOTO;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} src={image} alt={alt} width={width} height={height}
      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit", display: "block" }}
      onError={() => { if (image !== DEFAULT_PERSON_PHOTO) setFailedSrc(src); }} />
  );
}
