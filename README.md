# mageshsridhar.github.io

Personal portfolio for Magesh Sridhar, iOS developer. Plain HTML, CSS and JavaScript with no build step, hosted on GitHub Pages.

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Editing

- Content lives in `index.html` (hero, projects, experience, certifications, interests, footer).
- Styles are in `style.css`; the carousel, theme toggle, card glow and photo framing are in `script.js`.
- The animated "animations" wordmark in the hero is a code-only web component, `components/animations-word.js` (`<animations-word>`), with no GIF or Lottie file.
- Images and project demo videos are in `assets/`. Demos are H.264 MP4s (with a WebP poster frame) that play only while on screen; the hero photo and device frames are WebP. `hero.jpg` is kept for link previews (`og:image`).

Push to `main` and GitHub Pages redeploys automatically.
