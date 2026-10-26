import VerificarExperience from "./verificar-experience";

export const metadata = {
  title: "Verificar correo",
  description: "Confirma el correo de tu cuenta Arconet con un código de un solo uso.",
  robots: { index: false, follow: false },
};

export default function VerificarPage() {
  return <VerificarExperience />;
}
