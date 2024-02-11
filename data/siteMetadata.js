/** @type {import("pliny/config").PlinyConfig } */
const siteMetadata = {
  title: "wdestin's blog",
  author: 'Wid-Gaël Destin',
  headerTitle: 'wdestin',
  description: 'Discover my creative journey and portfolio, blending technology and passion.',
  language: 'en-us',
  theme: 'system', // system, dark or light
  siteUrl: 'https://www.wdestin.xyz',
  siteRepo: 'https://github.com/wdestin/wdestin.xyz',
  siteLogo: '/static/images/logo.png',
  socialBanner: '/static/images/twitter-card.png',
  email: 'hello@wdestin.xyz',
  github: 'https://github.com/wdestin',
  twitter: 'https://twitter.com/widgael',
  linkedin: 'https://www.linkedin.com/in/wdestin',
  locale: 'en-US',
  analytics: {
    umamiAnalytics: {
      umamiWebsiteId: process.env.NEXT_UMAMI_ID,
    },
  },
}

module.exports = siteMetadata
