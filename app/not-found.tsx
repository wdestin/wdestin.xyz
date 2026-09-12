import Link from '@/components/Link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-start justify-start md:mt-24 md:flex-row md:items-center md:justify-center md:space-x-6">
      <div className="space-x-2 pb-8 pt-6 md:space-y-5">
        <h1 className="text-6xl font-extrabold leading-9 tracking-tight text-gray-900 md:border-r-2 md:px-6 md:text-8xl md:leading-14 dark:text-gray-100">
          404
        </h1>
      </div>
      <div className="max-w-md">
        <p className="mb-4 text-xl font-bold leading-normal md:text-2xl">
          Sorry we couldn't find this page.
        </p>
        <p className="mb-8">But don't worry, you can find everything on the homepage.</p>
        <Link
          href="/"
          className="inline rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium leading-5 text-white shadow transition-colors duration-150 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 motion-reduce:transition-none dark:hover:bg-blue-500 dark:focus-visible:ring-blue-300 dark:focus-visible:ring-offset-gray-950"
        >
          Back to homepage
        </Link>
      </div>
    </div>
  )
}
