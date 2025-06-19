import { DefaultSeoProps } from 'next-seo';

const config: DefaultSeoProps = {
  title: 'Ultimate Solitaire - Modern Klondike Card Game',
  titleTemplate: '%s | Ultimate Solitaire',
  description: 'Play the ultimate Klondike Solitaire experience with AI-powered hints, beautiful graphics, and comprehensive stats tracking. Free, accessible, and works offline.',
  canonical: 'https://solitaire-web.vercel.app',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://solitaire-web.vercel.app',
    siteName: 'Ultimate Solitaire',
    title: 'Ultimate Solitaire - Modern Klondike Card Game',
    description: 'Play the ultimate Klondike Solitaire experience with AI-powered hints, beautiful graphics, and comprehensive stats tracking. Free, accessible, and works offline.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Ultimate Solitaire Game',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    handle: '@ultimatesolitaire',
    site: '@ultimatesolitaire',
    cardType: 'summary_large_image',
  },
  additionalMetaTags: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1, viewport-fit=cover',
    },
    {
      name: 'apple-mobile-web-app-capable',
      content: 'yes',
    },
    {
      name: 'apple-mobile-web-app-status-bar-style',
      content: 'default',
    },
    {
      name: 'apple-mobile-web-app-title',
      content: 'Ultimate Solitaire',
    },
    {
      name: 'mobile-web-app-capable',
      content: 'yes',
    },
    {
      name: 'msapplication-TileColor',
      content: '#059669',
    },
    {
      name: 'theme-color',
      content: '#059669',
    },
    {
      name: 'keywords',
      content: 'solitaire, klondike, card game, browser game, AI hints, offline game, free solitaire, card games online, patience game',
    },
    {
      name: 'author',
      content: 'Ultimate Solitaire Team',
    },
  ],
  additionalLinkTags: [
    {
      rel: 'icon',
      href: '/favicon.ico',
    },
    {
      rel: 'apple-touch-icon',
      href: '/apple-touch-icon.png',
      sizes: '180x180',
    },
    {
      rel: 'icon',
      href: '/favicon-32x32.png',
      sizes: '32x32',
      type: 'image/png',
    },
    {
      rel: 'icon',
      href: '/favicon-16x16.png',
      sizes: '16x16',
      type: 'image/png',
    },
    {
      rel: 'manifest',
      href: '/manifest.json',
    },
  ],
};

export default config;
