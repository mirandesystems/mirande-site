# Mirande Systems — Website

The official site for [Mirande Systems](https://www.mirandesystems.com), an independent software studio.

## Structure

```
index.html            Home page
anchored/             Anchored landing + privacy / terms / support
anvil/                Anvil product page
freetime/             FreeTime product page
assets/site/site.css  Styles for the home and product pages
assets/site/js/       main.js (page wiring), orbit.js (hero ring), dots.js (preloader),
                      m3d.js (3D M), stars.js (contact starfield)
assets/site/lib/      Vendored libraries: GSAP + ScrollTrigger + SplitText, Lenis, three.js (trimmed to what m3d.js uses)
assets/site/img/      Logos, icons, favicon, share image
assets/site/visuals/  Product visuals (card and square)
```

Static HTML/CSS/JS, no build step.

## Local development

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173.

## Deployment

Deployed via [Vercel](https://vercel.com). Push to `main` → auto-deploys.
