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
    // If you want to use an analytics provider you have to add it to the
    // content security policy in the `next.config.js` file.
    // supports Plausible, Simple Analytics, Umami, Posthog or Google Analytics.
    umamiAnalytics: {
      // We use an env variable for this site to avoid other users cloning our analytics ID
      umamiWebsiteId: process.env.NEXT_UMAMI_ID, // e.g. 123e4567-e89b-12d3-a456-426614174000
      // You may also need to overwrite the script if you're storing data in the US - ex:
      // src: 'https://us.umami.is/script.js'
      // Remember to add 'us.umami.is' in `next.config.js` as a permitted domain for the CSP
    },
    // plausibleAnalytics: {
    //   plausibleDataDomain: '', // e.g. tailwind-nextjs-starter-blog.vercel.app
    // },
    // simpleAnalytics: {},
    // posthogAnalytics: {
    //   posthogProjectApiKey: '', // e.g. 123e4567-e89b-12d3-a456-426614174000
    // },
    // googleAnalytics: {
    //   googleAnalyticsId: '', // e.g. G-XXXXXXX
    // },
  },
}

module.exports = siteMetadata
