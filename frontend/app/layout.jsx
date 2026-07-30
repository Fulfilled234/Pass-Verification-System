import './globals.css';

export const metadata = {
  title: 'Pass & Verification System',
  description: 'Issue and verify entry passes.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
