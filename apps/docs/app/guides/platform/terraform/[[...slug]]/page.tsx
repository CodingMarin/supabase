import matter from 'gray-matter'
import { type SerializeOptions } from 'next-mdx-remote/dist/types'
import rehypeSlug from 'rehype-slug'
import { GuideTemplate } from '~/app/guides/GuideTemplate'
import { isValidGuideFrontmatter } from '~/lib/docs'
import { UrlTransformFunction, linkTransform } from '~/lib/mdx/plugins/rehypeLinkTransform'
import remarkMkDocsAdmonition from '~/lib/mdx/plugins/remarkAdmonition'
import { removeTitle } from '~/lib/mdx/plugins/remarkRemoveTitle'
import remarkPyMdownTabs from '~/lib/mdx/plugins/remarkTabs'
import {
  terraformDocsBranch,
  terraformDocsDocsDir,
  terraformDocsOrg,
  terraformDocsRepo,
} from '../terraformConstants'

// Each external docs page is mapped to a local page
const pageMap = [
  {
    remoteFile: 'README.md',
    meta: {
      title: 'Terraform Provider',
    },
    useRoot: true,
  },
  {
    slug: 'tutorial',
    remoteFile: 'tutorial.md',
    meta: {
      title: 'Using the Supabase Terraform Provider',
    },
  },
]

const TerraformDocs = async ({ params }: { params: { slug?: string[] } }) => {
  const { meta, ...data } = await getContent(params)

  const options = {
    mdxOptions: {
      remarkPlugins: [remarkMkDocsAdmonition, remarkPyMdownTabs, [removeTitle, meta.title]],
      rehypePlugins: [[linkTransform, urlTransform], rehypeSlug],
    },
  } as SerializeOptions

  return <GuideTemplate mdxOptions={options} meta={meta} {...data} />
}

/**
 * The GitHub repo uses relative links, which don't lead to the right locations
 * in docs.
 *
 * @param url The original link, as written in the Markdown file
 * @returns The rewritten link
 */
const urlTransform: UrlTransformFunction = (url: string) => {
  try {
    const placeholderHostname = 'placeholder'
    const { hostname, pathname, hash } = new URL(url, `http://${placeholderHostname}`)

    // Don't modify a url with a FQDN or a url that's only a hash
    if (hostname !== placeholderHostname || pathname === '/') {
      return url
    }

    const getBasename = (pathname: string) =>
      pathname.endsWith('.md') ? pathname.replace(/\.md$/, '') : pathname
    const stripLeadingPrefix = (pathname: string) => pathname.replace(/^\//, '')
    const stripLeadingDocs = (pathname: string) => pathname.replace(/^docs\//, '')

    const relativePath = stripLeadingPrefix(getBasename(pathname))

    const page = pageMap.find(
      ({ remoteFile, useRoot }) =>
        (useRoot && `${relativePath}.md` === remoteFile) ||
        (!useRoot && `${stripLeadingDocs(relativePath)}.md` === remoteFile)
    )

    if (page) {
      return 'terraform' + `/${page.slug}` + hash
    }

    // If we don't have this page in our docs, link to GitHub repo
    return `https://github.com/${terraformDocsOrg}/${terraformDocsRepo}/blob/${terraformDocsBranch}${pathname}${hash}`
  } catch (err) {
    console.error('Error transforming markdown URL', err)
    return url
  }
}

/**
 * Fetch markdown from external repo
 */
const getContent = async ({ slug }: { slug?: string[] }) => {
  const [requestedSlug] = slug ?? []
  const page = pageMap.find((page) => page.slug === requestedSlug)

  if (!page) {
    throw new Error(`No page mapping found for slug '${slug}'`)
  }

  const { meta, remoteFile, useRoot } = page

  const editLink = `${terraformDocsOrg}/${terraformDocsRepo}/blob/${terraformDocsBranch}/${useRoot ? '' : `${terraformDocsDocsDir}/`}${remoteFile}`

  let response = await fetch(
    `https://raw.githubusercontent.com/${terraformDocsOrg}/${terraformDocsRepo}/${terraformDocsBranch}/${useRoot ? '' : `${terraformDocsDocsDir}/`}${remoteFile}`
  )

  let rawContent = await response.text()
  // Strip out HTML comments
  rawContent = rawContent.replace(/<!--.*?-->/, '')
  const { content, data } = matter(rawContent)
  Object.assign(meta, data)

  if (!isValidGuideFrontmatter(meta)) {
    throw Error('Guide frontmatter is invalid.')
  }

  return {
    meta,
    content,
	editLink
  }
}

const generateStaticParams = async () => pageMap.map(({ slug }) => ({ slug: slug ? [slug] : [] }))

export default TerraformDocs
export { generateStaticParams }
