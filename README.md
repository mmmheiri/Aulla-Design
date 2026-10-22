# Aulla Design

Arabic/English abaya storefront and protected owner dashboard. Next.js, React and TypeScript. Mobile-first catalogue, bag, Gulf delivery fields, optional OpenStreetMap, made-to-measure inputs and printable test order documents.

## Local development

Requires Node.js 24. Run npm ci, copy .env.example to .env.local, then npm run db:init and npm run dev. Open http://127.0.0.1:8826/. Generate local admin setup with node scripts/server/admin-setup.mjs and follow the private file instructions; never commit .data or environment credentials.

## Validation

npm test, npm run typecheck, npm run build. The source workspace passed 57 tests and mobile/RTL/LTR journey checks. Browser QA requires Playwright Chromium. Physical-device checks and hosted concurrent-stock validation remain pending.

## Current boundary

This version is test-only. Live payments, approved shipping fees, legal/tax invoice settings, actual mobile push delivery and approved fit charts are not configured. Order documents are not tax invoices. No customer records, passwords, private setup, local Git history or audit screenshots are included. Proprietary font files excluded from version control must be supplied separately under the owner's licence; CSS fallback fonts remain available.

Brand and garment assets belong to their respective owners; publication does not grant reuse rights.
