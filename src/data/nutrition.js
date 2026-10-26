// Calories for the ingredient catalog, one line per ingredient:
//   Name | kcal per 100 g | grams per piece | grams per ml | protein | carbs | fat
// Protein, carbohydrates (without fibre, as on EU labels) and fat are grams
// per 100 g. Values are typical raw (as bought) figures from public food tables
// (USDA FoodData Central, the Czech and Bulgarian food tables), rounded.
// "Grams per piece" turns "2 eggs" or "3 cloves" into grams (for garlic it
// is one clove, for bread one slice, for a pack the usual pack). "Grams per
// ml" turns spoons and cups into grams for things lighter or heavier than
// water (flour, oil, honey); empty means 1. Your own ingredients get their
// own values in the app, and fall back to these through "counts as".

export const NUTRITION_LINES = `
Beef|250|||26|0|17
Ground beef|250|||17|0|20
Beef brisket|250|||18|0|20
Beef fillet|180|||21|0|10
Steak|200|250||25|0|12
Beef shin|150|||21|0|7
Veal|150|||20|0|7
Pork|240|||17|0|20
Ground pork|260|||17|0|21
Bacon|420|20||13|1|40
Ham|145|15||20|1.5|6
Prosciutto|270|12||26|0|18
Sausages|300|75||12|3|27
Chorizo|455|||24|2|38
Chicken|215|1500||19|0|15
Chicken breast|120|170||23|0|2
Chicken thighs|180|120||18|0|12
Ground chicken|145|||17|0|8
Turkey|135|||22|0|5
Duck|340|||11|0|33
Lamb|280|||17|0|23
Oxtail|260|||20|0|20
Beef kidney|100|||17|0|3
Lamb kidney|95|||16|1|3
Chicken liver|120|||17|1|5
Pork ribs|280|||16|0|24
Pork tenderloin|120|400||21|0|4
Ribeye steak|290|300||24|0|22
Rump steak|170|250||27|0|7
Flank steak|165|||21|0|8
Skirt steak|200|||20|0|13
T-bone steak|250|450||22|0|18
Beef short ribs|390|||16|0|36
Beef cheeks|150|||20|0|7
Stewing beef|190|||20|0|12
Beef round|140|||22|0|5
Roast beef|175|20||27|0|7
Corned beef|250|||19|0|19
Beef liver|135|||20|4|4
Calf liver|140|||20|3|5
Beef tongue|225|||15|0|16
Tripe|85|||12|0|4
Bone marrow|780|||7|0|84
Veal shank|130|350||20|0|5
Pork chops|200|200||20|0|13
Pork loin|180|||21|0|10
Pork leg|165|||21|0|9
Pork cheeks|200|||18|0|14
Pork liver|135|||21|2.5|4
Gammon|140|200||20|0.5|6
Pig trotters|230|250||23|0|15
Chicken wings|190|90||18|0|13
Chicken drumsticks|160|110||18|0|9
Chicken legs|190|300||17|0|13
Chicken hearts|150|||16|0|9
Chicken gizzards|95|||18|0|2
Turkey breast|110|||24|0|1.5
Turkey legs|145|500||19|0|7
Ground turkey|150|||19|0|8
Duck legs|240|250||17|0|19
Lamb chops|280|80||17|0|23
Lamb leg|230|||18|0|17
Lamb shoulder|260|||17|0|21
Ground lamb|280|||17|0|23
Rack of lamb|280|||16|0|24
Lamb shanks|200|400||19|0|13
Pheasant|180|||23|0|9
Hare|115|||22|0|2.5
Wild boar|120|||22|0|3.5
Pancetta|440|||14|0|42
Lardons|330|||15|0|30
Pepperoni|500|3||20|1|46
Serrano ham|240|15||31|0|13
Speck|300|15||28|0|21
Bresaola|150|8||33|0|2
Mortadella|310|20||15|1|27
Kielbasa|300|||13|2|26
Merguez|300|50||15|1|26
Pork knuckle|230|1000||18|0|17
Salami|410|8||22|2|35
Black pudding|300|||11|15|21
Doner meat|260|||17|4|19
Italian sausage|320|90||14|3|28
Lukanka|440|||28|1|36
Kebapche|260|60||16|2|21
Meatballs|250|30||15|7|18
Rabbit|135|||21|0|6
Venison|120|||23|0|2
Goose|370|||16|0|33
Quail|190|100||20|0|12
Salmon|200|150||20|0|13
Tuna|130|150||28|0|1
White fish|85|150||18|0|1
Mackerel|205|300||19|0|14
Prawns|85|15||20|0|1
Squid|90|||16|3|1.4
Mussels|85|10||12|4|2
Cod|80|150||18|0|0.7
Salt cod|290|||63|0|2.4
Haddock|80|150||18|0|0.5
Smoked haddock|100|150||23|0|0.9
Monkfish|75|150||15|0|1.5
Trout|140|300||20|0|6
Sea bream|125|350||20|0|5
Sardines|210|40||25|0|11
Anchovies|210|4||29|0|10
Herring|160|150||18|0|9
Carp|125|||18|0|6
Oysters|70|15||9|4|2.5
Clams|75|10||13|3|1
Scallops|70|20||12|3|0.5
Octopus|80|||15|2|1
Crab|85|||18|0|1
Lobster|90|||19|0|1
Surimi|100|15||8|15|1
Eggs|143|50|1.03|12.6|0.7|9.5
Egg yolks|320|17|1.03|16|3.6|27
Egg whites|52|33|1.03|11|0.7|0.2
Milk|60||1.03|3.3|4.8|3.3
Butter|720|250|0.96|0.9|0.1|81
Cream|300||1|2.1|3|31
Sour cream|200||1.05|2.4|4.6|19
Greek yogurt|120||1.05|9|4|5
Yogurt|65||1.05|3.5|4.7|3.3
Cream cheese|340||1|6|4|33
Mascarpone|430||1|4.5|4|44
Ricotta|175||1|11|3|13
Cheese|380||0.45|25|1|31
Cheddar|405||0.45|25|1.3|33
Mozzarella|255|125||18|2|17
Parmesan|420||0.4|36|3|29
Feta|265|||14|4|21
Goat cheese|365|||22|0|30
Gouda|360||0.45|25|2|27
Brie|335|||21|0.5|28
Gruyère|410||0.45|30|0.4|32
Paneer|300|||18|3|22
Condensed milk|320||1.3|8|55|9
Double cream|450||1|1.6|2.6|48
Single cream|190||1|2.6|4|18
Crème fraîche|300||1|2.4|2.6|30
Clotted cream|590||1|1.6|2.3|64
Fromage frais|110||1|7|5|7
Cottage cheese|100||1|11|3.4|4.3
Buttermilk|40||1.03|3.3|4.8|0.9
Kefir|55||1.03|3.3|4.5|2.5
Ayran|35||1.03|1.7|2.4|1.7
Plant milk|40||1.03|1|4|1.5
Ghee|880||0.91|0.3|0|99.5
Vegan butter|540||0.96|0.2|0.5|60
Kashkaval|360||0.45|25|1|28
Halloumi|320|||22|2|25
Pecorino|390||0.4|32|0.5|28
Stilton|410|||23|0.1|35
Emmental|380||0.45|28|0.5|29
Edam|350||0.45|25|1.4|27
Camembert|300|250||20|0.5|24
Monterey Jack|375||0.45|24|0.7|30
Processed cheese|300|20||15|6|23
Burrata|300|125||17|1|25
Custard|120||1.05|3.5|17|4
Whipped cream|260||0.5|2|12|22
Tofu|120|||13|2|7
Tempeh|195|||20|8|11
Seitan|370|||75|14|2
Hummus|175||1|8|14|10
Onion|40|110|0.67|1.1|9|0.1
Red onion|40|110|0.67|1.1|9|0.1
Spring onions|32|15|0.42|1.8|7|0.2
Shallots|72|30|0.67|2.5|17|0.1
Leek|61|200|0.37|1.5|14|0.3
Garlic|149|5|0.57|6.4|33|0.5
Ginger|80|15|0.4|1.8|18|0.8
Potatoes|77|170|0.63|2|17|0.1
Sweet potatoes|86|200|0.55|1.6|20|0.1
Carrots|41|60|0.54|0.9|10|0.2
Celery|16|40|0.42|0.7|3|0.2
Celeriac|42|500|0.65|1.5|9|0.3
Tomatoes|18|120|0.75|0.9|3.9|0.2
Cherry tomatoes|18|15|0.62|0.9|3.9|0.2
Cucumber|15|300|0.55|0.7|3.6|0.1
Bell pepper|26|150|0.62|1|6|0.3
Chilli|40|15|0.45|1.9|9|0.4
Courgette|17|200|0.52|1.2|3.1|0.3
Aubergine|25|300|0.35|1|6|0.2
Mushrooms|22|20|0.4|3.1|3.3|0.3
Shiitake mushrooms|34|15|0.3|2.2|7|0.5
Broccoli|34|350|0.38|2.8|7|0.4
Cauliflower|25|600|0.45|1.9|5|0.3
Cabbage|25|1000|0.37|1.3|6|0.1
Brussels sprouts|43|10|0.37|3.4|9|0.3
Kale|49||0.28|4.3|9|0.9
Spinach|23||0.3|2.9|3.6|0.4
Lettuce|15|300|0.2|1.4|2.9|0.2
Rocket|25||0.08|2.6|3.7|0.7
Asparagus|20|20|0.56|2.2|3.9|0.1
Green beans|31||0.45|1.8|7|0.2
Peas|81||0.6|5.4|14|0.4
Sugar snap peas|42||0.4|2.8|7.6|0.2
Sweetcorn|86||0.65|3.3|19|1.4
Pumpkin|26||0.48|1|6.5|0.1
Beetroot|43|150|0.57|1.6|10|0.2
Radishes|16|10|0.48|0.7|3.4|0.1
Fennel|31|250|0.37|1.2|7|0.2
Turnip|28|150|0.55|0.9|6.4|0.1
Parsnip|75|150|0.55|1.2|18|0.3
Vine tomatoes|18|100|0.75|0.9|3.9|0.2
Plum tomatoes|18|70|0.75|0.9|3.9|0.2
Sun-dried tomatoes|260|5|0.45|14|56|3
Yellow pepper|27|150|0.62|1|6.3|0.2
Green pepper|20|150|0.62|0.9|4.6|0.2
Red pepper|31|150|0.62|1|6|0.3
Kapia pepper|31|120|0.62|1|6|0.3
Jalapeño|29|15|0.38|0.9|6.5|0.4
Scotch bonnet|40|10||1.9|9|0.4
Butternut squash|45|1000|0.58|1|12|0.1
Swede|37|500|0.58|1.1|8.6|0.2
Jerusalem artichokes|73|40||2|17|0
Artichokes|47|130||3.3|11|0.2
Okra|33|12|0.42|1.9|7|0.2
Bok choy|13|150|0.3|1.5|2.2|0.2
Chinese cabbage|16|1000|0.32|1.2|3.2|0.2
Red cabbage|31|1000|0.37|1.4|7|0.2
Sauerkraut|19||0.6|0.9|4.3|0.1
Iceberg lettuce|14|500|0.3|0.9|3|0.1
Chestnut mushrooms|22|15|0.4|3.1|3.3|0.3
Wild mushrooms|30||0.35|3|4|0.5
Oyster mushrooms|33||0.36|3.3|6|0.4
Corn on the cob|86|200||3.3|19|1.4
Creamed corn|72|||1.7|17|0.4
Watercress|11||0.14|2.3|1.3|0.1
Bean sprouts|30||0.44|3|6|0.2
Horseradish|48||0.55|1.2|11|0.7
Baby potatoes|70|40|0.63|1.9|16|0.1
Vine leaves|93|3||5.6|17|2.1
Avocado|160|150|0.63|2|8.5|15
Lemon|29|100||1.1|9|0.3
Lemon juice|22||1|0.4|7|0.2
Lemon zest|47|3|0.4|1.5|10|0.3
Lime|30|60||0.7|10.5|0.2
Orange|47|150||0.9|12|0.1
Apples|52|180|0.52|0.3|14|0.2
Pears|57|180|0.6|0.4|15|0.1
Banana|89|120|0.63|1.1|23|0.3
Strawberries|32|12|0.6|0.7|7.7|0.3
Raspberries|52||0.5|1.2|12|0.7
Blueberries|57||0.6|0.7|14|0.3
Blackberries|43||0.6|1.4|10|0.5
Cherries|63|7|0.6|1.1|16|0.2
Peaches|39|150|0.65|0.9|10|0.3
Apricots|48|35|0.65|1.4|11|0.4
Dried apricots|240|8|0.55|3.4|63|0.5
Raisins|300||0.65|3.1|79|0.5
Dates|280|8|0.62|2.5|75|0.4
Coconut|355||0.35|3.3|15|33
Mango|60|300|0.7|0.8|15|0.4
Pineapple|50|1000|0.69|0.5|13|0.1
Kiwi|61|75|0.75|1.1|15|0.5
Grapes|69|5|0.63|0.7|18|0.2
Watermelon|30||0.63|0.6|7.6|0.2
Melon|34||0.7|0.8|8|0.2
Plums|46|50|0.69|0.7|11|0.3
Figs|74|50|0.62|0.8|19|0.3
Pomegranate|83|250|0.73|1.7|19|1.2
Grapefruit|42|250||0.8|11|0.1
Mandarins|53|80||0.8|13|0.3
Passion fruit|97|20||2.2|23|0.7
Quince|57|200||0.4|15|0.1
Rhubarb|21||0.5|0.9|4.5|0.2
Cranberries|46||0.42|0.4|12|0.1
Redcurrants|56||0.47|1.4|14|0.2
Sultanas|300||0.65|2.7|79|0.5
Dried fruit|280||0.65|2.5|70|0.5
Prunes|240|8|0.7|2.2|64|0.4
Glacé cherries|300|5|0.7|0.4|75|0.2
Sour cherries|50||0.6|1|12|0.3
Orange zest|97|3|0.4|1.5|25|0.2
Lime juice|25||1|0.4|8.4|0.1
Ackee|150|||2.9|0.8|15
Tamarind|240|||2.8|62|0.6
Parsley|36||0.15|3|6|0.8
Basil|23||0.1|3.2|2.7|0.6
Coriander|23||0.1|2.1|3.7|0.5
Dill|43||0.1|3.5|7|1.1
Mint|44||0.1|3.8|8|0.9
Chives|30||0.1|3.3|4.4|0.7
Thyme|100||0.3|5.6|10|1.7
Rosemary|130||0.3|3.3|21|5.9
Oregano|265||0.3|9|45|4.3
Sage|315||0.3|11|40|13
Tarragon|295||0.3|23|35|7
Marjoram|270||0.3|13|40|7
Bay leaves|313|0.2||7.6|49|8.4
Bouquet garni|50|5||3|8|1
Savory|270||0.3|7|45|6
Lemongrass|99|20||1.8|25|0.5
Kaffir lime leaves|50|0.3||2|10|0.5
Curry leaves|108|0.1||6|19|1
Lovage|40||0.1|3|6|0.6
Salt|0||1.2|0|0|0
Black pepper|250||0.5|10|39|3.3
Salt and pepper|0||1.2|0|0|0
Paprika|280||0.45|14|20|13
Smoked paprika|280||0.45|14|20|13
Chilli powder|280||0.5|13|15|14
Cumin|375||0.45|18|44|22
Coriander seeds|300||0.4|12|13|18
Turmeric|310||0.6|10|65|3.3
Curry powder|325||0.45|14|36|14
Garam masala|380||0.45|14|50|15
Cinnamon|250||0.55|4|55|1.2
Nutmeg|525||0.5|6|49|36
Cloves|275|0.1|0.45|6|32|13
Cardamom|310|0.2|0.45|11|50|7
Star anise|340|1||18|35|16
Caraway seeds|335||0.45|20|30|15
Garlic powder|330||0.65|17|73|0.7
Garlic salt|80||1.1|4|17|0.2
Lemon pepper|200||0.6|6|40|2
Onion powder|340||0.5|10|79|1
Ground ginger|335||0.4|9|72|4
Italian seasoning|265||0.25|11|44|5
Mustard seeds|510||0.65|26|28|36
Mustard powder|510||0.45|26|28|36
Cayenne pepper|320||0.5|12|30|17
Chilli flakes|320||0.35|12|30|17
Cumin seeds|375||0.45|18|44|22
Fennel seeds|345||0.4|16|52|15
Fenugreek|325||0.75|23|58|6
Saffron|310||0.15|11|65|6
Allspice|265||0.5|6|50|9
White pepper|300||0.55|10|69|2
Pink peppercorns|300||0.4|10|64|3
Celery salt|20||1.2|1|4|0.5
Onion salt|30||1.2|1|7|0
Sea salt|0||1.1|0|0|0
Cajun seasoning|280||0.5|10|55|8
Fajita seasoning|280||0.5|9|57|7
Biryani masala|350||0.45|13|55|14
Chinese five spice|350||0.45|11|60|12
Za'atar|290||0.4|9|43|14
Sumac|240||0.5|5|40|5
Jerk seasoning|280||0.5|8|58|6
Sharena sol|200||0.6|5|35|5
Cinnamon sticks|250|3||4|55|1.2
Vanilla|290|2|1|0.1|13|0.1
Flour|364||0.54|10|76|1
Self-raising flour|350||0.53|9|74|1.2
Wholemeal flour|340||0.5|13|65|2.5
Cornstarch|380||0.55|0.3|91|0.1
Sugar|400||0.85|0|100|0
Brown sugar|380||0.9|0.1|97|0
Icing sugar|400||0.5|0|100|0
Honey|305||1.42|0.3|82|0
Maple syrup|260||1.32|0|67|0.1
Baking powder|55|12|0.9|0|13|0
Baking soda|0||1.1|0|0|0
Yeast|105|7|0.6|8.4|11|1.9
Cocoa|230||0.45|20|13|14
Dark chocolate|550||0.6|7.8|46|43
Milk chocolate|535||0.6|7.6|59|30
White chocolate|540||0.6|6|59|32
Gelatine|335|10|0.7|86|0|0
Puff pastry|550|275||7|46|36
Shortcrust pastry|500|320||6.5|55|28
Golden syrup|325||1.4|0.3|79|0
Treacle|290||1.4|1.2|67|0
Agave syrup|310||1.35|0.1|76|0.5
Caster sugar|400||0.85|0|100|0
Muscovado sugar|380||0.9|0.1|95|0
Coconut sugar|375||0.75|1|92|0.5
Vanilla sugar|400|8|0.85|0|99|0
Sweetener|0||0.5|0|0|0
Plain flour|364||0.54|10|76|1
Bread flour|360||0.55|12|72|1.5
Cornmeal|365||0.65|7|77|3.9
Rye flour|325||0.45|9|69|1.7
Spelt flour|340||0.5|14|65|2.4
Almond flour|570||0.4|21|20|50
Potato starch|330||0.65|0.1|83|0.1
Cream of tartar|260||0.85|0|62|0
Chickpea flour|390||0.5|22|58|6.7
Semolina|360||0.7|13|73|1
Custard powder|360|40|0.6|0.5|88|0.7
Chocolate chips|500||0.7|5|62|27
Cocoa nibs|600||0.5|14|35|43
Sprinkles|400||0.8|1.5|90|4
Food colouring|0||1|0|0|0
Marzipan|450|||8|57|21
Marshmallows|320|7|0.2|1.8|81|0.2
Caramel|380||1.2|1.5|70|10
Meringue|390|10||5.5|92|0
Filo pastry|300|250||8.5|60|4.5
Pizza dough|260|250||8|48|3.5
Vanilla pod|290|3||4|50|10
Gelatine leaves|335|2||86|0|0
Rice|360||0.8|7|79|0.6
Basmati rice|355||0.8|8|78|0.6
Jasmine rice|360||0.8|7|80|0.5
Brown rice|360||0.8|7.5|76|2.7
Pasta|355|500|0.45|12.5|71|1.5
Spaghetti|355|500||12.5|71|1.5
Lasagne sheets|355|20||12.5|71|1.5
Noodles|360|60||12|72|2
Couscous|365||0.75|13|73|0.6
Oats|380||0.4|13|60|7
Lentils|350||0.8|25|60|1
Chickpeas|130|240|0.65|7|18|2.5
Kidney beans|120|240|0.7|8|16|0.5
Beans|120|240|0.7|8|16|0.5
Baked beans|85|415|1.05|5|13|0.4
Penne|355||0.45|12.5|71|1.5
Farfalle|355||0.4|12.5|71|1.5
Fusilli|355||0.4|12.5|71|1.5
Macaroni|355||0.5|12.5|71|1.5
Rigatoni|355||0.35|12.5|71|1.5
Tagliatelle|365|25||13|70|3
Fettuccine|365|25||13|70|3
Linguine|355|||12.5|71|1.5
Pappardelle|365|25||13|70|3
Paccheri|355||0.35|12.5|71|1.5
Orzo|355||0.85|12.5|71|1.5
Vermicelli|355|||12|74|1
Gnocchi|155|||3.5|33|0.5
Tortellini|300||0.5|12|45|8
Udon noodles|130|200||4|27|0.5
Rice noodles|360|100||6|80|0.5
Egg noodles|380|60||14|71|4
Risotto rice|350||0.85|7|78|0.6
Paella rice|350||0.85|7|78|0.6
Sushi rice|360||0.85|6.5|80|0.5
Wild rice|355||0.7|15|75|1
Bulgur|340||0.75|12|64|1.3
Quinoa|370||0.75|14|64|6
Pearl barley|350||0.8|10|73|1.2
Buckwheat|345||0.75|13|72|3.4
Millet|375||0.8|11|73|4.2
Polenta|365||0.65|7|77|3.9
Granola|470||0.45|10|64|18
Red lentils|345||0.8|24|60|1.5
Brown lentils|350||0.8|25|60|1
Toor dal|345||0.8|22|63|1.5
Cannellini beans|110|240|0.7|7|17|0.5
Butter beans|105|240|0.7|7|17|0.5
Black beans|130|240|0.7|8.9|24|0.5
Pinto beans|140|240|0.7|9|26|0.6
Borlotti beans|130|240|0.7|9|23|0.5
Haricot beans|130|240|0.7|8|23|0.6
Refried beans|90||1|5|14|1.2
Bread|265|30||9|49|3.2
Baguette|275|250||9|55|1.5
Breadcrumbs|395||0.45|13|72|5
Tortillas|310|45||8|50|8
Flatbread|290|80||9|55|4
Burger buns|280|60||9|50|4.5
Digestive biscuits|480|15||7|64|21
Ladyfingers|390|6||8|76|4
Crusty bread|260|40||9|50|2
Wholegrain bread|250|35||10|43|3.5
Toast bread|265|25||8.5|49|3.5
Naan|290|90||9|50|5.5
Pita|275|60||9|56|1.2
Brioche|370|50||9|50|13
Croissants|405|60||8|46|21
Taco shells|470|13||7|62|22
Corn tortillas|220|25||5.7|45|3
Crackers|440|5||9|68|14
Pretzels|380|30||10|80|3
Croutons|410||0.15|11|72|9
Rusks|410|10||11|75|7
Olive oil|884||0.92|0|0|100
Vegetable oil|884||0.92|0|0|100
Sesame oil|884||0.92|0|0|100
Vinegar|20||1|0|0.6|0
Balsamic vinegar|88||1.06|0.5|17|0
Soy sauce|55||1.15|8|5|0.1
Fish sauce|35||1.2|5|3.6|0
Oyster sauce|50||1.25|1.4|11|0.3
Worcestershire sauce|78||1.1|0|19|0
Hot sauce|20||1.05|0.5|1.7|0.4
Ketchup|110||1.15|1.2|26|0.1
Mustard|65||1.05|4|6|4
Mayonnaise|680||0.95|1|1|75
BBQ sauce|170||1.2|0.8|40|0.6
Tomato paste|82||1.1|4.3|19|0.5
Canned tomatoes|22|400|1.05|1|4|0.2
Coconut milk|200|400|1|2|3|21
Curry paste|150||1|3|15|9
Tahini|595||1|17|21|54
Peanut butter|590||1.05|25|20|50
Nut butter|615||1.05|21|19|55
Condensed soup|60|300|1.05|1.5|6|3.5
Stock|8||1|0.5|1|0.3
Capers|23||0.6|2.4|4.9|0.9
Olives|145|4|0.6|1|4|15
Jam|250||1.3|0.4|62|0.1
Fish stock|10||1|1.5|0.5|0.3
Garlic paste|130||1.1|4|25|2
Ginger paste|70||1.1|1.5|12|1.5
Green olives|145|4|0.6|1|4|15
Pickles|15|60||0.5|3|0.2
Lyutenitsa|90||1.05|2|14|3
Ajvar|90||1.05|1.5|10|5
Pesto|450||1|5|6|45
Passata|30||1.05|1.4|5.5|0.2
Tomato sauce|40||1.05|1.3|7|0.7
Salsa|35||1.05|1.5|7|0.2
Enchilada sauce|35||1.05|1|6|1
Garlic sauce|450||1|1|5|47
Sweet chilli sauce|230||1.25|0.5|55|0.3
Sriracha|95||1.1|2|19|1
Teriyaki sauce|90||1.15|6|16|0
Hoisin sauce|220||1.2|3.3|44|3.4
Dark soy sauce|90||1.2|5|18|0
Mirin|240||1.15|0.3|43|0
Rice vinegar|20||1|0|4.4|0
Apple cider vinegar|21||1|0|0.9|0
Red wine vinegar|19||1|0|0.3|0
White vinegar|18||1|0|0|0
Dijon mustard|150||1.05|6|5|11
Wholegrain mustard|150||1.05|7|7|10
Horseradish sauce|200||1.05|2|15|14
Tartar sauce|500||1|1|10|50
Salad dressing|300||1|1|10|28
Tabasco|12||1|1.3|0.8|0.8
Harissa|100||1|3|10|5
Tamarind paste|240||1.2|2.8|57|0.6
Thai green curry paste|150||1|3|15|9
Massaman curry paste|200||1|3|20|12
Madras paste|250||1|4|12|20
Miso|200||1.15|12|26|6
Gochujang|230||1.2|5|46|1.5
Coconut cream|330|400|1|3.6|6.6|33
Gravy|50||1|1.5|5|2.5
Beef stock|10||1|1.5|0.5|0.3
Chicken stock|10||1|1.5|0.5|0.3
Vegetable stock|6||1|0.3|1|0.2
Stock cubes|250|10||10|25|13
Sunflower oil|884||0.92|0|0|100
Rapeseed oil|884||0.92|0|0|100
Peanut oil|884||0.92|0|0|100
Coconut oil|860||0.92|0|0|99
Truffle oil|884||0.92|0|0|100
Lard|900||0.9|0|0|100
Duck fat|880||0.9|0|0|99.5
Suet|850||0.5|0.5|0|94
Cooking spray|800||0.9|0|0|90
Almonds|580||0.6|21|22|50
Walnuts|655||0.45|15|14|65
Hazelnuts|630||0.55|15|17|61
Cashews|555||0.55|18|30|44
Peanuts|570||0.6|26|16|49
Pine nuts|675||0.6|14|13|68
Pecans|690||0.45|9|14|72
Sesame seeds|575||0.6|18|23|50
Sunflower seeds|585||0.55|21|20|51
Chestnuts|200|10|0.6|2.4|44|2.2
Flaked almonds|580||0.35|21|22|50
Pistachios|560||0.5|20|28|45
Macadamia nuts|720||0.55|8|14|76
Brazil nuts|660|5|0.55|14|12|67
Pumpkin seeds|560||0.55|30|11|49
Chia seeds|485||0.7|17|42|31
Flax seeds|535||0.6|18|29|42
Poppy seeds|525||0.6|18|28|42
Water|0||1|0|0|0
White wine|82||1|0.1|2.6|0
Red wine|85||1|0.1|2.6|0
Beer|43||1|0.5|3.6|0
Sake|134||1|0.5|5|0
Orange juice|45||1.04|0.7|10|0.2
Apple juice|46||1.04|0.1|11|0.1
Brandy|230||0.95|0|0|0
Rum|230||0.95|0|0|0
Vodka|230||0.95|0|0|0
Rakia|240||0.95|0|0|0
Port|160||1.02|0.1|12|0
Sparkling water|0||1|0|0|0
Coffee|2||1|0.1|0|0
Tea|1||1|0|0.2|0
Ginger cordial|200||1.2|0|50|0
Cola|42||1.04|0|10.6|0
Ginger ale|35||1.04|0|9|0
Ice cream|210||0.55|3.5|24|11
Frozen peas|81||0.6|5.4|14|0.4
Stir-fry vegetables|35||0.4|2|6|0.3
Mixed vegetables|60||0.6|2.6|12|0.2
Frozen berries|45||0.6|1|10|0.3
Chips|160|||2.5|25|6
Edamame|120||0.6|11|9|5
Ice cubes|0||0.9|0|0|0
Frozen pastry|450|||7|45|28
Spring rolls|220|40||5|27|10
Apricot jam|250||1.3|0.4|62|0.1
Raspberry jam|250||1.3|0.4|62|0.1
Nutella|540||1.2|6|57|31
Popcorn|380||0.05|11|65|5
Crisps|535|||6.5|50|35
Peanut brittle|490|||7|70|19
Cookies|490|12||5.5|65|23
Christmas pudding|300|||3|55|8
Quark|100||1|12|3.8|4
Blue cheese|355|||21|2.3|29
Hermelín|330|100||19|0.5|27
Olomoucké tvarůžky|125|20||29|0.5|0.6
Smoked cheese|340|||25|1|26
Bryndza|300||1|16|2|24
Žervé|230||1|9|3|20
Pomazánkové máslo|250||1|6|4|22
Sirene|260|||17|1|21
Bulgarian yogurt|65||1.05|3.3|4|3.6
Katak|200||1.05|5|5|18
Salted duck eggs|190|70||14|4|16
Century eggs|140|60||14|2|10
Silken tofu|55|||5|2|2.7
Fried tofu|270|15||17|9|19
Tofu skin|330|||44|12|19
Fermented tofu|150|10||11|5|8
Smoked meat|250|||22|0|17
Špekáčky|330|90||12|2|30
Párky|280|45||12|2|25
Klobása|330|100||15|2|29
Jitrnice|280|120||11|10|20
Head cheese|220|||15|1|16
Smoked bacon|450|20||14|1|43
Pork neck|250|||17|0|20
Pork shoulder|230|||18|0|17
Beef sirloin|200|||25|0|11
Beef chuck|220|||19|0|16
Sujuk|450|||22|2|40
Pastarma|300|10||35|1|17
Elenski but|330|||30|1|23
Chinese sausage|500|30||18|20|40
Char siu|260|||25|12|12
Pork belly|520|||9|0|53
Duck breast|200|300||20|0|13
Fish cake|200|60||10|20|8
Dried shrimp|280||0.5|60|2|3
Dried scallops|300|5||65|10|2
Bonito flakes|350||0.1|77|0|3
Eel|240|||18|0|19
Salmon roe|250||1|24|3|15
Fish roe|140||1|22|1.5|6
Sashimi-grade fish|150|||22|0|6
Pike perch|85|||19|0|1
Daikon|18|800|0.5|0.6|4|0.1
Lotus root|74|||2.6|17|0.1
Bamboo shoots|27||0.55|2.6|5|0.3
Water chestnuts|97|15|0.52|1.4|24|0.1
Wood ear mushrooms|25|||0.5|7|0.1
Enoki mushrooms|37|100|0.27|2.7|8|0.3
King oyster mushrooms|35|80||3|6|0.4
Shimeji mushrooms|30|100||2.5|5|0.3
Maitake mushrooms|31|||1.9|7|0.2
Porcini|30||0.3|3.7|5|0.4
Gai lan|22|||1.1|4|0.7
Choy sum|20|||1.6|3|0.3
Garlic chives|30||0.1|3.3|4.4|0.7
Chinese celery|16|||0.7|3|0.2
Snow peas|42||0.4|2.8|7.6|0.2
Bitter melon|17|200||1|3.7|0.2
Winter melon|13|||0.4|3|0.2
Taro|112|150|0.55|1.5|26|0.2
Burdock root|72|200||1.5|17|0.2
Kabocha|35|1000|0.48|1.6|8|0.2
Shiso|37|0.5||3.9|7.5|0.1
Mitsuba|15||0.1|1|3|0.1
Thai basil|23||0.1|3.2|2.7|0.6
Japanese cucumber|15|150|0.55|0.7|3.6|0.1
Negi|34|100|0.42|1.8|8|0.1
Sweet potato leaves|42|||4|9|0.3
Konjac|10|||0.1|3|0
Bulgarian peppers|27|100|0.62|1|6.3|0.2
Green tomatoes|23|120|0.75|1.2|5|0.2
Kohlrabi|27|300|0.56|1.7|6|0.1
Savoy cabbage|27|1000|0.37|2|6|0.1
Root parsley|55|80|0.55|2.3|12|0.4
Potato dumplings|150|60||3|33|0.5
Bread dumplings|230|50||7|45|2.5
Bread rolls|280|50||9|52|3
Rye bread|250|35||8.5|48|3.3
Wafers|500|5||5|65|25
Gingerbread spice|330||0.5|5|70|5
Ground poppy seeds|525||0.5|18|28|42
Plum butter|190||1.3|1|45|0.2
Rose jam|270||1.3|0.2|67|0
Halva|520|||12|50|30
Kori za banitsa|300|400||8.5|60|4.5
Medium-coarse flour|350||0.6|11|72|1.4
Coarse flour|350||0.65|11|72|1.4
Fine flour|350||0.53|10|74|1.2
Rum flavouring|200||1|0|0|0
Lard cracklings|600||0.5|30|0|58
Glutinous rice|370||0.85|7|81|0.5
Glutinous rice flour|365||0.55|6|80|1.5
Rice flour|365||0.6|6|80|1.4
Tapioca starch|360||0.55|0.2|89|0
Tempura flour|350||0.5|9|76|1
Kinako|450||0.4|37|28|26
Matcha|320||0.4|30|39|5
Agar|25||0.5|0.5|0|0
Red bean paste|240||1.2|5|52|0.5
Mochi|240|40|0.65|4|55|0.5
Glass noodles|350|50||0.2|86|0.1
Soba noodles|340|90||14|67|2
Ramen|440|80||10|60|17
Somen noodles|350|50||9.5|73|1
Shirataki noodles|10|200||0|3|0
Wheat noodles|350|90||12|72|1.5
Wonton wrappers|290|8||10|58|1.5
Dumpling wrappers|290|10||10|58|1.5
Rice paper|335|9||1|83|0.2
Mung beans|345||0.85|24|58|1.1
Adzuki beans|330||0.85|20|58|0.5
Black soybeans|420||0.75|36|28|19
Goji berries|350||0.5|14|64|0.4
Red dates|290|4||3.7|74|1.1
Lotus seeds|330||0.6|15|64|2
Yuzu|30|100||0.5|7|0.1
Umeboshi|30|10||0.9|8|0.2
Black sesame seeds|575||0.6|18|23|50
Shaoxing wine|130||1|1.6|5|0
Chinese black vinegar|60||1.05|1|12|0.2
Doubanjiang|180||1.15|8|20|8
Fermented black beans|200||0.6|20|20|6
Black bean sauce|150||1.15|5|20|4
Sweet bean sauce|240||1.25|6|45|3
Chilli oil|800||0.92|1.5|3|86
Sichuan peppercorns|300||0.3|6|50|9
Dried chillies|320|0.5||12|30|17
Cassia bark|250|3||4|55|1.2
MSG|0||0.7|0|0|0
Chicken powder|200||0.7|10|30|5
Rock sugar|390||0.9|0|98|0
XO sauce|500||1|18|8|42
Plum sauce|180||1.2|0.9|43|1
Char siu sauce|250||1.2|3|56|1.5
Hot pot base|600||1|2|8|62
Chinese sesame paste|600||1|19|20|52
Light soy sauce|55||1.15|8|5|0.1
Japanese soy sauce|60||1.15|8|7|0
Ponzu|50||1.05|3|8|0
Tonkatsu sauce|130||1.2|1|30|0.1
Okonomiyaki sauce|130||1.2|1.5|30|0.2
Japanese mayonnaise|700||0.95|1.5|1.5|76
Sushi vinegar|140||1.1|0.2|35|0
Mentsuyu|90||1.1|4|18|0
Yuzu kosho|80||1|2|8|3
Japanese curry roux|510|25||6|45|34
Red miso|190||1.15|13|21|5.5
Sesame dressing|400||1|3|15|36
Wasabi|290||1|3|45|9
Pickled ginger|50||0.8|0.3|12|0.1
Takuan|40|||1|9|0.1
Natto|210|45||18|13|11
Dashi|2||1|0.3|0.2|0
Kombu|250|5||6|56|1.5
Nori|300|3||41|39|3.7
Wakame|45||0.2|3|9|0.6
Hijiki|180||0.2|9|30|3.2
Furikake|400||0.4|20|40|17
Shichimi togarashi|330||0.45|12|30|17
Japanese rice|360||0.85|6|80|0.6
Sake lees|220||0.9|15|24|1.5
Rice wine|130||1|0.5|5|0
Boza|100||1.05|1.5|22|0.3
Becherovka|300||1|0|10|0
Slivovice|250||0.95|0|0|0
Mead|100||1.05|0.1|10|0
Kvass|27||1|0.2|5.2|0
`
