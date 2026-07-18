# Remotion demo video (tooling only)

This project generates the Achievo product walkthrough. It is **not** part of
the npm workspaces, CI product jobs, or Vercel production deploy.

```bash
cd tools/remotion-demo-video
npm ci
npm run render:demo
```

Do not import this package from `frontend/` or `api/`.
