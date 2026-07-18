This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This repository deploys through [GitHub Actions](./.github/workflows/vercel-deploy.yml):

- pushes to `main` create a production deployment;
- pushes to any other branch create a preview deployment;
- the workflow can also be run manually from the GitHub Actions tab.

### One-time setup

1. Install the Vercel CLI, sign in, and link this directory to a Vercel project:

   ```bash
   npm install --global vercel@latest
   vercel login
   vercel link
   ```

2. Add every variable in [`.env.example`](./.env.example) to both the **Preview**
   and **Production** environments in the Vercel project's Settings >
   Environment Variables. `NEXT_PUBLIC_` values are public and are embedded in
   the browser bundle at build time.

3. Create a Vercel access token under Account Settings > Tokens.

4. In the GitHub repository, open Settings > Secrets and variables > Actions and
   add these repository secrets:

   | Secret | Value |
   | --- | --- |
   | `VERCEL_TOKEN` | The Vercel access token from step 3 |
   | `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
   | `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |

5. Push a branch to test a preview. Merge or push to `main` when it is ready for
   production. The deployment URL appears in the workflow summary.

If the Vercel project is also connected directly to GitHub, disable automatic
Git deployments in Vercel to avoid creating two deployments for every push.

Vercel Hobby is intended for personal, non-commercial projects and its usage
limits still apply when deployments are triggered by GitHub Actions.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
