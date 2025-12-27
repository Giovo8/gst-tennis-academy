import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lavora con Noi | GST Tennis Academy",
  description: "Unisciti al nostro team come coach o personale",
};

export default function LavoraConNoiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
