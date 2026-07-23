# wdestin.xyz

Personal link hub for Wid, built with Next.js and Tailwind CSS.

## Requirements

- Node 24.x
- Yarn 4.0.2

## Commands

```bash
yarn dev
yarn lint
yarn build
```

## Editing

- Profile links: `data/profileLinks.ts`
- Site metadata: `data/siteMetadata.js`
- Homepage layout: `app/Main.tsx`
- Avatar: `public/static/images/avatar.png`
- Social preview image: `app/opengraph-image.tsx`

## Production Checks

After deploying, verify:

- `/` returns `200`
- `/blog` returns `404`
- `/opengraph-image` returns `200 image/png`
- The page title is `Wid - Software Engineer in Toronto`
