// Common ingredient swaps, one line per swap:
//   Ingredient | swap | amount | note
// Both names are catalog names. "Amount" is how much of the swap replaces
// one of the ingredient in the same unit (0.75 = three quarters), or an
// amount with its own unit per piece ("1 tbsp" for each egg); empty means
// the same amount. A swap goes one way only; the way back has its own line.

export const SWAP_LINES = `
Butter | Vegetable oil | 0.8 | For frying and most cakes; the dough is a bit softer
Butter | Olive oil | 0.75 | For frying, sauces and savoury bakes
Butter | Coconut oil |  | Solid like butter, so it works in pastry and cookies
Butter | Vegan butter |  |
Butter | Ghee | 0.8 |
Ghee | Butter | 1.25 |
Vegetable oil | Butter | 1.25 | Melted, for baking
Vegetable oil | Sunflower oil |  |
Vegetable oil | Rapeseed oil |  |
Olive oil | Vegetable oil |  | Less flavour, fine for cooking
Sunflower oil | Rapeseed oil |  |
Sour cream | Greek yogurt |  | Stir it in at the end so it does not split
Sour cream | Crème fraîche |  | Does not split when boiled
Sour cream | Cream cheese |  | Thicker; loosen with a little milk
Crème fraîche | Sour cream |  | Add off the heat
Crème fraîche | Greek yogurt |  | Add off the heat
Greek yogurt | Sour cream |  |
Greek yogurt | Yogurt |  | Strain it for an hour to thicken
Greek yogurt | Bulgarian yogurt |  | Strain it for an hour to thicken
Yogurt | Greek yogurt |  | Thin with a splash of milk
Yogurt | Kefir |  | Runnier
Buttermilk | Yogurt | 0.75 | Plus a quarter of the amount in milk
Buttermilk | Milk |  | With 1 tbsp lemon juice per 250 ml, left for 5 minutes
Buttermilk | Kefir |  |
Kefir | Buttermilk |  |
Cream | Milk | 0.75 | Plus a quarter of the amount in melted butter; it won't whip
Cream | Coconut cream |  | Tastes of coconut
Double cream | Mascarpone |  | Loosen with milk; it won't whip the same
Double cream | Cream |  |
Single cream | Milk |  | Thinner; add a spoon of butter
Milk | Plant milk |  |
Milk | Water |  | For batters; a little less rich
Plant milk | Milk |  |
Cream cheese | Mascarpone |  |
Cream cheese | Ricotta |  | Drain it first
Cream cheese | Quark |  | Lighter and a bit sour
Mascarpone | Cream cheese |  | Tangier
Ricotta | Cottage cheese |  | Blend it smooth
Ricotta | Quark |  |
Quark | Ricotta |  |
Quark | Greek yogurt |  | Strain it overnight
Cottage cheese | Ricotta |  |
Feta | Sirene |  |
Sirene | Feta |  |
Parmesan | Pecorino |  | Saltier; use a little less salt
Pecorino | Parmesan |  |
Gruyère | Emmental |  |
Cheddar | Gouda |  |
Mozzarella | Burrata |  |
Kashkaval | Gouda |  |
Eggs | Flax seeds | 1 tbsp | Ground, with 3 tbsp water per egg, left 5 minutes; for baking only
Eggs | Chia seeds | 1 tbsp | With 3 tbsp water per egg, left 10 minutes; for baking only
Eggs | Banana | 0.5 pcs | Mashed, per egg; for sweet bakes
Egg yolks | Eggs | 0.5 pcs | Per yolk; a less rich result
Flour | Plain flour |  |
Plain flour | Fine flour |  |
Self-raising flour | Plain flour |  | With 2 tsp baking powder per 150 g
Bread flour | Plain flour |  | Slightly less chewy
Wholemeal flour | Plain flour |  |
Plain flour | Spelt flour |  |
Cornstarch | Potato starch |  |
Cornstarch | Flour | 2 | Cook a little longer
Potato starch | Cornstarch |  |
Baking powder | Baking soda | 0.25 | Only with something sour in the dough (yogurt, lemon, buttermilk)
Sugar | Honey | 0.75 | Use a little less liquid; browns faster
Sugar | Maple syrup | 0.75 | Use a little less liquid
Sugar | Brown sugar |  |
Sugar | Caster sugar |  |
Caster sugar | Sugar |  | Grind it finer for meringues
Brown sugar | Sugar |  | With 1 tsp honey per 100 g for the moisture
Icing sugar | Sugar |  | Blend it fine first
Honey | Maple syrup |  |
Honey | Agave syrup |  |
Honey | Sugar | 1.25 | Add a little more liquid
Maple syrup | Honey |  |
Golden syrup | Honey |  |
Breadcrumbs | Oats |  | Blitzed
Breadcrumbs | Crackers |  | Crushed
Rice | Quinoa |  |
Rice | Bulgur |  |
Couscous | Bulgur |  |
Couscous | Quinoa |  |
Bulgur | Couscous |  |
Spaghetti | Linguine |  |
Penne | Rigatoni |  |
Penne | Fusilli |  |
Lasagne sheets | Tortillas |  |
Noodles | Spaghetti |  |
Rice noodles | Noodles |  |
Lemon juice | Lime juice |  |
Lemon juice | Vinegar | 0.5 | For sharpness, not flavour
Lime juice | Lemon juice |  |
Lemon | Lime |  |
Lime | Lemon |  |
Vinegar | Lemon juice |  |
Balsamic vinegar | Red wine vinegar |  | With a pinch of sugar
Red wine vinegar | Apple cider vinegar |  |
Rice vinegar | Apple cider vinegar |  | With a pinch of sugar
White wine | Stock |  | With 1 tsp vinegar or lemon juice per 100 ml
Red wine | Stock |  | Beef stock, with a little balsamic vinegar
Mirin | White wine |  | With 1 tsp sugar per tbsp
Shaoxing wine | White wine |  | Dry sherry is closer if you have it
Stock | Stock cubes | 0.004 pcs | 1 cube per 250 ml of water
Chicken stock | Vegetable stock |  |
Beef stock | Vegetable stock |  | With a dash of soy sauce
Vegetable stock | Chicken stock |  |
Soy sauce | Fish sauce | 0.5 | Saltier and fishier
Fish sauce | Soy sauce | 1.5 |
Light soy sauce | Soy sauce |  |
Dark soy sauce | Soy sauce |  | With a little sugar for colour
Tomato paste | Passata | 3 | Cook it down longer
Passata | Canned tomatoes |  | Blend them
Canned tomatoes | Tomatoes |  | Chopped; cook a bit longer
Canned tomatoes | Passata |  |
Tomatoes | Canned tomatoes |  |
Coconut milk | Cream |  | Tastes of cream, not coconut
Coconut milk | Greek yogurt |  | Add off the heat
Coconut cream | Coconut milk |  | Thinner
Mayonnaise | Greek yogurt |  | Lighter and sour
Dijon mustard | Mustard |  |
Wholegrain mustard | Dijon mustard |  |
Mustard | Dijon mustard |  |
Ketchup | Tomato paste | 0.5 | With a little sugar and vinegar
Tahini | Peanut butter |  |
Peanut butter | Tahini |  |
Garlic | Garlic powder | 0.5 tsp | Per clove
Onion | Onion powder | 1 tsp | Per onion; for sauces and rubs
Onion | Shallots | 3 pcs | Milder
Shallots | Onion | 0.3 pcs | Use a sweet or red one
Red onion | Onion |  |
Spring onions | Chives |  |
Leek | Onion |  |
Ginger | Ground ginger | 0.25 |
Chilli | Chilli flakes | 0.5 tsp | Per chilli
Chilli | Cayenne pepper | 0.25 tsp | Per chilli
Bell pepper | Kapia pepper |  |
Kapia pepper | Bell pepper |  |
Courgette | Aubergine |  |
Aubergine | Courgette |  |
Spinach | Kale |  | Cook it a few minutes longer
Spinach | Rocket |  | Add at the very end
Kale | Spinach |  |
Potatoes | Sweet potatoes |  | Cooks a little faster
Sweet potatoes | Potatoes |  |
Pumpkin | Butternut squash |  |
Butternut squash | Pumpkin |  |
Mushrooms | Chestnut mushrooms |  |
Chestnut mushrooms | Mushrooms |  |
Celery | Fennel |  |
Parsley | Coriander |  |
Coriander | Parsley |  | With a little lime zest
Basil | Parsley |  |
Dill | Parsley |  |
Oregano | Marjoram |  |
Marjoram | Oregano |  |
Thyme | Oregano |  |
Rosemary | Thyme |  |
Smoked paprika | Paprika |  | With a pinch of cumin
Paprika | Smoked paprika |  | Smokier; use a bit less
Cumin | Coriander seeds |  |
Garam masala | Curry powder |  |
Curry powder | Garam masala |  | With a pinch of turmeric
Chilli powder | Cayenne pepper | 0.5 | Hotter
Cayenne pepper | Chilli flakes |  |
Nutmeg | Cinnamon | 0.5 |
Allspice | Cinnamon |  | With a pinch of cloves
Vanilla | Vanilla sugar | 2 | Use a little less sugar
Vanilla sugar | Vanilla | 0.5 tsp | Per pack; add a little sugar
Vanilla pod | Vanilla | 2 tsp | Per pod
Dark chocolate | Cocoa | 0.5 | With a third of the amount in butter and a little sugar
Cocoa | Dark chocolate | 1.5 | Use less butter and sugar
Gelatine | Agar | 0.5 | Boil it for two minutes; sets firmer
Gelatine leaves | Gelatine | 2 g | Per leaf
Yeast | Baking powder | 2 | Not a real raise; for flatbreads and quick doughs only
Bacon | Smoked bacon |  |
Bacon | Ham |  |
Ground beef | Ground pork |  |
Ground beef | Turkey |  | Leaner; add a little oil
Ground pork | Ground beef |  |
Chicken breast | Chicken thighs |  | Juicier; cooks a few minutes longer
Chicken thighs | Chicken breast |  | Leaner; do not overcook
Chicken | Turkey |  |
Prawns | White fish |  | In chunks
White fish | Cod |  |
Cod | White fish |  |
Salmon | Trout |  |
Trout | Salmon |  |
Tuna | Salmon |  |
Beef | Pork |  |
Pork | Chicken thighs |  |
Lentils | Red lentils |  | Cook to a mush; less time
Red lentils | Lentils |  | Cook longer
Chickpeas | Cannellini beans |  |
Kidney beans | Black beans |  |
Black beans | Kidney beans |  |
Cannellini beans | Butter beans |  |
Tofu | Paneer |  |
Paneer | Halloumi |  |
Halloumi | Paneer |  |
Almonds | Hazelnuts |  |
Walnuts | Pecans |  |
Pecans | Walnuts |  |
Pine nuts | Sunflower seeds |  | Toast them first
Pine nuts | Cashews |  |
Almond flour | Flour |  | Denser and drier; add a spoon of butter
Puff pastry | Filo pastry |  | Brush every sheet with butter
Filo pastry | Kori za banitsa |  |
Kori za banitsa | Filo pastry |  |
`

/** Catalog name (lowercase) → [{ name, ratio, unit, note }]. */
export const SWAPS = new Map()
for (const line of SWAP_LINES.trim().split('\n')) {
  const [from, name, amount = '', note = ''] = line.split('|').map((s) => s.trim())
  const [, n = '1', unit = null] = amount.match(/^([\d.]+)?\s*(\S+)?$/) ?? []
  const key = from.toLowerCase()
  SWAPS.set(key, [...(SWAPS.get(key) ?? []), { name, ratio: Number(n), unit, note }])
}
