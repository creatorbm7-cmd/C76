-- C74 Airdrop Snapshot — READ-ONLY.
--
-- Generates a point-in-time airdrop-eligibility snapshot from live platform data.
-- Purely a SELECT: it never writes, mints, or modifies any balance or user row.
-- Run against the Supabase project (psql / SQL editor / MCP execute_sql) and
-- export the result to CSV/JSON for the airdrop simulator.
--
-- Pool + formula are declared once below so they are easy to re-tune between runs.
--   POOL         = community-airdrop tokens (10% of 1B = 100,000,000 C74)
--   weight (v1)  = energy*1 + reputation*10 + wager*5 + referrals*50 + vip*100
--   allocation   = POOL * weight / sum(weight over eligible users)
--
-- `anon_id` is a salted-free md5 prefix of the user id (pseudonymous — no PII in
-- the export). Keep the user_id column only for internal reconciliation; drop it
-- before sharing the file externally.

with params as (select 100000000::numeric as pool),
base as (
  select p.id as user_id,
    'u_'||left(md5(p.id::text),8) as anon_id,
    greatest(0, floor(extract(epoch from (now()-p.created_at))/86400)::int) as age_days,
    coalesce(p.email_verified,false) as email_ver,
    coalesce(p.two_factor_enabled,false) as tfa,
    coalesce(ue.energy_points,0) as energy,
    coalesce(cw.wagered,0) as wagered,
    coalesce(cw.deposited,0) as deposited,
    coalesce(cw.quar,false) as quarantine,
    coalesce(m.streak_days,0) as streak,
    kyc.status as kyc_status,
    coalesce(ref.cnt,0) as referrals
  from profiles p
  left join user_energy ue on ue.user_id=p.id
  left join (select user_id, sum(total_wagered) wagered, sum(total_deposited) deposited, bool_or(quarantine) quar
             from casino_wallets group by user_id) cw on cw.user_id=p.id
  left join c74_mining m on m.user_id=p.id
  left join lateral (select status from kyc_submissions k where k.user_id=p.id
                     order by submitted_at desc nulls last limit 1) kyc on true
  left join (select referred_by, count(*) cnt from profiles where referred_by is not null
             group by referred_by) ref on ref.referred_by=p.id
),
scored as (
  select *,
    case when wagered>=10000 then 4 when wagered>=5000 then 3 when wagered>=1000 then 2
         when wagered>=100 then 1 else 0 end as vip_idx,
    -- reputation: identical formula to public.get_c74_reputation()
    least(least(age_days,200)
      + case when kyc_status='approved' then 200 else 0 end
      + least(round(wagered/50.0)::int,200)
      + least(round(deposited/33.0)::int,150)
      + least(streak,10)*10
      + (case when email_ver then 25 else 0 end)+(case when tfa then 25 else 0 end)
      + case when quarantine then 0 else 100 end, 1000) as reputation
  from base
),
elig as (
  select *,
    (not quarantine and (energy>0 or wagered>0 or reputation>=100 or age_days>=1)) as eligible,
    (energy*1.0 + reputation*10.0 + wagered*5.0 + referrals*50.0 + vip_idx*100.0) as weight_raw
  from scored
),
w as (select *, sum(case when eligible then weight_raw else 0 end) over () as total_weight from elig)
select
  anon_id,
  round(energy,2)      as c74_energy,
  reputation           as reputation_score,
  case vip_idx when 4 then 'Diamond' when 3 then 'Platinum' when 2 then 'Gold'
               when 1 then 'Silver' else 'Bronze' end as vip_level,
  age_days,
  round(wagered,2)     as total_wager,
  referrals            as referral_activity,
  coalesce(kyc_status,'none') as kyc_status,
  eligible             as eligibility_status,
  case when eligible and total_weight>0
       then round((select pool from params) * weight_raw / total_weight) else 0 end as proposed_c74,
  round(weight_raw,1)  as weight,
  'energy*1 + rep*10 + wager*5 + refs*50 + vip*100' as formula_v1
  -- , user_id  -- uncomment for internal reconciliation; strip before sharing
from w
order by proposed_c74 desc;
