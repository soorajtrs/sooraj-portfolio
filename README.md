# sooraj-portfolio

Personal portfolio site — single-page, static HTML/CSS/JS, no build step.
Built from résumé content: profile summary, experience timeline, project case
studies (with architecture diagrams), skills, and certifications.

## Run it locally

```bash
cd portfolio
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy to GitHub Pages

1. Push this folder's contents to a GitHub repo (root of the repo = site root).
2. In the repo: **Settings → Pages → Source → Deploy from a branch**, pick
   `main` and `/ (root)`.
3. Site goes live at `https://<your-username>.github.io/<repo-name>/`.

## Deploy to Vercel

1. Go to https://vercel.com, sign in with GitHub, click **Add New → Project**.
2. Import this repo. Framework preset: **Other** (it's plain static files —
   no build command, no output directory needed).
3. Deploy. Vercel gives you a `*.vercel.app` URL immediately, and you can
   attach a custom domain later from the project settings.

## Updating content

- Résumé text lives directly in `index.html` (Experience / Projects / Skills
  / Certifications sections).
- The downloadable résumé PDF is `assets/resume.pdf` — replace this file
  whenever the résumé is updated, keeping the same filename.
- Colors and spacing are CSS variables at the top of `styles.css` (light
  theme in `:root`, dark theme under the `prefers-color-scheme: dark` block).
