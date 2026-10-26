// The starting ingredient catalog: one line per ingredient,
//   Name | aisle | picture | other names | counts as
// "picture" is the ingredient's name on TheMealDB (its small PNGs are the
// pictures in the app); empty means no picture. Other names are what recipes
// call the same thing; plurals are matched automatically. "Counts as" is the
// broader ingredient it is a kind of (penne → Pasta), so having pasta at home
// covers penne, while the shopping list keeps them apart.
// supabase/seed-ingredients.sql is generated from this file
// (npm run seed:ingredients), and the app uses it until the shared catalog loads.

import { BULGARIAN, BULGARIAN_ALIASES, SEARCH_ONLY } from './bulgarian.js'
import { CZECH_ALIASES, WORLD_LINES } from './worldIngredients.js'

const LINES = `
Beef | Meat | Beef | beef meat, stewing beef, beef chunks
Ground beef | Meat | Minced Beef | minced beef, beef mince, lean minced beef, lean ground beef, mince, ground meat, minced meat
Beef brisket | Meat | Beef Brisket | brisket
Beef fillet | Meat | Beef Fillet | beef tenderloin, fillet steak
Steak | Meat | Beef Fillet | sirloin, ribeye, rib eye, flank steak, rump steak
Beef shin | Meat | Beef Shin | shin of beef
Veal | Meat | Veal | veal cutlet
Pork | Meat | Pork | pork loin, pork chops
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
Duck | Meat | Duck | duck legs
Lamb | Meat | Lamb | lamb leg, lamb shoulder, lamb chops, lamb mince, ground lamb, mutton
Oxtail | Meat | Oxtail | ox tail
Beef kidney | Meat | Beef Kidney |
Lamb kidney | Meat | Lamb Kidney |
Chicken liver | Meat |  |
Pork ribs | Meat |  | spare ribs, baby back ribs, ribs
Pork tenderloin | Meat |  | pork fillet
Pork knuckle | Meat |  | ham hock, pork shank
Salami | Meat |  | pepperoni
Black pudding | Meat | Black Pudding | blood sausage
Doner meat | Meat | Doner Meat | kebab meat, gyros meat
Italian sausage | Meat | Italian Fennel Sausages | italian fennel sausages, salsiccia
Lukanka | Meat |  |
Kebapche | Meat |  | kebapcheta
Meatballs | Meat |  | kyufte, kofta
Rabbit | Meat |  |
Venison | Meat |  | deer
Goose | Meat |  |
Quail | Meat |  |
Salmon | Fish | Salmon | salmon fillet, salmon fillets, smoked salmon
Tuna | Fish | Tuna | canned tuna, tuna steak
White fish | Fish | White Fish Fillets | white fish fillets, hake, pollock, tilapia, sea bass
Mackerel | Fish | Mackerel | smoked mackerel
Prawns | Fish | King Prawns | shrimp, shrimps, king prawns, tiger prawns
Squid | Fish | Squid | calamari
Mussels | Fish | Mussels |
Cod | Fish | Cod | cod fillet | White fish
Salt cod | Fish | Salt Cod | bacalao
Haddock | Fish | Haddock |  | White fish
Smoked haddock | Fish | Smoked Haddock |
Monkfish | Fish | Monkfish |
Trout | Fish |  | rainbow trout, trout fillet
Sea bream | Fish |  | dorade, gilt-head bream
Sardines | Fish | Pilchards | pilchards
Anchovies | Fish |  | anchovy fillets
Herring | Fish |  |
Carp | Fish |  |
Oysters | Fish | Oysters |
Clams | Fish | Clams | vongole
Scallops | Fish |  |
Octopus | Fish |  |
Crab | Fish |  | crab meat
Lobster | Fish |  |
Surimi | Fish |  | crab sticks
Eggs | Dairy & eggs | Eggs | egg, large eggs, free-range eggs, quail eggs, duck eggs
Egg yolks | Dairy & eggs | Egg Yolks | egg yolk, yolks
Egg whites | Dairy & eggs | Egg White | egg white
Milk | Dairy & eggs | Milk | whole milk, semi-skimmed milk, skim milk, full cream milk, full-fat milk, fresh milk
Butter | Dairy & eggs | Butter | unsalted butter, salted butter, cold butter, melted butter
Cream | Dairy & eggs | Double Cream | cooking cream
Sour cream | Dairy & eggs | Sour Cream | soured cream
Greek yogurt | Dairy & eggs | Greek Yogurt | greek yoghurt
Yogurt | Dairy & eggs | Yogurt | yoghurt, plain yogurt, natural yogurt
Cream cheese | Dairy & eggs | Cream Cheese | philadelphia, soft cheese
Mascarpone | Dairy & eggs | Mascarpone |
Ricotta | Dairy & eggs | Ricotta |
Cheese | Dairy & eggs | Cheese | grated cheese, shredded cheese
Cheddar | Dairy & eggs | Cheddar Cheese | cheddar cheese
Mozzarella | Dairy & eggs | Mozzarella | mozzarella balls, fresh mozzarella
Parmesan | Dairy & eggs | Parmesan | parmigiano reggiano, parmigiano-reggiano, grana padano
Feta | Dairy & eggs | Feta | feta cheese, cubed feta
Goat cheese | Dairy & eggs | Goats Cheese | goats cheese, goat's cheese
Gouda | Dairy & eggs | Gouda Cheese | gouda cheese
Brie | Dairy & eggs | Brie |
Gruyère | Dairy & eggs | Gruyère | gruyere
Paneer | Dairy & eggs | Paneer |
Condensed milk | Dairy & eggs | Condensed Milk | sweetened condensed milk
Double cream | Dairy & eggs | Double Cream | heavy cream, whipping cream, heavy whipping cream | Cream
Single cream | Dairy & eggs | Single Cream | light cream, half and half, half-and-half | Cream
Crème fraîche | Dairy & eggs | Creme Fraiche | creme fraiche | Sour cream
Clotted cream | Dairy & eggs | Clotted Cream |  | Cream
Fromage frais | Dairy & eggs | Fromage Frais |
Cottage cheese | Dairy & eggs |  |
Buttermilk | Dairy & eggs |  |
Kefir | Dairy & eggs |  |
Ayran | Dairy & eggs |  |
Plant milk | Dairy & eggs | Soya Milk | soya milk, soy milk, oat milk, almond milk, nut milk, rice milk, cashew milk
Ghee | Dairy & eggs | Ghee | clarified butter
Vegan butter | Dairy & eggs | Vegan Butter | margarine
Kashkaval | Dairy & eggs |  | kaskaval
Halloumi | Dairy & eggs |  |
Pecorino | Dairy & eggs | Pecorino | pecorino romano | Parmesan
Stilton | Dairy & eggs | Stilton Cheese |  | Blue cheese
Emmental | Dairy & eggs |  | emmentaler, swiss cheese
Edam | Dairy & eggs |  |
Camembert | Dairy & eggs |  |
Monterey Jack | Dairy & eggs | Monterey Jack Cheese | monterey jack cheese, colby jack, pepper jack
Processed cheese | Dairy & eggs |  | cheese slices, american cheese, cheese spread
Burrata | Dairy & eggs |  |
Custard | Dairy & eggs | Custard |
Whipped cream | Dairy & eggs |  | squirty cream | Cream
Tofu | Dairy & eggs |  | firm tofu
Tempeh | Dairy & eggs |  |
Seitan | Dairy & eggs |  |
Hummus | Dairy & eggs |  | houmous
Onion | Vegetables | Onion | onions, yellow onion, white onion, brown onion, chopped onion
Red onion | Vegetables | Red Onions | red onions, purple onion
Spring onions | Vegetables | Spring Onions | spring onion, green onions, green onion, scallions
Shallots | Vegetables | Shallots | shallot
Leek | Vegetables | Leek | leeks
Garlic | Vegetables | Garlic | garlic cloves, garlic clove, cloves of garlic, minced garlic, garlic bulb
Ginger | Vegetables | Ginger | fresh ginger, ginger root
Potatoes | Vegetables | Potatoes | potato, floury potatoes, waxy potatoes
Sweet potatoes | Vegetables | Squash | sweet potato
Carrots | Vegetables | Carrots | carrot
Celery | Vegetables | Celery | celery stalks, celery sticks
Celeriac | Vegetables | Celeriac | celery root
Tomatoes | Vegetables | Tomatoes | tomato, fresh tomatoes, beef tomatoes
Cherry tomatoes | Vegetables | Cherry Tomatoes | grape tomatoes, baby plum tomatoes
Cucumber | Vegetables | Cucumber | cucumbers, grated cucumber
Bell pepper | Vegetables | Red Pepper | peppers, bell peppers, capsicum, paprika pepper
Chilli | Vegetables | Chilli | chili, chilli pepper, chili pepper, red chilli, green chilli, chillies, chilies
Courgette | Vegetables | Courgettes | zucchini, courgettes
Aubergine | Vegetables | Aubergine | eggplant, eggplants
Mushrooms | Vegetables | Mushrooms | mushroom, button mushrooms, champignons
Shiitake mushrooms | Vegetables | Shiitake Mushrooms | shiitake
Broccoli | Vegetables | Broccoli | broccoli florets
Cauliflower | Vegetables |  | cauliflower florets
Cabbage | Vegetables | Cabbage | white cabbage
Brussels sprouts | Vegetables | Brussels Sprouts |
Kale | Vegetables | Kale |
Spinach | Vegetables | Spinach | baby spinach, fresh spinach
Lettuce | Vegetables | Lettuce | little gem, salad leaves, mixed salad
Rocket | Vegetables | Rocket | arugula
Asparagus | Vegetables | Asparagus |
Green beans | Vegetables | Green Beans | string beans, french beans
Peas | Vegetables | Peas | green peas
Sugar snap peas | Vegetables | Sugar Snap Peas |
Sweetcorn | Vegetables | Sweetcorn | corn, sweet corn, corn kernels
Pumpkin | Vegetables | Pumpkin | hokkaido
Beetroot | Vegetables |  | beetroots, beets, beet
Radishes | Vegetables |  | radish
Fennel | Vegetables | Fennel | fennel bulb
Turnip | Vegetables | Turnips | turnips
Parsnip | Vegetables |  | parsnips
Vine tomatoes | Vegetables | Vine Tomatoes | tomatoes on the vine | Tomatoes
Plum tomatoes | Vegetables | Plum Tomatoes | roma tomatoes | Tomatoes
Sun-dried tomatoes | Vegetables | Sun-Dried Tomatoes | sundried tomatoes
Yellow pepper | Vegetables | Yellow Pepper | yellow bell pepper | Bell pepper
Green pepper | Vegetables | Green Pepper | green bell pepper | Bell pepper
Red pepper | Vegetables | Red Pepper | red bell pepper | Bell pepper
Kapia pepper | Vegetables |  | roasted peppers, roasted red peppers | Bell pepper
Jalapeño | Vegetables | Jalapeno | jalapeno | Chilli
Scotch bonnet | Vegetables | Scotch Bonnet | habanero | Chilli
Butternut squash | Vegetables | Butternut Squash | squash | Pumpkin
Swede | Vegetables | Swede | rutabaga | Turnip
Jerusalem artichokes | Vegetables | Jerusalem Artichokes | sunchokes
Artichokes | Vegetables |  | artichoke hearts
Okra | Vegetables |  |
Bok choy | Vegetables | Chinese Broccoli | pak choi, chinese broccoli
Chinese cabbage | Vegetables |  | napa cabbage | Cabbage
Red cabbage | Vegetables |  |  | Cabbage
Sauerkraut | Vegetables |  | pickled cabbage
Iceberg lettuce | Vegetables | Little Gem Lettuce | little gem lettuce, romaine, cos lettuce | Lettuce
Chestnut mushrooms | Vegetables | Chestnut Mushroom | cremini, baby bella | Mushrooms
Wild mushrooms | Vegetables | Wild Mushrooms | chanterelles, mixed mushrooms | Mushrooms
Oyster mushrooms | Vegetables |  |  | Mushrooms
Corn on the cob | Vegetables |  | corn cob
Creamed corn | Vegetables | Creamed Corn |
Watercress | Vegetables |  | cress
Bean sprouts | Vegetables |  | mung bean sprouts
Horseradish | Vegetables | Horseradish |
Baby potatoes | Vegetables | Small Potatoes | small potatoes, new potatoes, charlotte potatoes | Potatoes
Vine leaves | Vegetables | Vine Leaves | grape leaves
Avocado | Fruit | Avocado | avocados
Lemon | Fruit | Lemon | lemons
Lemon juice | Fruit | Lemon Juice | juice of a lemon, juice of 1 lemon
Lemon zest | Fruit | Lemon Zest | lemon peel, grated lemon zest
Lime | Fruit | Lime | limes
Orange | Fruit | Orange | oranges
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
Raisins | Fruit | Raisins | currants
Dates | Fruit | Medjool Dates | medjool dates
Coconut | Fruit | Desiccated Coconut | desiccated coconut, shredded coconut, coconut flakes
Mango | Fruit |  |
Pineapple | Fruit |  |
Kiwi | Fruit |  | kiwi fruit
Grapes | Fruit |  |
Watermelon | Fruit |  |
Melon | Fruit |  | cantaloupe, honeydew
Plums | Fruit |  |
Figs | Fruit |  | dried figs
Pomegranate | Fruit |  | pomegranate seeds
Grapefruit | Fruit |  |
Mandarins | Fruit |  | clementines, tangerines
Passion fruit | Fruit |  |
Quince | Fruit |  |
Rhubarb | Fruit |  |
Cranberries | Fruit |  | dried cranberries
Redcurrants | Fruit | Redcurrants | blackcurrants
Sultanas | Fruit | Sultanas | golden raisins | Raisins
Dried fruit | Fruit | Dried Fruit | mixed dried fruit, fruit mix, mixed peel
Prunes | Fruit |  | dried plums
Glacé cherries | Fruit | Glace Cherry | glace cherries
Sour cherries | Fruit |  | morello cherries
Orange zest | Fruit | Orange Zest | orange peel | Orange
Lime juice | Fruit | Lime | lime zest | Lime
Ackee | Fruit | Ackee |
Tamarind | Fruit | Tamarind Ball |
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
Bouquet garni | Herbs | Bouquet Garni |
Savory | Herbs |  | summer savory, chubritsa
Lemongrass | Herbs |  | lemon grass
Kaffir lime leaves | Herbs |  | lime leaves
Curry leaves | Herbs |  |
Lovage | Herbs |  | devesil
Salt | Spices | Salt | table salt
Black pepper | Spices | Black Pepper | pepper, ground pepper, ground black pepper
Salt and pepper | Spices | Salt | salt & pepper
Paprika | Spices | Paprika | sweet paprika, ground paprika
Smoked paprika | Spices | Smoked Paprika |
Chilli powder | Spices | Chilli Powder | chili powder
Cumin | Spices | Cumin | ground cumin
Coriander seeds | Spices | Coriander Seeds | ground coriander
Turmeric | Spices | Turmeric | ground turmeric
Curry powder | Spices | Curry Powder | curry
Garam masala | Spices | Garam Masala |
Cinnamon | Spices | Cinnamon | ground cinnamon
Nutmeg | Spices | Nutmeg | ground nutmeg
Cloves | Spices | Cloves | ground cloves
Cardamom | Spices | Cardamom | cardamom pods
Star anise | Spices | Star Anise |
Caraway seeds | Spices |  | caraway
Garlic powder | Spices | Garlic Powder | dried garlic, granulated garlic
Garlic salt | Spices |  |
Lemon pepper | Spices |  | lemon pepper seasoning
Onion powder | Spices | Onion Salt | dried onion
Ground ginger | Spices | Ground Ginger |
Italian seasoning | Spices | Italian Seasoning | mixed herbs, herbes de provence
Mustard seeds | Spices | Mustard Seeds |
Mustard powder | Spices | Mustard Powder | dry mustard
Cayenne pepper | Spices | Cayenne Pepper | cayenne | Chilli powder
Chilli flakes | Spices | Red Chilli Flakes | red pepper flakes, crushed chilli, red chilli flakes, chili flakes, chilli flakes, crushed red pepper, crushed red pepper flakes | Chilli powder
Cumin seeds | Spices | Cumin Seeds |  | Cumin
Fennel seeds | Spices | Fennel Seeds |
Fenugreek | Spices | Fenugreek | sominka
Saffron | Spices | Saffron |
Allspice | Spices |  | pimento
White pepper | Spices |  |
Pink peppercorns | Spices |  |
Celery salt | Spices | Celery Salt |
Onion salt | Spices | Onion Salt |
Sea salt | Spices | Sea Salt | sea salt flakes, flaky salt, kosher salt | Salt
Cajun seasoning | Spices | Cajun | cajun
Fajita seasoning | Spices | Fajita Seasoning | taco seasoning
Biryani masala | Spices | Biryani Masala |
Chinese five spice | Spices |  | five spice
Za'atar | Spices |  | zaatar
Sumac | Spices |  |
Jerk seasoning | Spices | Jerk | jerk
Sharena sol | Spices |  | colourful salt, sharena salt
Cinnamon sticks | Spices | Cinnamon Stick |  | Cinnamon
Vanilla | Baking | Vanilla Extract | vanilla extract, vanilla essence
Flour | Baking | Flour | wheat flour
Self-raising flour | Baking | Self-raising Flour | self rising flour
Wholemeal flour | Baking | Whole Wheat | whole wheat flour
Cornstarch | Baking | Cornstarch | cornflour, corn flour, corn starch
Sugar | Baking | Sugar | white sugar, granulated sugar
Brown sugar | Baking | Brown Sugar | light brown sugar, cane sugar, demerara, demerara sugar
Icing sugar | Baking | Icing Sugar | powdered sugar, confectioners sugar
Honey | Baking | Honey |
Maple syrup | Baking | Maple Syrup |
Baking powder | Baking | Baking Powder |
Baking soda | Baking | Bicarbonate Of Soda | bicarbonate of soda, bicarb
Yeast | Baking | Yeast | dried yeast, fresh yeast, instant yeast
Cocoa | Baking | Cocoa | cocoa powder, cacao
Dark chocolate | Baking | Dark Chocolate | chocolate, plain chocolate, dark chocolate chips
Milk chocolate | Baking | Milk Chocolate |
White chocolate | Baking | White Chocolate | white chocolate chips
Gelatine | Baking | Gelatine Leafs | gelatin
Puff pastry | Baking | Puff Pastry |
Shortcrust pastry | Baking | Shortcrust Pastry | pie crust
Golden syrup | Baking | Golden Syrup | light corn syrup, corn syrup, glucose syrup
Treacle | Baking | Black Treacle | black treacle, molasses
Agave syrup | Baking |  | agave
Caster sugar | Baking | Caster Sugar | superfine sugar | Sugar
Muscovado sugar | Baking | Muscovado Sugar | dark brown sugar, demerara sugar | Brown sugar
Coconut sugar | Baking | Coco Sugar | coco sugar
Vanilla sugar | Baking |  |
Sweetener | Baking |  | stevia, erythritol
Plain flour | Baking | Plain Flour | all-purpose flour, all purpose flour, white flour | Flour
Bread flour | Baking | White Flour | strong flour, strong white flour | Flour
Cornmeal | Baking |  | maize flour, corn meal
Rye flour | Baking |  |
Spelt flour | Baking |  |
Almond flour | Baking | Ground Almonds | ground almonds, almond meal | Almonds
Potato starch | Baking | Potato Starch |
Cream of tartar | Baking |  | tartaric acid
Chickpea flour | Baking |  | gram flour, besan, garbanzo flour
Semolina | Baking |  | cream of wheat, farina, semolina flour, durum semolina
Custard powder | Baking | Custard Powder | pudding powder
Chocolate chips | Baking | Chocolate Chips |
Cocoa nibs | Baking | Cacao | raw cacao
Sprinkles | Baking |  | hundreds and thousands
Food colouring | Baking | Red Food Colouring | food coloring
Marzipan | Baking | Marzipan | almond paste
Marshmallows | Baking | Miniature Marshmallows | mini marshmallows
Caramel | Baking | Caramel | caramel sauce, dulce de leche
Meringue | Baking | Meringue Nests | meringue nests
Filo pastry | Baking |  | phyllo, filo
Pizza dough | Baking |  |
Vanilla pod | Baking |  | vanilla bean | Vanilla
Gelatine leaves | Baking | Gelatine Leafs | gelatin sheets | Gelatine
Rice | Pasta & grains | Rice | white rice, long grain rice
Basmati rice | Pasta & grains | Basmati Rice |
Jasmine rice | Pasta & grains | Jasmine Rice |
Brown rice | Pasta & grains | Brown Rice |
Pasta | Pasta & grains | Penne Rigate |
Spaghetti | Pasta & grains | Spaghetti |
Lasagne sheets | Pasta & grains | Lasagne Sheets | lasagna sheets, lasagne
Noodles | Pasta & grains | Rice Noodles | ramen noodles
Couscous | Pasta & grains | Couscous |
Oats | Pasta & grains | Rolled Oats | rolled oats, oatmeal, porridge oats
Lentils | Pasta & grains | Lentils |
Chickpeas | Pasta & grains | Chickpeas | garbanzo beans
Kidney beans | Pasta & grains | Kidney Beans | red kidney beans
Beans | Pasta & grains | Cannellini Beans |
Baked beans | Pasta & grains | Baked Beans |
Penne | Pasta & grains | Penne Rigate | penne rigate | Pasta
Farfalle | Pasta & grains | Farfalle | bowtie pasta | Pasta
Fusilli | Pasta & grains |  |  | Pasta
Macaroni | Pasta & grains | Macaroni | elbow macaroni | Pasta
Rigatoni | Pasta & grains | Rigatoni |  | Pasta
Tagliatelle | Pasta & grains | Tagliatelle |  | Pasta
Fettuccine | Pasta & grains | Fettuccine |  | Pasta
Linguine | Pasta & grains | Linguine Pasta |  | Pasta
Pappardelle | Pasta & grains | Pappardelle Pasta |  | Pasta
Paccheri | Pasta & grains | Paccheri Pasta |  | Pasta
Orzo | Pasta & grains |  | risoni | Pasta
Vermicelli | Pasta & grains | Vermicelli Pasta | fideo | Pasta
Gnocchi | Pasta & grains |  |
Tortellini | Pasta & grains |  | ravioli
Udon noodles | Pasta & grains | Udon Noodles | udon | Noodles
Rice noodles | Pasta & grains | Rice Noodles | rice stick noodles, rice vermicelli | Noodles
Egg noodles | Pasta & grains |  |  | Noodles
Risotto rice | Pasta & grains |  | arborio rice, arborio | Rice
Paella rice | Pasta & grains | Paella Rice |  | Rice
Sushi rice | Pasta & grains |  |  | Rice
Wild rice | Pasta & grains |  |  | Rice
Bulgur | Pasta & grains | Khus Khus | bulgur wheat
Quinoa | Pasta & grains |  |
Pearl barley | Pasta & grains |  | barley
Buckwheat | Pasta & grains |  |
Millet | Pasta & grains |  |
Polenta | Pasta & grains |  |
Granola | Pasta & grains | Mixed Grain | muesli, cereal
Red lentils | Pasta & grains | Green Red Lentils |  | Lentils
Brown lentils | Pasta & grains | Brown Lentils | green lentils, puy lentils, french lentils | Lentils
Toor dal | Pasta & grains | Toor Dal | dal, split peas
Cannellini beans | Pasta & grains | Cannellini Beans | white beans | Beans
Butter beans | Pasta & grains | Butter Beans | lima beans | Beans
Black beans | Pasta & grains |  |  | Beans
Pinto beans | Pasta & grains | Pinto Beans |  | Beans
Borlotti beans | Pasta & grains | Borlotti Beans |  | Beans
Haricot beans | Pasta & grains | Haricot Beans | navy beans | Beans
Refried beans | Pasta & grains | Refried Beans |
Bread | Bakery | Bread | white bread, loaf
Baguette | Bakery | Baguette | french bread
Breadcrumbs | Bakery | Breadcrumbs | panko, bread crumbs
Tortillas | Bakery | Tortillas | flour tortillas, wraps, tortilla wraps
Flatbread | Bakery | Naan Bread | flatbreads, lavash
Burger buns | Bakery | Bread | buns, brioche buns, hot dog buns, hot dog rolls
Digestive biscuits | Bakery | Digestive Biscuits | graham crackers, biscuits
Ladyfingers | Bakery |  | savoiardi, sponge fingers
Crusty bread | Bakery | Crusty Bread | sourdough, sourdough bread | Bread
Wholegrain bread | Bakery | Wholegrain Bread | wholemeal bread, brown bread | Bread
Toast bread | Bakery |  | sandwich bread, sliced bread, toast | Bread
Naan | Bakery | Naan Bread | naan bread | Flatbread
Pita | Bakery |  | pitta, pita bread | Flatbread
Brioche | Bakery |  |
Croissants | Bakery |  |
Taco shells | Bakery | Hard Taco Shells | hard taco shells
Corn tortillas | Bakery | Corn Tortillas |  | Tortillas
Crackers | Bakery |  |
Pretzels | Bakery | Pretzels |
Croutons | Bakery |  |
Rusks | Bakery |  |
Olive oil | Oils & sauces | Olive Oil | extra virgin olive oil, extra-virgin olive oil
Vegetable oil | Oils & sauces | Vegetable Oil | oil, frying oil
Sesame oil | Oils & sauces | Sesame Seed Oil | toasted sesame oil
Vinegar | Oils & sauces | Vinegar | white wine vinegar
Balsamic vinegar | Oils & sauces | Balsamic Vinegar | balsamic
Soy sauce | Oils & sauces | Soy Sauce | tamari
Fish sauce | Oils & sauces | Fish Sauce | thai fish sauce
Oyster sauce | Oils & sauces | Oyster Sauce |
Worcestershire sauce | Oils & sauces | Worcestershire Sauce |
Hot sauce | Oils & sauces | Hotsauce |
Ketchup | Oils & sauces | Tomato Ketchup | tomato ketchup
Mustard | Oils & sauces | Mustard |
Mayonnaise | Oils & sauces |  | mayo
BBQ sauce | Oils & sauces | Barbeque Sauce | barbecue sauce
Tomato paste | Oils & sauces | Tomato Puree | tomato puree, tomato purée
Canned tomatoes | Oils & sauces | Chopped Tomatoes | chopped tomatoes, diced tomatoes, tinned tomatoes, crushed tomatoes
Coconut milk | Oils & sauces | Coconut Milk |
Curry paste | Oils & sauces | Thai Red Curry Paste | red curry paste
Tahini | Oils & sauces | Tahini |
Peanut butter | Oils & sauces | Peanut Butter |
Nut butter | Oils & sauces |  | almond butter, cashew butter, hazelnut butter, nut butter
Condensed soup | Oils & sauces |  | cream of mushroom soup, cream of chicken soup, cream of celery soup, condensed mushroom soup
Stock | Oils & sauces | Chicken Stock | broth, bouillon
Capers | Oils & sauces | Capers |
Olives | Oils & sauces | Black Olives | black olives, kalamata olives
Jam | Oils & sauces | Raspberry Jam | strawberry jam
Fish stock | Oils & sauces | Fish Stock | fish broth
Garlic paste | Oils & sauces | Ginger Garlic Paste | ginger garlic paste
Ginger paste | Oils & sauces | Ginger Paste |
Green olives | Oils & sauces | Green Olives |  | Olives
Pickles | Oils & sauces |  | gherkins, cornichons, pickled cucumbers
Lyutenitsa | Oils & sauces |  | lutenitsa, ljutenica
Ajvar | Oils & sauces |  |
Pesto | Oils & sauces |  | basil pesto
Passata | Oils & sauces | Passata | tomato passata, sieved tomatoes
Tomato sauce | Oils & sauces | Tomato Sauce | pasta sauce, marinara
Salsa | Oils & sauces | Salsa | green salsa
Enchilada sauce | Oils & sauces | Enchilada Sauce |
Garlic sauce | Oils & sauces | Garlic Sauce | toum
Sweet chilli sauce | Oils & sauces |  | sweet chili sauce
Sriracha | Oils & sauces |  |  | Hot sauce
Teriyaki sauce | Oils & sauces |  | teriyaki
Hoisin sauce | Oils & sauces |  | hoisin
Dark soy sauce | Oils & sauces | Dark Soy Sauce |  | Soy sauce
Mirin | Oils & sauces | Mirin | mirim
Rice vinegar | Oils & sauces |  | rice wine vinegar | Vinegar
Apple cider vinegar | Oils & sauces | Apple Cider Vinegar | cider vinegar | Vinegar
Red wine vinegar | Oils & sauces | Red Wine Vinegar |  | Vinegar
White vinegar | Oils & sauces | White Vinegar | distilled vinegar | Vinegar
Dijon mustard | Oils & sauces | Dijon Mustard |  | Mustard
Wholegrain mustard | Oils & sauces | English Mustard | english mustard, grainy mustard | Mustard
Horseradish sauce | Oils & sauces |  |
Tartar sauce | Oils & sauces |  | tartare sauce
Salad dressing | Oils & sauces | Vinaigrette Dressing | vinaigrette, caesar dressing
Tabasco | Oils & sauces | Tabasco Sauce | tabasco sauce | Hot sauce
Harissa | Oils & sauces | Harissa Spice | harissa paste
Tamarind paste | Oils & sauces | Tamarind Paste |
Thai green curry paste | Oils & sauces | Thai Green Curry Paste | green curry paste | Curry paste
Massaman curry paste | Oils & sauces | Massaman Curry Paste |  | Curry paste
Madras paste | Oils & sauces | Madras Paste |  | Curry paste
Miso | Oils & sauces |  | miso paste, white miso, shiro miso
Gochujang | Oils & sauces |  |
Coconut cream | Oils & sauces | Coconut Cream |
Gravy | Oils & sauces | Beef Gravy | beef gravy
Beef stock | Oils & sauces | Beef Stock | beef broth | Stock
Chicken stock | Oils & sauces | Chicken Stock | chicken broth | Stock
Vegetable stock | Oils & sauces | Vegetable Stock | vegetable broth | Stock
Stock cubes | Oils & sauces | Chicken Stock Cube | bouillon cube, vegetable stock cube, chicken stock cube | Stock
Sunflower oil | Oils & sauces | Sunflower Oil |  | Vegetable oil
Rapeseed oil | Oils & sauces | Rapeseed Oil | canola oil | Vegetable oil
Peanut oil | Oils & sauces | Peanut Oil | groundnut oil
Coconut oil | Oils & sauces |  |
Truffle oil | Oils & sauces | Truffle Oil |
Lard | Oils & sauces | Lard | pork lard, shortening, vegetable shortening
Duck fat | Oils & sauces | Duck Fat | goose fat
Suet | Oils & sauces | Suet |
Cooking spray | Oils & sauces |  | oil spray
Almonds | Nuts & seeds | Almonds |
Walnuts | Nuts & seeds | Walnuts | walnut
Hazelnuts | Nuts & seeds | Hazlenuts | hazelnut
Cashews | Nuts & seeds | Cashew Nuts | cashew nuts
Peanuts | Nuts & seeds | Peanuts | roasted peanuts
Pine nuts | Nuts & seeds | Pine Nuts |
Pecans | Nuts & seeds | Pecan Nuts | pecan nuts
Sesame seeds | Nuts & seeds | Sesame Seed | sesame
Sunflower seeds | Nuts & seeds |  |
Chestnuts | Nuts & seeds | Chestnuts |
Flaked almonds | Nuts & seeds | Flaked Almonds | sliced almonds | Almonds
Pistachios | Nuts & seeds |  |
Macadamia nuts | Nuts & seeds |  |
Brazil nuts | Nuts & seeds |  |
Pumpkin seeds | Nuts & seeds |  | pepitas
Chia seeds | Nuts & seeds |  | chia
Flax seeds | Nuts & seeds | Flax Eggs | linseed, flaxseed
Poppy seeds | Nuts & seeds |  |
Water | Drinks | Water | cold water, warm water, hot water, boiling water
White wine | Drinks | White Wine | dry white wine
Red wine | Drinks | Red Wine |
Beer | Drinks | Stout | stout, lager
Sake | Drinks | Sake |
Orange juice | Drinks |  |
Apple juice | Drinks |  |
Brandy | Drinks | Brandy | cognac
Rum | Drinks |  |
Vodka | Drinks |  |
Rakia | Drinks |  |
Port | Drinks |  |
Sparkling water | Drinks |  | soda water, club soda
Coffee | Drinks |  | espresso, instant coffee
Tea | Drinks |  |
Ginger cordial | Drinks | Ginger Cordial |
Cola | Drinks |  |
Ginger ale | Drinks |  | ginger beer
Ice cream | Frozen | Ice Cream | vanilla ice cream
Frozen peas | Frozen | Frozen Peas |  | Peas
Stir-fry vegetables | Frozen | Stir-fry Vegetables | wok vegetables
Mixed vegetables | Frozen | Roasted Vegetables | frozen vegetables, roasted vegetables
Frozen berries | Frozen |  | mixed berries
Chips | Frozen | Fries | fries, french fries
Edamame | Frozen |  | soy beans
Ice cubes | Frozen |  | ice
Frozen pastry | Frozen |  |
Spring rolls | Frozen | Egg Rolls | egg rolls
Apricot jam | Oils & sauces | Apricot Jam |  | Jam
Raspberry jam | Oils & sauces | Raspberry Jam | | Jam
Nutella | Other |  | chocolate spread, hazelnut spread
Popcorn | Other | Toffee Popcorn |
Crisps | Other |  | potato chips, tortilla chips, nachos
Peanut brittle | Other | Peanut Brittle |
Cookies | Other | Peanut Cookies | peanut cookies
Christmas pudding | Other | Christmas Pudding |
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

const words = (list) =>
  list
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

/** Extra names by catalog name, from "Name | word, word" lines. */
const aliasLines = (text) =>
  new Map(
    text
      .trim()
      .split('\n')
      .map((line) => line.split('|').map((s) => s.trim()))
      .map(([name, list = '']) => [name.toLowerCase(), words(list)]),
  )
export const EXTRA_ALIASES = aliasLines(CZECH_ALIASES)
for (const [name, bg] of BULGARIAN) if (bg && !SEARCH_ONLY.has(name)) EXTRA_ALIASES.set(name, [...(EXTRA_ALIASES.get(name) ?? []), bg.toLowerCase()])
for (const [name, list] of aliasLines(BULGARIAN_ALIASES)) EXTRA_ALIASES.set(name, [...(EXTRA_ALIASES.get(name) ?? []), ...list])

export const SEED_INGREDIENTS = `${LINES.trim()}\n${WORLD_LINES.trim()}`
  .split('\n')
  .map((line) => {
    const [name, aisle, image, other = '', base = ''] = line.split('|').map((s) => s.trim())
    const aliases = [...words(other), ...(EXTRA_ALIASES.get(name.toLowerCase()) ?? [])]
    return {
      name,
      aisle,
      image: image || null,
      base: base || null,
      aliases: [...new Set(aliases)].filter((a) => a !== name.toLowerCase()),
    }
  })
