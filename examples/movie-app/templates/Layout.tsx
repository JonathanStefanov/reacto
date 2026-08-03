/**
 * Templates — Reusable layout components
 *
 * Like Django's templates/. Contains the base layout
 * that wraps all pages.
 */
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title || '🎬 CineLog'}</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <header className="header">
          <h1 className="logo">🎬 <span className="accent">Cine</span>Log</h1>
          <nav className="header-nav" id="nav">
            {/* Client JS injects auth-aware navigation */}
          </nav>
        </header>
        <main>{children}</main>
        <script type="module" src="/client.js"></script>
      </body>
    </html>
  );
}
