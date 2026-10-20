import ClientExperience from "./cliente-experience";

export const metadata = {
  title: "Mi cuenta",
  robots: { index: false, follow: false },
};

export default function ClientPage() {
  return <ClientExperience />;
}
