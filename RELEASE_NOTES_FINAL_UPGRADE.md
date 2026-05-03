# Final Upgrade Notes

This package includes the consolidated Shamaot SaaS upgrade:

- Location-aware internal valuation model, including Beverly Hills / 90210 / 90211 / 90212 pricing assumptions.
- Luxury-market minimum valuation floor for high-price-per-square-foot markets.
- Appraiser Adjusted Value field.
- Final Value Used in Report: adjusted value takes priority, then external estimate, then internal estimate.
- Generate AI Report fallback improved to use final/adjusted value.
- Save / Finalize moved to a bottom Final Actions section, with Quick Save left at the top.
- View and Share pages display the final value / adjusted value.
- RentCast failures do not block internal valuation.

Important: keep real secrets only in Vercel Environment Variables, not in the repo.
