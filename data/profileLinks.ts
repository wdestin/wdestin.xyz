import siteMetadata from './siteMetadata'

export type ProfileLink = {
  title: string
  href: string
  description: string
  icon: 'linkedin' | 'github' | 'x' | 'mail'
  label: string
}

const profileLinks: ProfileLink[] = [
  {
    title: 'LinkedIn',
    href: siteMetadata.linkedin,
    description: 'Experience, background, and professional updates.',
    icon: 'linkedin',
    label: 'Professional profile',
  },
  {
    title: 'GitHub',
    href: siteMetadata.github,
    description: 'Projects, experiments, and code I am shaping.',
    icon: 'github',
    label: 'Code and projects',
  },
  {
    title: 'X',
    href: siteMetadata.x,
    description: 'Short notes, links, and public thoughts.',
    icon: 'x',
    label: 'Public notes',
  },
  {
    title: 'Email',
    href: `mailto:${siteMetadata.email}`,
    description: siteMetadata.email,
    icon: 'mail',
    label: 'Direct contact',
  },
]

export default profileLinks
