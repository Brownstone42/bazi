# Calendar subscription windows

- Free: today only. Monthly Premium (149 THB): today plus 30 days inclusive. Yearly Premium (999 THB): today plus 90 days inclusive.
- Windows use Asia/Bangkok calendar dates, not the viewer device timezone or birth timezone. Past dates are not included.
- Expiry is checked against the actual timestamp, independently of the forecast horizon. An expired account can still view today; saved data is not deleted.
- The UI refreshes its clock every 30 seconds and on focus/click. Highlights are ranked from accessible days only; locked cells do not reveal score colors.
- Local development mock remains a 90-day preview; production query parameters cannot grant Premium.

## Deployment prerequisite

Run `supabase/migrations/202609280002_subscription_billing_cycle.sql` before assigning annual memberships. Existing records default to monthly; no annual purchase is inferred from expiry length. The account endpoint returns `billingCycle` and `premiumExpiresAt`. Partial quota responses preserve those values instead of clearing expiry.

Payment integration is not implemented. Future verified payment processing must set plan_id, billing_cycle, premium_started_at and premium_expires_at server-side. Do not allow the client to grant itself entitlements. Calendar calculation currently runs in the browser: these are UI feature gates, not secure server-side protection of paid calculations. Before accepting payments, server-side enforcement is required for protected results and notification/date-search endpoints.

Migration prepared locally only; not applied to the live database by this change.
