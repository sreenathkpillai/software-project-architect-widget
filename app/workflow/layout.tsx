import { Inter } from "next/font/google";
import "../../styles/widget-theme.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ChainCatalyst Workflow",
  description: "AI-assisted development workflow management",
};

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}