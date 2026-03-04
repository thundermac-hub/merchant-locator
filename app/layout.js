export const metadata = {
  title: 'Merchant Locator · Slurp!',
  description: 'Next.js + MySQL sample app',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css"
        />
      </head>
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif', background: '#f5f6f8' }}>
        {children}
      </body>
    </html>
  );
}
