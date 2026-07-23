import siteMetadata from '@/data/siteMetadata'

export default function Footer() {
  return (
    <footer className="pb-6">
      <div className="flex justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
        <div>{`© ${new Date().getFullYear()}`}</div>
        <div>{` • `}</div>
        <div>{siteMetadata.author}</div>
      </div>
    </footer>
  )
}
