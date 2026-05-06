@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 17, 17, 17;
  --background-start-rgb: 250, 250, 250;
  --background-end-rgb: 255, 255, 255;
}

* {
  box-sizing: border-box;
}

html {
  background: #fafafa;
}

body {
  margin: 0;
  color: rgb(var(--foreground-rgb));
  background:
    radial-gradient(circle at top left, rgba(0, 0, 0, 0.06), transparent 30%),
    linear-gradient(180deg, rgb(var(--background-start-rgb)) 0%, rgb(var(--background-end-rgb)) 58%, #f4f4f5 100%);
  min-height: 100vh;
}

input, select, textarea, button {
  font-family: inherit;
}

button, a {
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

button:hover, a:hover {
  transform: translateY(-1px);
}

@media (max-width: 760px) {
  body {
    background: #fff;
  }
}

.brand-header {
  max-width: 1120px;
  margin: 0 auto 22px;
  padding: 22px 24px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.brand-logo {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  transform: none !important;
}

.brand-nav {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.brand-nav a {
  color: #111;
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  border: 1px solid #e5e7eb;
  background: rgba(255,255,255,0.82);
  padding: 9px 12px;
  border-radius: 999px;
}

.brand-nav a:hover {
  border-color: #111;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}

.marketing-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px 48px;
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
}

.marketing-card {
  background: rgba(255,255,255,0.9);
  border: 1px solid #e5e7eb;
  border-radius: 28px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.08);
}

.marketing-hero {
  padding: 54px;
  min-height: 320px;
  display: grid;
  grid-template-columns: 1.25fr 0.75fr;
  gap: 34px;
  align-items: center;
}

.marketing-kicker {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-weight: 900;
  color: #525252;
  margin-bottom: 14px;
}

.marketing-title {
  font-size: clamp(34px, 6vw, 72px);
  line-height: 0.94;
  letter-spacing: -0.06em;
  margin: 0;
  font-weight: 950;
}

.marketing-text {
  font-size: 16px;
  line-height: 1.75;
  color: #444;
}

.marketing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 18px;
}

.marketing-tile {
  padding: 22px;
  border-radius: 22px;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.marketing-tile h3 {
  margin: 0 0 8px;
  font-size: 16px;
}

.marketing-tile p, .marketing-tile li {
  font-size: 14px;
  line-height: 1.65;
  color: #555;
}

.marketing-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #111;
  color: #fff;
  padding: 12px 18px;
  font-size: 14px;
  font-weight: 900;
  text-decoration: none;
  border: 1px solid #111;
}

.marketing-button.secondary {
  background: #fff;
  color: #111;
  border-color: #d4d4d8;
}

.contact-form input, .contact-form textarea, .contact-form select {
  width: 100%;
  border: 1px solid #d4d4d8;
  border-radius: 16px;
  padding: 13px 14px;
  font-size: 14px;
  background: #fff;
  outline: none;
}

.contact-form label {
  display: block;
  font-size: 12px;
  font-weight: 900;
  color: #444;
  margin-bottom: 7px;
}

@media (max-width: 820px) {
  .brand-header { align-items: flex-start; flex-direction: column; }
  .brand-nav { justify-content: flex-start; }
  .marketing-hero { grid-template-columns: 1fr; padding: 30px; }
  .marketing-grid { grid-template-columns: 1fr; }
}
