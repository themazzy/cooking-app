// The starting ingredient catalog: one line per ingredient,
//   Name | aisle | picture | other names
// "picture" is the ingredient's name on TheMealDB (its small PNGs are the
// pictures in the app); empty means no picture. Other names are what recipes
// call the same thing; plurals are matched automatically.
// supabase/seed-ingredients.sql is generated from this file
// (npm run seed:ingredients), and the app uses it until the shared catalog loads.

const LINES = `
Beef | Meat | Beef | beef meat, stewing beef, beef chunks
Ground beef | Meat | Minced Beef | minced beef, beef mince, lean minced beef, lean ground beef, mince, ground meat, minced meat
Beef brisket | Meat | Beef Brisket | brisket
Beef fillet | Meat | Beef Fillet | beef tenderloin, fillet steak
Steak | Meat | Beef Fillet | sirloin, ribeye, rib eye, flank steak, rump steak
Beef shin | Meat | Beef Shin | shin of beef
Veal | Meat | Veal | veal cutlet
Pork | Meat | Pork | pork loin, pork shoulder, pork chops, pork belly, pork neck
Ground pork | Meat | Minced Pork | minced pork, pork mince
Bacon | Meat | Bacon | streaky bacon, bacon strips, pancetta, lardons
Ham | Meat | Ham | cooked ham
Prosciutto | Meat | Prosciutto | parma ham, serrano ham, cured ham
Sausages | Meat | Sausages | sausage, bratwurst, frankfurters, hot dogs
Chorizo | Meat | Chorizo | chorizo sausage
Chicken | Meat | Chicken | whole chicken, chicken meat
Chicken breast | Meat | Chicken Breast | chicken breasts, chicken fillet, chicken fillets, boneless chicken breast
Chicken thighs | Meat | Chicken Thighs | chicken thigh, boneless chicken thighs, chicken legs, chicken drumsticks, drumsticks, chicken wings
Ground chicken | Meat | Turkey Mince | minced chicken, chicken mince
Turkey | Meat | Turkey Mince | turkey breast, ground turkey, turkey mince, minced turkey
Duck | Meat | Duck | duck breast, duck legs
Lamb | Meat | Lamb | lamb leg, lamb shoulder, lamb chops, lamb mince, ground lamb, mutton
Salmon | Fish | Salmon | salmon fillet, salmon fillets, smoked salmon
Tuna | Fish | Tuna | canned tuna, tuna steak
White fish | Fish | White Fish Fillets | cod, haddock, white fish fillets, hake, pollock, tilapia, sea bass
Mackerel | Fish | Mackerel | smoked mackerel
Prawns | Fish | King Prawns | shrimp, shrimps, king prawns, tiger prawns
Squid | Fish | Squid | calamari
Mussels | Fish | Mussels | clams
Eggs | Dairy & eggs | Eggs | egg, large eggs, free-range eggs
Egg yolks | Dairy & eggs | Egg Yolks | egg yolk, yolks
Egg whites | Dairy & eggs | Egg White | egg white
Milk | Dairy & eggs | Milk | whole milk, semi-skimmed milk, skim milk
Butter | Dairy & eggs | Butter | unsalted butter, salted butter, cold butter, melted butter
Cream | Dairy & eggs | Double Cream | heavy cream, double cream, whipping cream, single cream, cooking cream
Sour cream | Dairy & eggs | Sour Cream | soured cream, creme fraiche, crème fraîche
Greek yogurt | Dairy & eggs | Greek Yogurt | greek yoghurt
Yogurt | Dairy & eggs | Yogurt | yoghurt, plain yogurt, natural yogurt
Cream cheese | Dairy & eggs | Cream Cheese | philadelphia, soft cheese
Mascarpone | Dairy & eggs | Mascarpone |
Ricotta | Dairy & eggs | Ricotta | cottage cheese, quark, curd cheese
Cheese | Dairy & eggs | Cheese | grated cheese, shredded cheese
Cheddar | Dairy & eggs | Cheddar Cheese | cheddar cheese
Mozzarella | Dairy & eggs | Mozzarella | mozzarella balls, fresh mozzarella
Parmesan | Dairy & eggs | Parmesan | parmigiano reggiano, parmigiano-reggiano, grana padano, pecorino
Feta | Dairy & eggs | Feta | feta cheese, cubed feta
Goat cheese | Dairy & eggs | Goats Cheese | goats cheese, goat's cheese
Gouda | Dairy & eggs | Gouda Cheese | gouda cheese, edam
Brie | Dairy & eggs | Brie | camembert
Gruyère | Dairy & eggs | Gruyère | gruyere, emmental
Paneer | Dairy & eggs | Paneer |
Condensed milk | Dairy & eggs | Condensed Milk | sweetened condensed milk
Onion | Vegetables | Onion | onions, yellow onion, white onion, brown onion, chopped onion
Red onion | Vegetables | Red Onions | red onions, purple onion
Spring onions | Vegetables | Spring Onions | spring onion, green onions, green onion, scallions
Shallots | Vegetables | Shallots | shallot
Leek | Vegetables | Leek | leeks
Garlic | Vegetables | Garlic | garlic cloves, garlic clove, cloves of garlic, minced garlic, garlic bulb
Ginger | Vegetables | Ginger | fresh ginger, ginger root
Potatoes | Vegetables | Potatoes | potato, small potatoes, new potatoes, floury potatoes, waxy potatoes, baby potatoes
Sweet potatoes | Vegetables | Squash | sweet potato
Carrots | Vegetables | Carrots | carrot
Celery | Vegetables | Celery | celery stalks, celery sticks
Celeriac | Vegetables | Celeriac | celery root
Tomatoes | Vegetables | Tomatoes | tomato, fresh tomatoes, vine tomatoes, plum tomatoes, beef tomatoes
Cherry tomatoes | Vegetables | Cherry Tomatoes | grape tomatoes, baby plum tomatoes
Cucumber | Vegetables | Cucumber | cucumbers, grated cucumber
Bell pepper | Vegetables | Red Pepper | red pepper, yellow pepper, green pepper, peppers, bell peppers, capsicum, paprika pepper
Chilli | Vegetables | Chilli | chili, chilli pepper, chili pepper, red chilli, green chilli, chillies, chilies, jalapeno, jalapeño
Courgette | Vegetables | Courgettes | zucchini, courgettes
Aubergine | Vegetables | Aubergine | eggplant, eggplants
Mushrooms | Vegetables | Mushrooms | mushroom, button mushrooms, champignons, chestnut mushrooms
Shiitake mushrooms | Vegetables | Shiitake Mushrooms | shiitake
Broccoli | Vegetables | Broccoli | broccoli florets
Cauliflower | Vegetables | | cauliflower florets
Cabbage | Vegetables | Cabbage | white cabbage, red cabbage, savoy cabbage, sauerkraut
Brussels sprouts | Vegetables | Brussels Sprouts |
Kale | Vegetables | Kale |
Spinach | Vegetables | Spinach | baby spinach, fresh spinach
Lettuce | Vegetables | Lettuce | iceberg lettuce, romaine, little gem, salad leaves, mixed salad
Rocket | Vegetables | Rocket | arugula
Asparagus | Vegetables | Asparagus |
Green beans | Vegetables | Green Beans | string beans, french beans
Peas | Vegetables | Peas | green peas, frozen peas
Sugar snap peas | Vegetables | Sugar Snap Peas | snow peas, mangetout
Sweetcorn | Vegetables | Sweetcorn | corn, sweet corn, corn kernels
Pumpkin | Vegetables | Pumpkin | butternut squash, squash, hokkaido
Beetroot | Vegetables | | beetroots, beets, beet
Radishes | Vegetables | | radish
Fennel | Vegetables | Fennel | fennel bulb
Turnip | Vegetables | Turnips | turnips, swede, rutabaga
Parsnip | Vegetables | | parsnips
Avocado | Fruit | Avocado | avocados
Lemon | Fruit | Lemon | lemons
Lemon juice | Fruit | Lemon Juice | juice of a lemon, juice of 1 lemon
Lemon zest | Fruit | Lemon Zest | lemon peel, grated lemon zest
Lime | Fruit | Lime | limes, lime juice
Orange | Fruit | Orange | oranges, orange zest, orange juice
Apples | Fruit | Apples | apple, green apple, cooking apples
Pears | Fruit | Pears | pear
Banana | Fruit | Banana | bananas
Strawberries | Fruit | Strawberries | strawberry
Raspberries | Fruit | Raspberries | raspberry
Blueberries | Fruit | Blueberries | blueberry
Blackberries | Fruit | Blackberries | blackberry
Cherries | Fruit | Cherry | cherry
Peaches | Fruit | Peaches | peach, nectarines
Apricots | Fruit | Apricot | apricot
Dried apricots | Fruit | Dried Apricots |
Raisins | Fruit | Raisins | sultanas, currants
Dates | Fruit | Medjool Dates | medjool dates
Coconut | Fruit | Desiccated Coconut | desiccated coconut, shredded coconut, coconut flakes
Parsley | Herbs | Parsley | fresh parsley, chopped parsley, flat-leaf parsley
Basil | Herbs | Basil | fresh basil, basil leaves
Coriander | Herbs | Coriander | cilantro, coriander leaves, fresh coriander
Dill | Herbs | Dill | fresh dill
Mint | Herbs | Mint | fresh mint, mint leaves
Chives | Herbs | Chives |
Thyme | Herbs | Thyme | fresh thyme, dried thyme
Rosemary | Herbs | Rosemary | fresh rosemary
Oregano | Herbs | Oregano | dried oregano
Sage | Herbs | Sage |
Tarragon | Herbs | Tarragon Leaves |
Marjoram | Herbs | Marjoram | dried marjoram
Bay leaves | Herbs | Bay Leaves | bay leaf
Salt | Spices | Salt | sea salt, kosher salt, table salt
Black pepper | Spices | Black Pepper | pepper, ground pepper, ground black pepper
Salt and pepper | Spices | Salt | salt & pepper
Paprika | Spices | Paprika | sweet paprika, ground paprika
Smoked paprika | Spices | Smoked Paprika |
Chilli powder | Spices | Chilli Powder | chili powder, cayenne pepper, cayenne, chilli flakes, red pepper flakes, chili flakes
Cumin | Spices | Cumin | ground cumin, cumin seeds
Coriander seeds | Spices | Coriander Seeds | ground coriander
Turmeric | Spices | Turmeric | ground turmeric
Curry powder | Spices | Curry Powder | curry
Garam masala | Spices | Garam Masala |
Cinnamon | Spices | Cinnamon | ground cinnamon, cinnamon stick
Nutmeg | Spices | Nutmeg | ground nutmeg
Cloves | Spices | Cloves | ground cloves
Cardamom | Spices | Cardamom | cardamom pods
Star anise | Spices | Star Anise |
Caraway seeds | Spices | | caraway
Garlic powder | Spices | Garlic Powder | dried garlic, granulated garlic
Onion powder | Spices | Onion Salt | dried onion
Ground ginger | Spices | Ground Ginger |
Italian seasoning | Spices | Italian Seasoning | mixed herbs, herbes de provence
Mustard seeds | Spices | Mustard Seeds |
Vanilla | Baking | Vanilla Extract | vanilla extract, vanilla sugar, vanilla pod, vanilla essence
Flour | Baking | Flour | plain flour, all-purpose flour, white flour, wheat flour
Self-raising flour | Baking | Self-raising Flour | self rising flour
Wholemeal flour | Baking | Whole Wheat | whole wheat flour
Cornstarch | Baking | Cornstarch | cornflour, corn flour, corn starch, potato starch
Sugar | Baking | Sugar | white sugar, granulated sugar, caster sugar
Brown sugar | Baking | Brown Sugar | light brown sugar, dark brown sugar, muscovado sugar, demerara sugar, cane sugar
Icing sugar | Baking | Icing Sugar | powdered sugar, confectioners sugar
Honey | Baking | Honey |
Maple syrup | Baking | Maple Syrup | golden syrup
Baking powder | Baking | Baking Powder |
Baking soda | Baking | Bicarbonate Of Soda | bicarbonate of soda, bicarb
Yeast | Baking | Yeast | dried yeast, fresh yeast, instant yeast
Cocoa | Baking | Cocoa | cocoa powder, cacao
Dark chocolate | Baking | Dark Chocolate | chocolate, plain chocolate, chocolate chips, dark chocolate chips
Milk chocolate | Baking | Milk Chocolate |
White chocolate | Baking | White Chocolate | white chocolate chips
Gelatine | Baking | Gelatine Leafs | gelatin, gelatine leaves
Puff pastry | Baking | Puff Pastry |
Shortcrust pastry | Baking | Shortcrust Pastry | pie crust
Rice | Pasta & grains | Rice | white rice, long grain rice, risotto rice, arborio rice
Basmati rice | Pasta & grains | Basmati Rice |
Jasmine rice | Pasta & grains | Jasmine Rice |
Brown rice | Pasta & grains | Brown Rice |
Pasta | Pasta & grains | Penne Rigate | penne, fusilli, rigatoni, farfalle, macaroni, paccheri
Spaghetti | Pasta & grains | Spaghetti | linguine, tagliatelle, fettuccine, pappardelle
Lasagne sheets | Pasta & grains | Lasagne Sheets | lasagna sheets, lasagne
Noodles | Pasta & grains | Rice Noodles | rice noodles, egg noodles, udon noodles, ramen noodles, vermicelli
Couscous | Pasta & grains | Couscous | bulgur
Oats | Pasta & grains | Rolled Oats | rolled oats, oatmeal, porridge oats
Lentils | Pasta & grains | Lentils | red lentils, brown lentils, green lentils
Chickpeas | Pasta & grains | Chickpeas | garbanzo beans
Kidney beans | Pasta & grains | Kidney Beans | red kidney beans
Beans | Pasta & grains | Cannellini Beans | white beans, cannellini beans, haricot beans, butter beans, black beans, pinto beans
Baked beans | Pasta & grains | Baked Beans |
Bread | Bakery | Bread | white bread, sourdough, loaf
Baguette | Bakery | Baguette | french bread, crusty bread
Breadcrumbs | Bakery | Breadcrumbs | panko, bread crumbs
Tortillas | Bakery | Tortillas | flour tortillas, wraps, tortilla wraps, corn tortillas
Flatbread | Bakery | Naan Bread | flatbreads, pita, pitta, pita bread, lavash, naan, naan bread
Burger buns | Bakery | Bread | buns, bread rolls, rolls, brioche buns
Olive oil | Oils & sauces | Olive Oil | extra virgin olive oil, extra-virgin olive oil
Vegetable oil | Oils & sauces | Vegetable Oil | oil, sunflower oil, rapeseed oil, canola oil, frying oil
Sesame oil | Oils & sauces | Sesame Seed Oil | toasted sesame oil
Vinegar | Oils & sauces | Vinegar | white vinegar, white wine vinegar, red wine vinegar, apple cider vinegar
Balsamic vinegar | Oils & sauces | Balsamic Vinegar | balsamic
Soy sauce | Oils & sauces | Soy Sauce | dark soy sauce, light soy sauce, tamari
Fish sauce | Oils & sauces | Fish Sauce | thai fish sauce
Oyster sauce | Oils & sauces | Oyster Sauce |
Worcestershire sauce | Oils & sauces | Worcestershire Sauce |
Hot sauce | Oils & sauces | Hotsauce | sriracha, tabasco
Ketchup | Oils & sauces | Tomato Ketchup | tomato ketchup
Mustard | Oils & sauces | Mustard | dijon mustard, wholegrain mustard, english mustard
Mayonnaise | Oils & sauces | | mayo
BBQ sauce | Oils & sauces | Barbeque Sauce | barbecue sauce
Tomato paste | Oils & sauces | Tomato Puree | tomato puree, tomato purée
Canned tomatoes | Oils & sauces | Chopped Tomatoes | chopped tomatoes, diced tomatoes, tinned tomatoes, crushed tomatoes, passata, tomato sauce
Coconut milk | Oils & sauces | Coconut Milk | coconut cream
Curry paste | Oils & sauces | Thai Red Curry Paste | red curry paste, green curry paste
Tahini | Oils & sauces | Tahini |
Peanut butter | Oils & sauces | Peanut Butter |
Stock | Oils & sauces | Chicken Stock | chicken stock, beef stock, vegetable stock, broth, stock cube, bouillon
Capers | Oils & sauces | Capers |
Olives | Oils & sauces | Black Olives | black olives, green olives, kalamata olives
Jam | Oils & sauces | Raspberry Jam | apricot jam, strawberry jam
Almonds | Nuts & seeds | Almonds | flaked almonds, ground almonds
Walnuts | Nuts & seeds | Walnuts | walnut
Hazelnuts | Nuts & seeds | Hazlenuts | hazelnut
Cashews | Nuts & seeds | Cashew Nuts | cashew nuts
Peanuts | Nuts & seeds | Peanuts | roasted peanuts
Pine nuts | Nuts & seeds | Pine Nuts |
Pecans | Nuts & seeds | Pecan Nuts | pecan nuts
Sesame seeds | Nuts & seeds | Sesame Seed | sesame
Sunflower seeds | Nuts & seeds | | pumpkin seeds
Water | Drinks | Water | cold water, warm water, hot water, boiling water
White wine | Drinks | White Wine | dry white wine
Red wine | Drinks | Red Wine |
Beer | Drinks | Stout | stout, lager
Ice cream | Frozen | Ice Cream | vanilla ice cream
`

export const AISLES = [
  'Vegetables',
  'Fruit',
  'Herbs',
  'Meat',
  'Fish',
  'Dairy & eggs',
  'Bakery',
  'Pasta & grains',
  'Baking',
  'Spices',
  'Oils & sauces',
  'Nuts & seeds',
  'Frozen',
  'Drinks',
  'Other',
]

export const SEED_INGREDIENTS = LINES.trim()
  .split('\n')
  .map((line) => {
    const [name, aisle, image, other = ''] = line.split('|').map((s) => s.trim())
    return {
      name,
      aisle,
      image: image || null,
      aliases: other
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    }
  })
