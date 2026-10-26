-- Calories for the household's own ingredients (and own versions of everyday
-- ones). The everyday catalog's calories ship with the app (src/data/nutrition.js).
alter table public.ingredients
  add column if not exists kcal numeric check (kcal >= 0 and kcal <= 1000),
  add column if not exists piece_g numeric check (piece_g > 0);
