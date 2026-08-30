import siteMetadata from './siteMetadata'

export type ProfileLink = {
  title: string
  href: string
  description: string
  icon: 'linkedin' | 'x' | 'mail'
  label: string
}

const profileLinks: ProfileLink[] = [
  {
    title: 'LinkedIn',
    href: siteMetadata.linkedin,
    description: 'Experience, background, and the path so far.',
    icon: 'linkedin',
    label: 'Work history',
  },
  {
    title: 'X',
    href: siteMetadata.x,
    description: 'Short notes, links, and public thoughts.',
    icon: 'x',
    label: 'Notes and ideas',
  },
  {
    title: 'Email',
    href: `mailto:${siteMetadata.email}`,
    description: siteMetadata.email,
    icon: 'mail',
    label: 'Start a conversation',
  },
]

export default profileLinks
