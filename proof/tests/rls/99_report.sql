-- =============================================================================
-- Report and verdict. Exits non-zero if any assertion failed, so this is
-- usable as a CI gate exactly as it is.
-- =============================================================================
reset role;

\pset border 2
\pset title 'PROOF · two-organization isolation'

select
  lpad(seq::text, 2, '0')     as "#",
  case when ok then 'PASS' else 'FAIL' end as "result",
  name                        as "assertion",
  want                        as "expected",
  got                         as "actual"
from t.results
order by seq;

do $$
declare
  v_total  integer;
  v_failed integer;
begin
  select count(*), count(*) filter (where not ok) into v_total, v_failed from t.results;

  if v_failed > 0 then
    raise exception E'\n\n  ISOLATION FAILED — % of % assertions did not hold.\n  Nothing else may be built on top of this until they do.\n',
      v_failed, v_total;
  end if;

  raise notice E'\n  % assertions passed. Organization isolation holds.\n', v_total;
end;
$$;
