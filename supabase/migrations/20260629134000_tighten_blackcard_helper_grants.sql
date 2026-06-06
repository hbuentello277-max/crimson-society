-- Ensure membership helper functions are not callable by anonymous clients.
revoke all on function public.resolve_profile_membership_tier(uuid) from public;
revoke all on function public.resolve_profile_membership_tier(uuid) from anon;
revoke all on function public.user_has_blackcard_access(uuid) from public;
revoke all on function public.user_has_blackcard_access(uuid) from anon;

grant execute on function public.resolve_profile_membership_tier(uuid) to authenticated;
grant execute on function public.user_has_blackcard_access(uuid) to authenticated;
