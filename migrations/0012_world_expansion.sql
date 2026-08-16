INSERT OR IGNORE INTO badges(id,name,description,icon,reward_credits) VALUES
  ('fog-breacher','FOG BREACHER','Chain five discoveries before the signal cools.','radar',250),
  ('district-runner','DISTRICT RUNNER','Reveal twenty-five distinct sectors.','map',1250),
  ('recon-elite','RECON ELITE','Reveal seventy-five sectors for your crew network.','users',3000),
  ('drop-hunter','DROP HUNTER','Recover ten encrypted drops.','gift',2500);

INSERT OR IGNORE INTO contracts(id,title,description,metric,target,reward_credits,badge_id) VALUES
  ('contract-breach','BREACH // FIVE','Break through five unexplored cells and keep the chain alive.','discoveries',5,250,'fog-breacher'),
  ('contract-district','DISTRICT // TWENTY-FIVE','Complete a deep reconnaissance sweep across twenty-five cells.','discoveries',25,1250,'district-runner'),
  ('contract-recon','RECON // SEVENTY-FIVE','Push the shared underground grid through seventy-five discoveries.','discoveries',75,3000,'recon-elite'),
  ('contract-drop-hunter','CACHE // TEN','Recover ten timed or permanent underground drops.','drops',10,2500,'drop-hunter');
