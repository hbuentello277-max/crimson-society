-- Blackcard display pricing alignment (UI/admin copy only; Stripe Price IDs unchanged)

update public.membership_plans
set
  price = 10,
  title = 'Monthly Plan',
  description = 'Flexible entry for Blackcard Access'
where plan_type = 'monthly';

update public.membership_plans
set
  price = 90,
  title = 'Yearly Plan',
  description = 'Save $30/year · 3 months free'
where plan_type = 'yearly';
