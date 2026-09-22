import type { Metadata } from 'next';
import '../index.css';

export const metadata: Metadata = {
  title: 'Chainling Forensic Specimen',
  description: 'On-chain forensic biological specimen & forensic visualization engine with immutable Nansen audit ledger and Web Audio vitals synthesis.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#07090e] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
