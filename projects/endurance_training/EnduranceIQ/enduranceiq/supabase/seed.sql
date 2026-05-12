-- Seed athlete & weekly placeholder — run after migration (manual / SQL editor)
INSERT INTO athletes (id, email, name, birth_year, weight_kg, goal_race_type)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'levi@enduranceiq.local',
  'Levi',
  1996,
  72,
  'marathon'
)
ON CONFLICT (email) DO NOTHING;
