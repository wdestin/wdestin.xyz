import Link from '@/components/Link'
import siteMetadata from '@/data/siteMetadata'
import profileLinks from '@/data/profileLinks'
import Image from '@/components/Image'
import { Github, Linkedin, Mail, X } from '@/components/social-icons/icons'

const icons = {
  github: Github,
  linkedin: Linkedin,
  mail: Mail,
  x: X,
}

type IconName = keyof typeof icons

const profileFacts = ['Software Engineer', 'Toronto, Canada', 'Previously at Thales DIS']

export default function Home() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-14rem)] w-full max-w-5xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <section className="text-left">
        <div className="flex items-center gap-5">
          <Image
            src="/static/images/avatar.png"
            alt={siteMetadata.author}
            width={116}
            height={116}
            priority
            className="h-24 w-24 rounded-full border border-gray-200 object-cover shadow-sm dark:border-gray-800 sm:h-28 sm:w-28"
          />
          <div>
            <h1 className="text-4xl font-bold tracking-normal text-gray-950 dark:text-white sm:text-5xl">
              Wid
            </h1>
          </div>
        </div>

        <p className="mt-7 max-w-xl text-xl leading-8 text-gray-700 dark:text-gray-200">
          Software engineer based in Toronto. This is the fastest way to find my profiles, code, and
          contact info.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {profileFacts.map((fact) => (
            <span
              key={fact}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 dark:border-gray-800 dark:text-gray-300"
            >
              {fact}
            </span>
          ))}
        </div>
      </section>

      <nav aria-label="Profile links" className="space-y-3">
        {profileLinks.map(({ title, href, description, icon, label }) => {
          const Icon = icons[icon as IconName]

          return (
            <Link
              key={title}
              href={href}
              className="group flex min-h-20 items-center gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-900 transition group-hover:bg-primary-50 group-hover:text-primary-600 dark:bg-gray-800 dark:text-gray-100 dark:group-hover:bg-primary-950 dark:group-hover:text-primary-300">
                <Icon className="h-5 w-5 fill-current" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase text-primary-600 dark:text-primary-300">
                  {label}
                </span>
                <span className="mt-1 block text-lg font-semibold text-gray-950 dark:text-white">
                  {title}
                </span>
                <span className="mt-1 block text-sm leading-5 text-gray-500 dark:text-gray-400">
                  {description}
                </span>
              </span>
              <span className="text-lg text-gray-400 transition group-hover:translate-x-1 group-hover:text-primary-500">
                -&gt;
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
