# mageshsridhar.github.io

Personal portfolio for Magesh Sridhar, iOS developer. Plain HTML, CSS and JavaScript with no build step, hosted on GitHub Pages.

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Editing

- Content lives in `index.html` (projects, experience, certifications, hobbies, contact).
- Styles are in `style.css`; the carousel, theme toggle, card glow and photo framing are in `script.js`.
- The animated "animations" wordmark in the hero is a code-only web component, `components/animations-word.js` (`<animations-word>`), with no GIF or Lottie file.
- Images and project GIFs are in `assets/`.

Push to `main` and GitHub Pages redeploys automatically.
