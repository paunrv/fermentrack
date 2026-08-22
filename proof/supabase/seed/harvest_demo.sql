-- =============================================================================
-- Development demo data — synthetic, and marked as such.
--
-- Recorded through the capture operations rather than inserted, so what the
-- screens show is produced the same way a real harvest would produce it.
-- =============================================================================
-- The person exists first. On a hosted project this row arrives from Supabase
-- Auth when they sign in; locally it is created directly.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'aldo@demo.example')
on conflict (id) do nothing;

update public.profiles set display_name = 'Aldo'
where id = '11111111-1111-1111-1111-111111111111';

set role service_role;
set request.jwt.claims = '{"role":"service_role"}';

insert into public.organizations (id, slug, name, status, data_origin) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'demo-winery', 'Demo Winery', 'active', 'synthetic')
on conflict (slug) do nothing;

select app.grant_membership('demo-winery', 'aldo@demo.example', 'owner');

do $demo$
declare v_org uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
begin
  if exists (select 1 from public.lots where organization_id = v_org) then
    return;  -- idempotent: the demo is already recorded
  end if;

  perform public.capture_reception(
    p_organization_id => v_org, p_occurred_at => now() - interval '18 days',
    p_lot_code => 'CS-26-H', p_lot_name => 'Cabernet, La Cañada',
    p_quantity => 2.4, p_unit => 't', p_vessel_code => 'BIN-1',
    p_source => 'La Cañada', p_source_kind => 'own', p_variety => 'Cabernet Sauvignon',
    p_note => 'About two and a half tonnes, eyeballed off the trailer');

  perform public.capture_processing(
    p_organization_id => v_org, p_occurred_at => now() - interval '18 days' + interval '7 hours',
    p_input_lot_code => 'CS-26-H',
    p_output_lot_code => 'MST-26-H', p_output_lot_name => 'Cabernet must',
    p_output_quantity => 1730, p_output_unit => 'L', p_output_vessel_code => 'TK-3',
    p_byproduct_key => 'pomace', p_byproduct_quantity => 640, p_byproduct_unit => 'kg',
    p_note => 'Destemmed and pressed the same day');

  perform public.capture_stage(v_org, now() - interval '16 days',
    'MST-26-H', 'inicio de fermentación', 'Spontaneous, no inoculation');

  perform public.capture_observation(
    p_organization_id => v_org, p_occurred_at => now() - interval '14 days',
    p_lot_code => 'MST-26-H',
    p_readings => jsonb_build_object('brix', 24.1, 'temp_c', 27),
    p_note => 'Smells right');

  perform public.capture_observation(
    p_organization_id => v_org, p_occurred_at => now() - interval '11 days',
    p_lot_code => 'MST-26-H',
    p_readings => jsonb_build_object('brix', 8.2, 'temp_c', 29),
    p_note => 'Dropping fast, cap punched twice a day');

  perform public.capture_stage(v_org, now() - interval '8 days',
    'MST-26-H', 'fin de fermentación');

  perform public.capture_transfer(
    p_organization_id => v_org, p_occurred_at => now() - interval '6 days',
    p_lot_code => 'MST-26-H', p_from_vessel_code => 'TK-3',
    p_quantity_out => 1730, p_unit => 'L',
    p_destinations => jsonb_build_array(jsonb_build_object('vessel_code','TK-7','quantity',1700)),
    p_shortfall_note => 'Gross lees',
    p_note => 'Racked off the lees into Tank 7');

  perform public.capture_correction(
    p_organization_id => v_org, p_occurred_at => now() - interval '5 days',
    p_lot_code => 'MST-26-H', p_observed_quantity => 1685, p_unit => 'L',
    p_note => 'Dipped the tank properly; the racking figure was optimistic');
end
$demo$;

reset role;
