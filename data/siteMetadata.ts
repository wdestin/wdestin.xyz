type SiteMetadata = {
  title: string
  author: string
  description: string
  language: string
  siteUrl: string
  socialBanner: string
  email: string
  x: string
  linkedin: string
  analytics: {
    umamiAnalytics: {
      umamiWebsiteId?: string
    }
  }
}

const siteMetadata = {
  title: 'Wid - Builder',
  author: 'Wid',
  description: 'Builder making useful systems, creative tools, and web experiences.',
  language: 'en-us',
  siteUrl: 'https://www.wdestin.xyz',
  socialBanner: '/opengraph-image',
  email: 'hello@wdestin.xyz',
  x: 'https://x.com/widgael',
  linkedin: 'https://www.linkedin.com/in/wdestin',
  analytics: {
    umamiAnalytics: {
      umamiWebsiteId: process.env.NEXT_UMAMI_ID,
    },
  },
} satisfies SiteMetadata

export default siteMetadata
