import ContactExperience from "./contact-experience";

export const metadata = {
  title: "Contacto",
  description:
    "Conversemos sobre tu proyecto de fibra óptica, CATV o telecomunicaciones en Honduras.",
  alternates: { canonical: "/contacto" },
  openGraph: {
    type: "website",
    title: "Contacto | Arconet",
    description:
      "Conversemos sobre tu proyecto de fibra óptica, CATV o telecomunicaciones en Honduras.",
    url: "/contacto",
    images: [{ url: "/arconet.png", width: 2172, height: 362, alt: "Arconet" }],
  },
};

export default function ContactoPage() {
  return <ContactExperience />;
}
