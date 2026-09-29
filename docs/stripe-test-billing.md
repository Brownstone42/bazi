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
- Complete server-side protected calendar/comparison result enforcement. Currently calculation still runs client-side: UI gating is not paid-content security.
- Review refund/dispute policy, customer support details, recurring billing consent and merchant approval.
- Review entitlement expiry/month-reset concurrency and add transactional account refresh before live launch.
- A separate reviewed live-mode change is required; the current code intentionally rejects sk_live keys and live events.

No Stripe account, products, keys, webhook endpoint or live deployment was created remotely in this coding session.

