// Calories for the ingredient catalog, one line per ingredient:
//   Name | kcal per 100 g | grams per piece | grams per ml
// Values are typical raw (as bought) figures from public food tables
// (USDA FoodData Central, the Czech and Bulgarian food tables), rounded.
// "Grams per piece" turns "2 eggs" or "3 cloves" into grams (for garlic it
// is one clove, for bread one slice, for a pack the usual pack). "Grams per
// ml" turns spoons and cups into grams for things lighter or heavier than
// water (flour, oil, honey); empty means 1. Your own ingredients get their
// own values in the app, and fall back to these through "counts as".

export const NUTRITION_LINES = `
Beef|250||
Ground beef|250||
Beef brisket|250||
Beef fillet|180||
Steak|200|250|
Beef shin|150||
Veal|150||
Pork|240||
Ground pork|260||
Bacon|420|20|
Ham|145|15|
Prosciutto|270|12|
Sausages|300|75|
Chorizo|455||
Chicken|215|1500|
Chicken breast|120|170|
Chicken thighs|180|120|
Ground chicken|145||
Turkey|135||
Duck|340||
Lamb|280||
Oxtail|260||
Beef kidney|100||
Lamb kidney|95||
Chicken liver|120||
Pork ribs|280||
Pork tenderloin|120|400|
Pork knuckle|230|1000|
Salami|410|8|
Black pudding|300||
Doner meat|260||
Italian sausage|320|90|
Lukanka|440||
Kebapche|260|60|
Meatballs|250|30|
Rabbit|135||
Venison|120||
Goose|370||
Quail|190|100|
Salmon|200|150|
Tuna|130|150|
White fish|85|150|
Mackerel|205|300|
Prawns|85|15|
Squid|90||
Mussels|85|10|
Cod|80|150|
Salt cod|290||
Haddock|80|150|
Smoked haddock|100|150|
Monkfish|75|150|
Trout|140|300|
Sea bream|125|350|
Sardines|210|40|
Anchovies|210|4|
Herring|160|150|
Carp|125||
Oysters|70|15|
Clams|75|10|
Scallops|70|20|
Octopus|80||
Crab|85||
Lobster|90||
Surimi|100|15|
Eggs|143|50|1.03
Egg yolks|320|17|1.03
Egg whites|52|33|1.03
Milk|60||1.03
Butter|720|250|0.96
Cream|300||1
Sour cream|200||1.05
Greek yogurt|120||1.05
Yogurt|65||1.05
Cream cheese|340||1
Mascarpone|430||1
Ricotta|175||1
Cheese|380||0.45
Cheddar|405||0.45
Mozzarella|255|125|
Parmesan|420||0.4
Feta|265||
Goat cheese|365||
Gouda|360||0.45
Brie|335||
Gruyère|410||0.45
Paneer|300||
Condensed milk|320||1.3
Double cream|450||1
Single cream|190||1
Crème fraîche|300||1
Clotted cream|590||1
Fromage frais|110||1
Cottage cheese|100||1
Buttermilk|40||1.03
Kefir|55||1.03
Ayran|35||1.03
Plant milk|40||1.03
Ghee|880||0.91
Vegan butter|540||0.96
Kashkaval|360||0.45
Halloumi|320||
Pecorino|390||0.4
Stilton|410||
Emmental|380||0.45
Edam|350||0.45
Camembert|300|250|
Monterey Jack|375||0.45
Processed cheese|300|20|
Burrata|300|125|
Custard|120||1.05
Whipped cream|260||0.5
Tofu|120||
Tempeh|195||
Seitan|370||
Hummus|175||1
Onion|40|110|
Red onion|40|110|
Spring onions|32|15|
Shallots|72|30|
Leek|61|200|
Garlic|149|5|
Ginger|80|15|
Potatoes|77|170|
Sweet potatoes|86|200|
Carrots|41|60|
Celery|16|40|
Celeriac|42|500|
Tomatoes|18|120|
Cherry tomatoes|18|15|
Cucumber|15|300|
Bell pepper|26|150|
Chilli|40|15|
Courgette|17|200|
Aubergine|25|300|
Mushrooms|22|20|0.4
Shiitake mushrooms|34|15|
Broccoli|34|350|
Cauliflower|25|600|
Cabbage|25|1000|
Brussels sprouts|43|10|
Kale|49||
Spinach|23||0.3
Lettuce|15|300|
Rocket|25||
Asparagus|20|20|
Green beans|31||
Peas|81||0.6
Sugar snap peas|42||
Sweetcorn|86||0.65
Pumpkin|26||
Beetroot|43|150|
Radishes|16|10|
Fennel|31|250|
Turnip|28|150|
Parsnip|75|150|
Vine tomatoes|18|100|
Plum tomatoes|18|70|
Sun-dried tomatoes|260|5|
Yellow pepper|27|150|
Green pepper|20|150|
Red pepper|31|150|
Kapia pepper|31|120|
Jalapeño|29|15|
Scotch bonnet|40|10|
Butternut squash|45|1000|
Swede|37|500|
Jerusalem artichokes|73|40|
Artichokes|47|130|
Okra|33|12|
Bok choy|13|150|
Chinese cabbage|16|1000|
Red cabbage|31|1000|
Sauerkraut|19||
Iceberg lettuce|14|500|
Chestnut mushrooms|22|15|
Wild mushrooms|30||
Oyster mushrooms|33||
Corn on the cob|86|200|
Creamed corn|72||
Watercress|11||
Bean sprouts|30||
Horseradish|48||
Baby potatoes|70|40|
Vine leaves|93|3|
Avocado|160|150|
Lemon|29|100|
Lemon juice|22||1
Lemon zest|47|3|0.4
Lime|30|60|
Orange|47|150|
Apples|52|180|
Pears|57|180|
Banana|89|120|
Strawberries|32|12|0.6
Raspberries|52||0.5
Blueberries|57||0.6
Blackberries|43||0.6
Cherries|63|7|
Peaches|39|150|
Apricots|48|35|
Dried apricots|240|8|
Raisins|300||0.65
Dates|280|8|
Coconut|355||0.35
Mango|60|300|
Pineapple|50|1000|
Kiwi|61|75|
Grapes|69|5|
Watermelon|30||
Melon|34||
Plums|46|50|
Figs|74|50|
Pomegranate|83|250|
Grapefruit|42|250|
Mandarins|53|80|
Passion fruit|97|20|
Quince|57|200|
Rhubarb|21||
Cranberries|46||
Redcurrants|56||
Sultanas|300||0.65
Dried fruit|280||0.65
Prunes|240|8|
Glacé cherries|300|5|
Sour cherries|50||
Orange zest|97|3|0.4
Lime juice|25||1
Ackee|150||
Tamarind|240||
Parsley|36||0.15
Basil|23||0.1
Coriander|23||0.1
Dill|43||0.1
Mint|44||0.1
Chives|30||0.1
Thyme|100||0.3
Rosemary|130||0.3
Oregano|265||0.3
Sage|315||0.3
Tarragon|295||0.3
Marjoram|270||0.3
Bay leaves|313|0.2|
Bouquet garni|50|5|
Savory|270||0.3
Lemongrass|99|20|
Kaffir lime leaves|50|0.3|
Curry leaves|108|0.1|
Lovage|40||0.1
Salt|0||1.2
Black pepper|250||0.5
Salt and pepper|0||1.2
Paprika|280||0.45
Smoked paprika|280||0.45
Chilli powder|280||0.5
Cumin|375||0.45
Coriander seeds|300||0.4
Turmeric|310||0.6
Curry powder|325||0.45
Garam masala|380||0.45
Cinnamon|250||0.55
Nutmeg|525||0.5
Cloves|275|0.1|0.45
Cardamom|310|0.2|0.45
Star anise|340|1|
Caraway seeds|335||0.45
Garlic powder|330||0.65
Onion powder|340||0.5
Ground ginger|335||0.4
Italian seasoning|265||0.25
Mustard seeds|510||0.65
Mustard powder|510||0.45
Cayenne pepper|320||0.5
Chilli flakes|320||0.35
Cumin seeds|375||0.45
Fennel seeds|345||0.4
Fenugreek|325||0.75
Saffron|310||0.15
Allspice|265||0.5
White pepper|300||0.55
Pink peppercorns|300||0.4
Celery salt|20||1.2
Onion salt|30||1.2
Sea salt|0||1
Cajun seasoning|280||0.5
Fajita seasoning|280||0.5
Biryani masala|350||0.45
Chinese five spice|350||0.45
Za'atar|290||0.4
Sumac|240||0.5
Jerk seasoning|280||0.5
Sharena sol|200||0.6
Cinnamon sticks|250|3|
Vanilla|290||1
Flour|364||0.53
Self-raising flour|350||0.53
Wholemeal flour|340||0.5
Cornstarch|380||0.55
Sugar|400||0.85
Brown sugar|380||0.9
Icing sugar|400||0.5
Honey|305||1.42
Maple syrup|260||1.32
Baking powder|55|12|0.9
Baking soda|0||1.1
Yeast|105|7|0.6
Cocoa|230||0.45
Dark chocolate|550||0.6
Milk chocolate|535||0.6
White chocolate|540||0.6
Gelatine|335|10|0.7
Puff pastry|550|275|
Shortcrust pastry|500|320|
Golden syrup|325||1.4
Treacle|290||1.4
Agave syrup|310||1.35
Caster sugar|400||0.85
Muscovado sugar|380||0.9
Coconut sugar|375||0.75
Vanilla sugar|400|8|0.85
Sweetener|0||0.5
Plain flour|364||0.53
Bread flour|360||0.55
Cornmeal|365||0.65
Rye flour|325||0.45
Spelt flour|340||0.5
Almond flour|570||0.4
Potato starch|330||0.65
Semolina|360||0.7
Custard powder|360|40|0.6
Chocolate chips|500||0.7
Cocoa nibs|600||0.5
Sprinkles|400||0.8
Food colouring|0||1
Marzipan|450||
Marshmallows|320|7|0.2
Caramel|380||1.2
Meringue|390|10|
Filo pastry|300|250|
Pizza dough|260|250|
Vanilla pod|290|3|
Gelatine leaves|335|2|
Rice|360||0.8
Basmati rice|355||0.8
Jasmine rice|360||0.8
Brown rice|360||0.8
Pasta|355|500|0.45
Spaghetti|355|500|
Lasagne sheets|355|20|
Noodles|360|60|
Couscous|365||0.75
Oats|380||0.4
Lentils|350||0.8
Chickpeas|130|240|0.65
Kidney beans|120|240|0.7
Beans|120|240|0.7
Baked beans|85|415|1.05
Penne|355||0.45
Farfalle|355||0.4
Fusilli|355||0.4
Macaroni|355||0.5
Rigatoni|355||0.35
Tagliatelle|365|25|
Fettuccine|365|25|
Linguine|355||
Pappardelle|365|25|
Paccheri|355||0.35
Orzo|355||0.85
Vermicelli|355||
Gnocchi|155||
Tortellini|300||0.5
Udon noodles|130|200|
Rice noodles|360|100|
Egg noodles|380|60|
Risotto rice|350||0.85
Paella rice|350||0.85
Sushi rice|360||0.85
Wild rice|355||0.7
Bulgur|340||0.75
Quinoa|370||0.75
Pearl barley|350||0.8
Buckwheat|345||0.75
Millet|375||0.8
Polenta|365||0.65
Granola|470||0.45
Red lentils|345||0.8
Brown lentils|350||0.8
Toor dal|345||0.8
Cannellini beans|110|240|0.7
Butter beans|105|240|0.7
Black beans|130|240|0.7
Pinto beans|140|240|0.7
Borlotti beans|130|240|0.7
Haricot beans|130|240|0.7
Refried beans|90||1
Bread|265|30|
Baguette|275|250|
Breadcrumbs|395||0.45
Tortillas|310|45|
Flatbread|290|80|
Burger buns|280|60|
Digestive biscuits|480|15|
Ladyfingers|390|6|
Crusty bread|260|40|
Wholegrain bread|250|35|
Toast bread|265|25|
Naan|290|90|
Pita|275|60|
Brioche|370|50|
Croissants|405|60|
Taco shells|470|13|
Corn tortillas|220|25|
Crackers|440|5|
Pretzels|380|30|
Croutons|410||0.15
Rusks|410|10|
Olive oil|884||0.92
Vegetable oil|884||0.92
Sesame oil|884||0.92
Vinegar|20||1
Balsamic vinegar|88||1.06
Soy sauce|55||1.15
Fish sauce|35||1.2
Oyster sauce|50||1.25
Worcestershire sauce|78||1.1
Hot sauce|20||1.05
Ketchup|110||1.15
Mustard|65||1.05
Mayonnaise|680||0.95
BBQ sauce|170||1.2
Tomato paste|82||1.1
Canned tomatoes|22|400|1.05
Coconut milk|200|400|1
Curry paste|150||1
Tahini|595||1
Peanut butter|590||1.05
Stock|8||1
Capers|23||0.6
Olives|145|4|0.6
Jam|250||1.3
Fish stock|10||1
Garlic paste|130||1.1
Ginger paste|70||1.1
Green olives|145|4|0.6
Pickles|15|60|
Lyutenitsa|90||1.05
Ajvar|90||1.05
Pesto|450||1
Passata|30||1.05
Tomato sauce|40||1.05
Salsa|35||1.05
Enchilada sauce|35||1.05
Garlic sauce|450||1
Sweet chilli sauce|230||1.25
Sriracha|95||1.1
Teriyaki sauce|90||1.15
Hoisin sauce|220||1.2
Dark soy sauce|90||1.2
Mirin|240||1.15
Rice vinegar|20||1
Apple cider vinegar|21||1
Red wine vinegar|19||1
White vinegar|18||1
Dijon mustard|150||1.05
Wholegrain mustard|150||1.05
Horseradish sauce|200||1.05
Tartar sauce|500||1
Salad dressing|300||1
Tabasco|12||1
Harissa|100||1
Tamarind paste|240||1.2
Thai green curry paste|150||1
Massaman curry paste|200||1
Madras paste|250||1
Miso|200||1.15
Gochujang|230||1.2
Coconut cream|330|400|1
Gravy|50||1
Beef stock|10||1
Chicken stock|10||1
Vegetable stock|6||1
Stock cubes|250|10|
Sunflower oil|884||0.92
Rapeseed oil|884||0.92
Peanut oil|884||0.92
Coconut oil|860||0.92
Truffle oil|884||0.92
Lard|900||0.9
Duck fat|880||0.9
Suet|850||0.5
Cooking spray|800||0.9
Almonds|580||0.6
Walnuts|655||0.45
Hazelnuts|630||0.55
Cashews|555||0.55
Peanuts|570||0.6
Pine nuts|675||0.6
Pecans|690||0.45
Sesame seeds|575||0.6
Sunflower seeds|585||0.55
Chestnuts|200|10|
Flaked almonds|580||0.35
Pistachios|560||0.5
Macadamia nuts|720||0.55
Brazil nuts|660|5|0.55
Pumpkin seeds|560||0.55
Chia seeds|485||0.7
Flax seeds|535||0.6
Poppy seeds|525||0.6
Water|0||1
White wine|82||1
Red wine|85||1
Beer|43||1
Sake|134||1
Orange juice|45||1.04
Apple juice|46||1.04
Brandy|230||0.95
Rum|230||0.95
Vodka|230||0.95
Rakia|240||0.95
Port|160||1.02
Sparkling water|0||1
Coffee|2||1
Tea|1||1
Ginger cordial|200||1.2
Cola|42||1.04
Ice cream|210||0.55
Frozen peas|81||0.6
Stir-fry vegetables|35||0.4
Mixed vegetables|60||0.6
Frozen berries|45||0.6
Chips|160||
Edamame|120||0.6
Ice cubes|0||0.9
Frozen pastry|450||
Spring rolls|220|40|
Apricot jam|250||1.3
Raspberry jam|250||1.3
Nutella|540||1.2
Popcorn|380||0.05
Crisps|535||
Peanut brittle|490||
Cookies|490|12|
Christmas pudding|300||
Quark|100||1
Blue cheese|355||
Hermelín|330|100|
Olomoucké tvarůžky|125|20|
Smoked cheese|340||
Bryndza|300||1
Žervé|230||1
Pomazánkové máslo|250||1
Sirene|260||
Bulgarian yogurt|65||1.05
Katak|200||1.05
Salted duck eggs|190|70|
Century eggs|140|60|
Silken tofu|55||
Fried tofu|270|15|
Tofu skin|330||
Fermented tofu|150|10|
Smoked meat|250||
Špekáčky|330|90|
Párky|280|45|
Klobása|330|100|
Jitrnice|280|120|
Head cheese|220||
Smoked bacon|450|20|
Pork neck|250||
Pork shoulder|230||
Beef sirloin|200||
Beef chuck|220||
Sujuk|450||
Pastarma|300|10|
Elenski but|330||
Chinese sausage|500|30|
Char siu|260||
Pork belly|520||
Duck breast|200|300|
Fish cake|200|60|
Dried shrimp|280||0.5
Dried scallops|300|5|
Bonito flakes|350||0.1
Eel|240||
Salmon roe|250||1
Fish roe|140||1
Sashimi-grade fish|150||
Pike perch|85||
Daikon|18|800|
Lotus root|74||
Bamboo shoots|27||
Water chestnuts|97|15|
Wood ear mushrooms|25||
Enoki mushrooms|37|100|
King oyster mushrooms|35|80|
Shimeji mushrooms|30|100|
Maitake mushrooms|31||
Porcini|30||
Gai lan|22||
Choy sum|20||
Garlic chives|30||0.1
Chinese celery|16||
Snow peas|42||
Bitter melon|17|200|
Winter melon|13||
Taro|112|150|
Burdock root|72|200|
Kabocha|35|1000|
Shiso|37|0.5|
Mitsuba|15||0.1
Thai basil|23||0.1
Japanese cucumber|15|150|
Negi|34|100|
Sweet potato leaves|42||
Konjac|10||
Bulgarian peppers|27|100|
Green tomatoes|23|120|
Kohlrabi|27|300|
Savoy cabbage|27|1000|
Root parsley|55|80|
Potato dumplings|150|60|
Bread dumplings|230|50|
Bread rolls|280|50|
Rye bread|250|35|
Wafers|500|5|
Gingerbread spice|330||0.5
Ground poppy seeds|525||0.5
Plum butter|190||1.3
Rose jam|270||1.3
Halva|520||
Kori za banitsa|300|400|
Medium-coarse flour|350||0.6
Coarse flour|350||0.65
Fine flour|350||0.53
Rum flavouring|200||1
Lard cracklings|600||0.5
Glutinous rice|370||0.85
Glutinous rice flour|365||0.55
Rice flour|365||0.6
Tapioca starch|360||0.55
Tempura flour|350||0.5
Kinako|450||0.4
Matcha|320||0.4
Agar|25||0.5
Red bean paste|240||1.2
Mochi|240|40|
Glass noodles|350|50|
Soba noodles|340|90|
Ramen|440|80|
Somen noodles|350|50|
Shirataki noodles|10|200|
Wheat noodles|350|90|
Wonton wrappers|290|8|
Dumpling wrappers|290|10|
Rice paper|335|9|
Mung beans|345||0.85
Adzuki beans|330||0.85
Black soybeans|420||0.75
Goji berries|350||0.5
Red dates|290|4|
Lotus seeds|330||0.6
Yuzu|30|100|
Umeboshi|30|10|
Black sesame seeds|575||0.6
Shaoxing wine|130||1
Chinese black vinegar|60||1.05
Doubanjiang|180||1.15
Fermented black beans|200||0.6
Black bean sauce|150||1.15
Sweet bean sauce|240||1.25
Chilli oil|800||0.92
Sichuan peppercorns|300||0.3
Dried chillies|320|0.5|
Cassia bark|250|3|
MSG|0||0.7
Chicken powder|200||0.7
Rock sugar|390||0.9
XO sauce|500||1
Plum sauce|180||1.2
Char siu sauce|250||1.2
Hot pot base|600||1
Chinese sesame paste|600||1
Light soy sauce|55||1.15
Japanese soy sauce|60||1.15
Ponzu|50||1.05
Tonkatsu sauce|130||1.2
Okonomiyaki sauce|130||1.2
Japanese mayonnaise|700||0.95
Sushi vinegar|140||1.1
Mentsuyu|90||1.1
Yuzu kosho|80||1
Japanese curry roux|510|25|
Red miso|190||1.15
Sesame dressing|400||1
Wasabi|290||1
Pickled ginger|50||0.8
Takuan|40||
Natto|210|45|
Dashi|2||1
Kombu|250|5|
Nori|300|3|
Wakame|45||0.2
Hijiki|180||0.2
Furikake|400||0.4
Shichimi togarashi|330||0.45
Japanese rice|360||0.85
Sake lees|220||0.9
Rice wine|130||1
Boza|100||1.05
Becherovka|300||1
Slivovice|250||0.95
Mead|100||1.05
Kvass|27||1
`
