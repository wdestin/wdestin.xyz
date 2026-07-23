const siteMetadata = {
  title: 'Wid - Software Engineer in Toronto',
  author: 'Wid',
  headerTitle: 'Wid',
  description: 'Software engineer based in Toronto. Profiles, code, and contact links.',
  language: 'en-us',
  theme: 'system', // system, dark or light
  siteUrl: 'https://www.wdestin.xyz',
  siteRepo: 'https://github.com/wdestin/wdestin.xyz',
  siteLogo: '/static/images/avatar.png',
  socialBanner: '/opengraph-image',
  email: 'hello@wdestin.xyz',
  github: 'https://github.com/wdestin',
  x: 'https://x.com/widgael',
  linkedin: 'https://www.linkedin.com/in/wdestin',
  locale: 'en-US',
  analytics: {
    umamiAnalytics: {
      umamiWebsiteId: process.env.NEXT_UMAMI_ID,
    },
  },
}

module.exports = siteMetadata
