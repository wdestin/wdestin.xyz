type SiteMetadata = {
  title: string
  author: string
  description: string
  language: string
  theme: 'system' | 'dark' | 'light'
  siteUrl: string
  socialBanner: string
  email: string
  github: string
  x: string
  linkedin: string
  analytics: {
    umamiAnalytics: {
      umamiWebsiteId?: string
    }
  }
}

const siteMetadata = {
  title: 'Wid - Software Engineer in Toronto',
  author: 'Wid',
  description: 'Software engineer based in Toronto. Profiles, code, and contact links.',
  language: 'en-us',
  theme: 'system',
  siteUrl: 'https://www.wdestin.xyz',
  socialBanner: '/opengraph-image',
  email: 'hello@wdestin.xyz',
  github: 'https://github.com/wdestin',
  x: 'https://x.com/widgael',
  linkedin: 'https://www.linkedin.com/in/wdestin',
  analytics: {
    umamiAnalytics: {
      umamiWebsiteId: process.env.NEXT_UMAMI_ID,
    },
  },
} satisfies SiteMetadata

export default siteMetadata
