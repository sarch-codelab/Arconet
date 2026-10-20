import LoginExperience from "./login-experience";

export const metadata = {
  title: "Iniciar sesión",
  description:
    "Accede a tu cuenta de Arconet para gestionar proyectos de fibra óptica, CATV y telecomunicaciones.",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return <LoginExperience />;
}
