import ContactExperience from "./contact-experience";

export const metadata = {
  title: "Contacto",
  description:
    "Conversemos sobre tu proyecto de fibra óptica, CATV o telecomunicaciones en Honduras.",
  alternates: { canonical: "/contacto" },
  openGraph: {
    title: "Contacto | Arconet",
    description:
      "Conversemos sobre tu proyecto de fibra óptica, CATV o telecomunicaciones en Honduras.",
    url: "/contacto",
  },
};

export default function ContactoPage() {
  return <ContactExperience />;
}
