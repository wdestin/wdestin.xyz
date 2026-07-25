export default function Footer() {
  return (
    <footer className="pb-6">
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">{`© ${new Date().getFullYear()}`}</div>
    </footer>
  )
}
