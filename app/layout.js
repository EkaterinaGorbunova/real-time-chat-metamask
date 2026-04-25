import '../styles/globals.css';

// Inline script that runs before render to apply the persisted theme and
// avoid a light-on-load flash for users whose preference is dark. Identical
// behaviour to the previous pages/_document.js implementation; lives directly
// in <head> so the .dark class is on <html> for the very first paint.
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'dark');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export const metadata = {
  title: 'Chat',
  description: 'real-time Chat with Metamask',
  icons: { icon: '/favicon.ico' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
