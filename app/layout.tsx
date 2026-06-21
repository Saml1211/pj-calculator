import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Projector Calculator',
  description:
    'A planning tool for live event technicians to design multi-projector setups on various surface geometries.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
