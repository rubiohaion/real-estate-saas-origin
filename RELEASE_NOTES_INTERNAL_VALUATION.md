# Internal Valuation + AI Upgrade

This build removes the dependency on RentCast for core valuation. External lookup can remain in the product, but if RentCast is unavailable, unauthorized, or not configured, the system now continues with Internal Valuation instead of blocking the workflow.

## Main changes

- Professional Internal Valuation model:
  - location-based price-per-square-foot baseline
  - property type adjustment
  - condition adjustment
  - age adjustment
  - size-efficiency adjustment
  - bedroom/bathroom adjustment
  - value range and confidence score
  - valuation narrative saved into the report

- External Lookup behavior:
  - no longer treats RentCast 401/403 as a broken workflow
  - saves a clear message: external data unavailable, use Internal Valuation
  - keeps the report usable even without a paid/active RentCast plan

- AI narrative:
  - now uses internal valuation values and ranges
  - includes a more professional appraisal-style narrative
  - adds stronger limiting condition language

## Recommended workflow

1. Fill property address and property data.
2. Click Calculate Internal Value.
3. Optional: click External Lookup if an external API is available.
4. Click Generate AI Report.
5. Review and edit manually before finalizing.

## Environment variables

Required:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Optional:
- OPENAI_API_KEY
- OPENAI_MODEL
- RENTCAST_API_KEY
