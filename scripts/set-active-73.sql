-- Set the user-dashboard "activated games" allowlist to a curated 73 real 2J
-- slots (real names + real CDN art). The IG dashboard (Explore grid + reels)
-- then shows ONLY these 73 in the top-rich Instagram gold-frame arrangement.
-- Presentation/read-only config — no money, launch stays interlocked (501).
--
-- Run in Supabase → SQL Editor (project smcwrriaraptzjhqdktg). Swap the array
-- for your exact 73 aggregator ids any time; the dashboard updates on reload.

insert into public.site_config (key, value)
values (
  'active_game_uids',
  '["5262","4652","5542","4837","4522","5321","4558","4969","5245","5231","4967","5118","5456","1195","1216","220","1219","15","1233","10259","305","1318","10509","555","163","10516","10514","552","4990","5602","5593","4946","4875","4509","5141","5611","5583","5639","4707","5527","5638","5570","200","1170","1171","10269","147","188","1190","856","574","481","1229","1230","1231","1085","1018","1236","1247","1120","319","1250","10268","1256","941","1290","1309","10164","1317","933","1166","8456","8526"]'::jsonb
)
on conflict (key) do update
  set value = excluded.value, updated_at = now();

-- verify (should show count = 73)
select key, jsonb_array_length(value) as count, updated_at
from public.site_config where key = 'active_game_uids';
