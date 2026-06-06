-- Phase 7B.1: atomic incident creation + alert linking with idempotency.

create unique index if not exists nexus_incidents_idempotency_open_idx
  on public.nexus_incidents ((metadata->>'idempotency_key'))
  where status in ('open', 'investigating', 'mitigated')
    and (metadata->>'idempotency_key') is not null;

create or replace function public.nexus_create_incident_from_alerts(
  p_title text,
  p_severity text,
  p_integration_id uuid,
  p_impact_summary text,
  p_escalation_reason text,
  p_correlation_id text,
  p_idempotency_key text,
  p_metadata jsonb,
  p_timeline jsonb,
  p_alert_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incident_id uuid;
  v_existing_id uuid;
  v_alert_id uuid;
  v_linked_count int;
  v_expected_count int;
begin
  if p_alert_ids is null or array_length(p_alert_ids, 1) is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'no_alert_ids',
      'code', 'invalid_input'
    );
  end if;

  v_expected_count := array_length(p_alert_ids, 1);

  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    select id into v_existing_id
    from public.nexus_incidents
    where metadata->>'idempotency_key' = p_idempotency_key
      and status in ('open', 'investigating', 'mitigated')
    limit 1;

    if v_existing_id is not null then
      return jsonb_build_object(
        'ok', true,
        'created', false,
        'incident_id', v_existing_id,
        'idempotent', true
      );
    end if;
  end if;

  select distinct a.incident_id into v_existing_id
  from public.nexus_alerts a
  inner join public.nexus_incidents i on i.id = a.incident_id
  where a.id = any(p_alert_ids)
    and a.incident_id is not null
    and i.status in ('open', 'investigating', 'mitigated')
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object(
      'ok', true,
      'created', false,
      'incident_id', v_existing_id,
      'idempotent', true
    );
  end if;

  foreach v_alert_id in array p_alert_ids
  loop
    if not exists (
      select 1
      from public.nexus_alerts
      where id = v_alert_id
        and incident_id is null
        and status in ('active', 'acknowledged')
    ) then
      return jsonb_build_object(
        'ok', false,
        'error', format('alert_not_linkable:%s', v_alert_id),
        'code', 'alert_not_linkable',
        'alert_id', v_alert_id
      );
    end if;
  end loop;

  insert into public.nexus_incidents (
    title,
    status,
    severity,
    integration_id,
    started_at,
    impact_summary,
    timeline,
    metadata
  )
  values (
    p_title,
    'open',
    p_severity,
    p_integration_id,
    now(),
    p_impact_summary,
    coalesce(p_timeline, '[]'::jsonb),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_incident_id;

  update public.nexus_alerts
  set
    incident_id = v_incident_id,
    updated_at = now()
  where id = any(p_alert_ids)
    and incident_id is null;

  select count(*)::int into v_linked_count
  from public.nexus_alerts
  where id = any(p_alert_ids)
    and incident_id = v_incident_id;

  if v_linked_count <> v_expected_count then
    raise exception 'incident_link_failed: expected %, linked %', v_expected_count, v_linked_count;
  end if;

  return jsonb_build_object(
    'ok', true,
    'created', true,
    'incident_id', v_incident_id,
    'idempotent', false
  );
end;
$$;

revoke all on function public.nexus_create_incident_from_alerts(
  text, text, uuid, text, text, text, text, jsonb, jsonb, uuid[]
) from public;

grant execute on function public.nexus_create_incident_from_alerts(
  text, text, uuid, text, text, text, text, jsonb, jsonb, uuid[]
) to service_role;
