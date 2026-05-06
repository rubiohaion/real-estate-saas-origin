# Smart Address + Light Premium Design Update

## Updated
- Moved the main address entry area to the very top of the Manage/Edit Report page.
- Added a smart address search field using the existing `/api/geocode` route and OpenStreetMap/Nominatim.
- Selecting an address suggestion fills Address, City, State and ZIP where available.
- Removed the duplicated Property Header block lower on the page so the report has one main address entry flow.
- Kept Beds / Baths / Sqft / Year Built directly under the address area.
- Kept Property Type and Condition near the top of the page.
- Added a cleaner black-and-white premium visual layer: softer cards, stronger header, rounded inputs, subtle shadows and global background polish.

## Files changed
- `app/reports/[id]/page.tsx`
- `app/api/geocode/route.ts`
- `app/globals.css`

## Notes
- The smart address search is limited to US results because the app is intended for the US appraisal market.
- If OpenStreetMap does not return a perfect City / State / ZIP split, the user can still edit those fields manually before saving.
