# Branding + Contact Pages Upgrade

Added in this version:

- New Shamaot SVG logo and icon mark in `/public`.
- New reusable header component: `components/BrandHeader.tsx`.
- Added navigation links: Dashboard, About, Plans, Help, Contact.
- Added new pages:
  - `/about`
  - `/pricing`
  - `/help`
  - `/contact`
- Contact page includes an MVP contact form with a visible confirmation message.
- Added premium black-and-white marketing/page styling in `app/globals.css`.
- Dashboard now displays the new branded header.

Build note:
- Build was not executed in the working environment because local dependencies were not available.
- Run `npm install` and then `npm run build` in your project environment after replacing the files.
