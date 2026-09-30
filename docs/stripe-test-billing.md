# Stripe Sandbox setup (not live billing)

Implemented: server-priced card Checkout, monthly/yearly recurring products, one-time 5-person credits, verified raw-body webhooks, atomic payment grants, payment history and customer portal with cancel-at-period-end. No live keys are accepted.

## Owner setup

1. Create a Stripe account at https://dashboard.stripe.com/register and use a Sandbox/test environment. Ask Stripe to confirm acceptance of this astrology service before any live launch. Do not disguise the business category.
2. Use a separate test Supabase project and test Netlify deployment. Test payments grant test entitlements in the configured database; do not point these functions at real paying customer data.
3. Apply existing account migrations in order, then all 20260928 migrations through 202609280004_stripe_test_billing.sql. The newest migration has NOT been executed against any database by this coding session.
4. In Stripe test mode create three THB prices:
   - Premium monthly: 149 THB, recurring every month.
   - Premium yearly: 999 THB, recurring every year.
   - Comparison credits: 59 THB, one-time.
   Do not enable trials, quantity adjustments, discounts, taxes added on top, or plan switching yet; webhook validation expects the exact agreed amounts and one line item.
5. Set server-only Netlify environment variables from .env.example: BILLING_TEST_ENABLED, BILLING_RETURN_ORIGIN, STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY, STRIPE_PRICE_COMPARISON and STRIPE_WEBHOOK_SECRET. Never put secret keys in VITE_ variables or chat.
6. Add webhook URL https://YOUR-TEST-HOST/api/stripe-webhook and subscribe to checkout.session.completed and invoice.paid. Use a thin/full snapshot setting compatible with the current Stripe SDK invoice schema (invoice.parent.subscription_details and line.pricing.price_details). The handler re-fetches objects with the SDK's pinned default API version.
7. Connect a LINE test login whose return URL points to this test site. Open packages, choose an option and press the separate test payment button. The localhost mock cannot authorize a Stripe payment. Plain npm run dev does not run Netlify functions.
8. Use Stripe test cards only, per https://docs.stripe.com/testing . Never enter real card data in test mode.

## Deployment checks

- Keep `functions.node_bundler = "esbuild"` and `included_files = ["node_modules/stripe/**"]` in netlify.toml. The explicit inclusion preserves a resolvable `node_modules/stripe` path when packaging a Windows pnpm junction. Check both billing function ZIPs contain `node_modules/stripe/package.json` and `node_modules/stripe/esm/stripe.esm.node.js` before deploying.
- For manual deployment use `npx --yes netlify-cli@27.10.2 deploy --prod --build --skip-functions-cache`. Do not use the old globally installed CLI 17 or deploy stale function bundles with `--no-build`.
- After deployment, a homepage HTTP 200 is not enough: POST an unauthenticated status request to `/api/billing-session` and expect JSON HTTP 401; POST an unsigned payload to `/api/stripe-webhook` and expect HTTP 400. A 502 or missing Stripe module means deployment is broken. Then test authenticated status in LINE; these probes do not validate a payment end-to-end.

## Payment rules

- Prices, customer ownership and return origin are resolved server-side; the browser cannot choose an amount, user ID, Stripe customer ID or redirect origin.
- Existing nonterminal subscriptions prevent another subscription purchase. Self-service switching/upgrades are deliberately disabled.
- Pending orders are reused for 65 minutes; Stripe Checkout expires after 60 minutes. If abandoned for 29+ minutes, use the original page or wait for the order lease to expire. This conservative test-version behavior avoids recreating an order near expiry.
- Credits are granted only from a retrieved paid Checkout session. Subscriptions are granted only from a retrieved paid creation/cycle invoice, using that invoice's paid period end.
- The payment ledger and entitlement update occur in the same SQL transaction. Payment ID is unique; credit orders can only grant once. Repeated webhook events cannot add credits twice. Older invoices cannot shorten expiry.
- Payments never reset comparison usage; the existing Bangkok calendar-month reset controls 5/month or 10/month.
- Payment failure does not extend access. Cancellation in the portal is at period end and does not refund or erase the paid interval.
- Return URL is NOT proof of payment. Refresh waits for the server-confirmed entitlement; no optimistic grants.
- Payment history currently shows the latest 20 confirmed payments. Stripe portal provides invoices; refund/dispute accounting and support workflows are NOT implemented.

## Verification checklist before live work

- Run supabase/tests/stripe_test_billing.sql in the test database (it rolls back).
- Test first monthly/yearly payment, renewal, failed renewal, cancel-at-end, duplicate and out-of-order webhooks, webhook retry after DB outage, expired sessions and repeated purchase clicks.
- Verify mobile LINE browser -> hosted Checkout -> return login/session continuity.
- Verify credits purchase and quota-first spending with an actual test account.
- Complete server-side comparison result enforcement. Comparison calculation still runs client-side; calendar now uses the protected server endpoint described below.
- Review refund/dispute policy, customer support details, recurring billing consent and merchant approval.
- Review entitlement expiry/month-reset concurrency and add transactional account refresh before live launch.
- A separate reviewed live-mode change is required; the current code intentionally rejects sk_live keys and live events.

## Verified Sandbox run — 2026-09-30

Used a newly created monthly Sandbox customer, test clock and synthetic database user. No existing LINE user, manual simulation or subscription was changed. Fixture IDs are retained locally in ignored `.netlify/billing-test-monthly.json`; secrets stay in ignored `.env.billing-test.local`.

- Initial subscription: Stripe test card paid; the deployed webhook wrote the real payment ledger and granted Premium through 2026-10-30.
- Automatic renewal: advanced only the fixture clock; Stripe paid its renewal and the deployed webhook extended the database entitlement through 2026-11-30. No manual invoice payment or local payment grant was used.
- Duplicate renewal processing returned `duplicate: true` from the real database RPC without granting twice. Included usage stayed at 3; the seeded 5 test credits remained 5.
- Failed next renewal: attached `pm_card_chargeCustomerFail`; Stripe invoice became open, attempted once, amount paid 0 and subscription past_due. The real database expiry remained unchanged and no paid ledger entry existed for that invoice.
- Expiry boundary: called the actual account reader locally with injected time and the fixture's real database rows. Before expiry Premium remained; at expiry the user became Free, credits remained 5, free-trial comparison usage stayed consumed, and birth profile / saved comparison report were identical. The public endpoint does not accept an injected clock; global app/database time was not changed.
- Canceled the newly created test subscription at its period end and advanced its clock; Stripe status became canceled. Retained fixture records for audit; did not delete the customer or clock.
- Automated suite: 157 tests passed. This run verifies monthly provider/webhook/database behavior plus local invocation of expiry logic; it is not a browser/LINE end-to-end test. Annual real-provider lifecycle and renewal/expiry concurrency remain separate checks before live launch.

Runner: `node --env-file=.env.billing-test.local scripts/test-billing-sandbox.mjs <setup|renew|fail|verify-failure|expire|cancel> monthly`. Setup refuses to overwrite an existing fixture. Follow the steps in order; do not re-run clock-changing steps merely to inspect status. The fixture credits are synthetic test balances, not an additional real credit purchase.

## Protected calendar — 2026-09-30

- `POST /api/calendar` verifies the LINE ID token, resolves the owner, and reads birth profile and membership from the database. The client sends only token, year, month and focus; extra identity, profile, plan or clock fields are rejected.
- Free receives today only (Bangkok date). Active monthly and annual memberships receive today plus 30 and 90 days respectively. Invalid or expired memberships fail closed to Free.
- Locked dates contain only date metadata and access state, with no score, stars, reading or hidden-date aggregate. Responses are private/no-store. The endpoint performs no database writes.
- Production uses the endpoint without a local-calculation fallback. Localhost development preview retains the local calculator; Vite removes that branch from production.
- Netlify includes the chart engine and its two runtime dependencies explicitly (pinned to the existing resolved versions). Prefer the Git-connected Linux build for deployment: Windows PNPM-generated archives can retain absolute junction targets even alongside included files. A successful local packaging run alone is not a deployed runtime check.
- Automated verification: 182 tests passed, including real calendar calculations with mocked identity/database transport, malformed requests, owner scoping, expiry, range boundaries and Bangkok midnight. Production build and direct Node server import passed. An authenticated deployed LINE check remains required; these tests do not claim browser end-to-end verification.
