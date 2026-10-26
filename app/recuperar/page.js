import RecuperarExperience from "./recuperar-experience";

export const metadata = {
  title: "Recuperar contraseña",
  description:
    "Restablece la contraseña de tu cuenta Arconet con un código de un solo uso enviado a tu correo.",
  robots: { index: false, follow: false },
};

export default function RecuperarPage() {
  return <RecuperarExperience />;
}
