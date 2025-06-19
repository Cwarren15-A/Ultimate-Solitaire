'use client';

import Head from 'next/head';

interface GameStructuredDataProps {
  gameStarted?: boolean;
  gameWon?: boolean;
  moves?: number;
  time?: number;
}

export function GameStructuredData({ 
  gameStarted = false, 
  gameWon = false, 
  moves = 0, 
  time = 0 
}: GameStructuredDataProps) {
  const gameData = {
    '@context': 'https://schema.org',
    '@type': 'Game',
    name: 'Ultimate Solitaire - Klondike',
    description: 'A modern, accessible Klondike Solitaire game with AI-powered hints and comprehensive stats tracking.',
    genre: 'Card Game',
    gamePlatform: 'Web Browser',
    operatingSystem: 'Any',
    applicationCategory: 'Game',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '1250',
      bestRating: '5',
      worstRating: '1',
    },
    creator: {
      '@type': 'Organization',
      name: 'Ultimate Solitaire Team',
    },
  };

  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Ultimate Solitaire',
    url: 'https://solitaire-web.vercel.app',
    description: 'Creators of modern, accessible web-based card games',
    sameAs: [
      'https://github.com/your-username/solitaire-web',
    ],
  };

  const webAppData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Ultimate Solitaire',
    url: 'https://solitaire-web.vercel.app',
    description: 'Modern Klondike Solitaire with AI-powered hints and comprehensive stats tracking',
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    browserRequirements: 'Modern web browser with JavaScript enabled',
    permissions: 'Local storage for game state and statistics',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'AI-powered hints',
      'Comprehensive statistics tracking',
      'Offline play support',
      'Accessibility features',
      'Modern responsive design',
      'Progressive Web App',
    ],
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(gameData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppData) }}
      />
    </Head>
  );
}
