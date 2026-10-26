// Bulgarian search words for the catalog, for searching eBag.bg (Bulgarian
// only). Keys are catalog names; an empty word means "nothing to buy".

const LINES = `
Beef | телешко месо
Ground beef | телешка кайма
Beef brisket | телешки гърди
Beef fillet | телешко филе
Steak | телешки стек
Beef shin | телешки джолан
Veal | телешко
Pork | свинско месо
Ground pork | свинска кайма
Bacon | бекон
Ham | шунка
Prosciutto | прошуто
Sausages | наденица
Chorizo | чоризо
Chicken | пиле цяло
Chicken breast | пилешко филе
Chicken thighs | пилешки бутчета
Ground chicken | пилешка кайма
Turkey | пуешко
Duck | патица
Lamb | агнешко
Salmon | сьомга
Tuna | риба тон
White fish | бяла риба филе
Mackerel | скумрия
Prawns | скариди
Squid | калмари
Mussels | миди
Eggs | яйца
Egg yolks | яйца
Egg whites | яйца
Milk | прясно мляко
Butter | масло краве
Cream | сметана за готвене
Sour cream | заквасена сметана
Greek yogurt | гръцко кисело мляко
Yogurt | кисело мляко
Cream cheese | крема сирене
Mascarpone | маскарпоне
Ricotta | рикота
Cheese | сирене
Cheddar | чедър
Mozzarella | моцарела
Parmesan | пармезан
Feta | сирене фета
Goat cheese | козе сирене
Gouda | гауда
Brie | бри
Gruyère | грюйер
Paneer | панир
Condensed milk | кондензирано мляко
Onion | лук
Red onion | червен лук
Spring onions | зелен лук
Shallots | шалот
Leek | праз
Garlic | чесън
Ginger | джинджифил
Potatoes | картофи
Sweet potatoes | сладки картофи
Carrots | моркови
Celery | целина стръкове
Celeriac | целина
Tomatoes | домати
Cherry tomatoes | чери домати
Cucumber | краставици
Bell pepper | чушки
Chilli | люти чушки
Courgette | тиквички
Aubergine | патладжан
Mushrooms | гъби печурки
Shiitake mushrooms | шийтаке
Broccoli | броколи
Cauliflower | карфиол
Cabbage | зеле
Brussels sprouts | брюкселско зеле
Kale | кейл
Spinach | спанак
Lettuce | маруля
Rocket | рукола
Asparagus | аспержи
Green beans | зелен боб
Peas | грах
Sugar snap peas | грах шушулки
Sweetcorn | царевица консерва
Pumpkin | тиква
Beetroot | цвекло
Radishes | репички
Fennel | копър резене
Turnip | ряпа
Parsnip | пащърнак
Avocado | авокадо
Lemon | лимони
Lemon juice | лимони
Lemon zest | лимони
Lime | лайм
Orange | портокали
Apples | ябълки
Pears | круши
Banana | банани
Strawberries | ягоди
Raspberries | малини
Blueberries | боровинки
Blackberries | къпини
Cherries | череши
Peaches | праскови
Apricots | кайсии
Dried apricots | сушени кайсии
Raisins | стафиди
Dates | фурми
Coconut | кокосови стърготини
Parsley | магданоз
Basil | босилек
Coriander | кориандър пресен
Dill | копър
Mint | мента
Chives | лук резанец
Thyme | мащерка
Rosemary | розмарин
Oregano | риган
Sage | градински чай
Tarragon | естрагон
Marjoram | майорана
Bay leaves | дафинов лист
Salt | сол
Black pepper | черен пипер
Salt and pepper | сол
Paprika | червен пипер
Smoked paprika | пушен червен пипер
Chilli powder | лют червен пипер
Cumin | кимион
Coriander seeds | кориандър
Turmeric | куркума
Curry powder | къри
Garam masala | гарам масала
Cinnamon | канела
Nutmeg | индийско орехче
Cloves | карамфил
Cardamom | кардамон
Star anise | анасон звезда
Caraway seeds | ким
Garlic powder | чесън на прах
Onion powder | лук на прах
Ground ginger | джинджифил на прах
Italian seasoning | италиански подправки
Mustard seeds | синапено семе
Vanilla | ванилия
Flour | брашно
Self-raising flour | брашно с бакпулвер
Wholemeal flour | пълнозърнесто брашно
Cornstarch | царевично нишесте
Sugar | захар
Brown sugar | кафява захар
Icing sugar | пудра захар
Honey | мед
Maple syrup | кленов сироп
Baking powder | бакпулвер
Baking soda | сода бикарбонат
Yeast | мая
Cocoa | какао
Dark chocolate | черен шоколад
Milk chocolate | млечен шоколад
White chocolate | бял шоколад
Gelatine | желатин
Puff pastry | бутер тесто
Shortcrust pastry | тесто за тарт
Rice | ориз
Basmati rice | ориз басмати
Jasmine rice | ориз жасмин
Brown rice | кафяв ориз
Pasta | паста
Spaghetti | спагети
Lasagne sheets | лазаня
Noodles | нудли
Couscous | кус кус
Oats | овесени ядки
Lentils | леща
Chickpeas | нахут
Kidney beans | червен боб
Beans | боб
Baked beans | боб в доматен сос
Bread | хляб
Baguette | багета
Breadcrumbs | галета
Tortillas | тортили
Flatbread | питка
Burger buns | хлебчета за бургер
Olive oil | зехтин
Vegetable oil | олио
Sesame oil | сусамово олио
Vinegar | оцет
Balsamic vinegar | балсамов оцет
Soy sauce | соев сос
Fish sauce | рибен сос
Oyster sauce | стридиев сос
Worcestershire sauce | уорчестър сос
Hot sauce | лют сос
Ketchup | кетчуп
Mustard | горчица
Mayonnaise | майонеза
BBQ sauce | барбекю сос
Tomato paste | доматено пюре
Canned tomatoes | консервирани домати
Coconut milk | кокосово мляко
Curry paste | къри паста
Tahini | тахан
Peanut butter | фъстъчено масло
Stock | бульон
Capers | каперси
Olives | маслини
Jam | конфитюр
Almonds | бадеми
Walnuts | орехи
Hazelnuts | лешници
Cashews | кашу
Peanuts | фъстъци
Pine nuts | кедрови ядки
Pecans | пекан
Sesame seeds | сусам
Sunflower seeds | слънчогледово семе
Water |
White wine | бяло вино
Red wine | червено вино
Beer | бира
Ice cream | сладолед
Oxtail | опашка говежда
Beef kidney | говежди бъбреци
Lamb kidney | агнешки бъбреци
Chicken liver | пилешки дробчета
Pork ribs | свински ребра
Pork tenderloin | свинско филе
Ribeye steak | рибай стек
Rump steak | ръмп стек
Flank steak | фланк стек
Skirt steak | скърт стек
T-bone steak | ти бон стек
Beef short ribs | телешки ребра
Beef cheeks | телешки бузи
Stewing beef | телешко за яхния
Beef round | телешки бут
Roast beef | розбиф
Corned beef | корнед биф
Beef liver | говежди дроб
Calf liver | телешки дроб
Beef tongue | телешки език
Tripe | шкембе
Bone marrow | телешки кокали
Veal shank | телешки джолан
Pork chops | свински котлети
Pork loin | свинско каре
Pork leg | свински бут
Pork cheeks | свински бузи
Pork liver | свински дроб
Gammon | пушен свински бут
Pig trotters | свински крачета
Chicken wings | пилешки крилца
Chicken drumsticks | пилешки долни бутчета
Chicken legs | пилешки бутчета
Chicken hearts | пилешки сърца
Chicken gizzards | пилешки воденички
Turkey breast | пуешко филе
Turkey legs | пуешки бут
Ground turkey | пуешка кайма
Duck legs | патешки бут
Lamb chops | агнешки котлети
Lamb leg | агнешки бут
Lamb shoulder | агнешка плешка
Ground lamb | агнешка кайма
Rack of lamb | агнешко каре
Lamb shanks | агнешки джолан
Pheasant | фазан
Hare | заек
Wild boar | глиган
Pancetta | панчета
Lardons | бекон на кубчета
Pepperoni | пеперони
Serrano ham | серано
Speck | шпек
Bresaola | брезаола
Mortadella | мортадела
Kielbasa | полска наденица
Merguez | мергез
Pork knuckle | свински джолан
Salami | салам
Black pudding | кървавица
Doner meat | дюнер месо
Italian sausage | италиански наденици
Lukanka | луканка
Kebapche | кебапчета
Meatballs | кюфтета
Rabbit | заешко
Venison | еленско
Goose | гъска
Quail | пъдпъдък
Cod | треска
Salt cod | осолена треска
Haddock | треска хадок
Smoked haddock | пушена треска
Monkfish | морски дявол
Trout | пъстърва
Sea bream | ципура
Sardines | сардини
Anchovies | аншоа
Herring | херинга
Carp | шаран
Oysters | стриди
Clams | миди венерки
Scallops | миди сен жак
Octopus | октопод
Crab | рак
Lobster | омар
Surimi | раци сурими
Fish stock | рибен бульон
Double cream | сметана за разбиване
Single cream | течна сметана
Crème fraîche | крем фреш
Clotted cream | сметана
Fromage frais | извара
Cottage cheese | извара
Buttermilk | мътеница
Kefir | кефир
Ayran | айрян
Plant milk | растително мляко
Ghee | гхи масло
Vegan butter | маргарин
Kashkaval | кашкавал
Halloumi | халуми
Pecorino | пекорино
Stilton | синьо сирене
Emmental | ементал
Edam | едам
Camembert | камамбер
Monterey Jack | чедър
Processed cheese | топено сирене
Burrata | бурата
Custard | крем
Whipped cream | сметана спрей
Vine tomatoes | домати на клон
Plum tomatoes | домати сливовидни
Sun-dried tomatoes | сушени домати
Yellow pepper | жълта чушка
Green pepper | зелена чушка
Red pepper | червена чушка
Kapia pepper | капия
Jalapeño | халапеньо
Scotch bonnet | люти чушки
Butternut squash | тиква мускатна
Swede | ряпа
Jerusalem artichokes | земна ябълка
Artichokes | артишок
Okra | бамя
Bok choy | бок чой
Chinese cabbage | китайско зеле
Red cabbage | червено зеле
Sauerkraut | кисело зеле
Iceberg lettuce | айсберг
Chestnut mushrooms | кафяви печурки
Wild mushrooms | горски гъби
Oyster mushrooms | гъби кладница
Corn on the cob | царевица
Creamed corn | царевица консерва
Frozen peas | замразен грах
Stir-fry vegetables | зеленчуци за wok
Mixed vegetables | замразени зеленчуци
Frozen berries | замразени горски плодове
Chips | картофки замразени
Watercress | кресон
Bean sprouts | соеви кълнове
Horseradish | хрян
Baby potatoes | картофи бейби
Garlic paste | чеснова паста
Ginger paste | джинджифил паста
Vine leaves | лозови листа
Green olives | зелени маслини
Pickles | кисели краставички
Lyutenitsa | лютеница
Ajvar | айвар
Pesto | песто
Passata | пасирани домати
Tomato sauce | доматен сос
Salsa | салса
Enchilada sauce | сос енчилада
Garlic sauce | чеснов сос
Sweet chilli sauce | сладко-лют сос
Sriracha | шрирача
Teriyaki sauce | терияки сос
Hoisin sauce | хойсин сос
Dark soy sauce | тъмен соев сос
Mirin | мирин
Sake | саке
Rice vinegar | оризов оцет
Apple cider vinegar | ябълков оцет
Red wine vinegar | винен оцет
White vinegar | бял оцет
Dijon mustard | дижонска горчица
Wholegrain mustard | горчица на зърна
Mustard powder | горчица на прах
Horseradish sauce | хрян сос
Tartar sauce | сос тартар
Salad dressing | дресинг
Tabasco | табаско
Harissa | хариса
Tamarind paste | тамаринд
Thai green curry paste | зелена къри паста
Massaman curry paste | къри паста
Madras paste | къри паста
Miso | мисо паста
Gochujang | гочуджан
Coconut cream | кокосова сметана
Gravy | сос грейви
Beef stock | говежди бульон
Chicken stock | пилешки бульон
Vegetable stock | зеленчуков бульон
Stock cubes | бульон кубче
Sunflower oil | слънчогледово олио
Rapeseed oil | рапично олио
Peanut oil | фъстъчено олио
Coconut oil | кокосово масло
Truffle oil | олио с трюфел
Lard | свинска мас
Duck fat | патешка мас
Suet | лой
Cooking spray | олио спрей
Golden syrup | сироп
Treacle | меласа
Agave syrup | агаве сироп
Caster sugar | фина захар
Muscovado sugar | мусковадо
Coconut sugar | кокосова захар
Vanilla sugar | ванилова захар
Sweetener | подсладител
Plain flour | бяло брашно
Bread flour | брашно тип 500
Cornmeal | царевично брашно
Rye flour | ръжено брашно
Spelt flour | лимецово брашно
Almond flour | бадемово брашно
Potato starch | картофено нишесте
Semolina | грис
Custard powder | пудинг
Chocolate chips | шоколадови капки
Cocoa nibs | какаови зърна
Sprinkles | захарни пръчици
Food colouring | хранителен оцветител
Marzipan | марципан
Marshmallows | маршмелоу
Caramel | карамел
Meringue | целувки
Digestive biscuits | бисквити
Ladyfingers | бишкоти
Filo pastry | кори за баница
Pizza dough | тесто за пица
Crusty bread | хляб с квас
Wholegrain bread | пълнозърнест хляб
Toast bread | хляб за тост
Naan | наан
Pita | пита
Brioche | бриош
Croissants | кроасан
Taco shells | тако
Corn tortillas | царевични тортили
Crackers | крекери
Pretzels | солети
Croutons | крутони
Rusks | сухари
Penne | пене
Farfalle | фарфале
Fusilli | фузили
Macaroni | макарони
Rigatoni | ригатони
Tagliatelle | талиатели
Fettuccine | фетучини
Linguine | лингуине
Pappardelle | папарделе
Paccheri | пакери
Orzo | ориз паста
Vermicelli | фиде
Gnocchi | ньоки
Tortellini | тортелини
Udon noodles | удон
Rice noodles | оризови нудли
Egg noodles | яйчни нудли
Risotto rice | ориз за ризото
Paella rice | ориз за паеля
Sushi rice | ориз за суши
Wild rice | див ориз
Bulgur | булгур
Quinoa | киноа
Pearl barley | ечемик
Buckwheat | елда
Millet | просо
Polenta | полента
Granola | мюсли
Red lentils | червена леща
Brown lentils | кафява леща
Toor dal | дал
Cannellini beans | бял боб
Butter beans | боб бъбрек
Black beans | черен боб
Pinto beans | боб пинто
Borlotti beans | боб борлоти
Haricot beans | бял боб
Refried beans | боб пюре
Edamame | едамаме
Tofu | тофу
Tempeh | темпе
Seitan | сейтан
Hummus | хумус
Cayenne pepper | кайенски пипер
Chilli flakes | люти чушки на люспи
Cumin seeds | кимион семена
Fennel seeds | семена от резене
Fenugreek | сминдух
Saffron | шафран
Allspice | бахар
White pepper | бял пипер
Pink peppercorns | розов пипер
Celery salt | целина сол
Onion salt | лук сол
Sea salt | морска сол
Cajun seasoning | каджун
Fajita seasoning | подправка фахитас
Biryani masala | подправка бирияни
Chinese five spice | пет подправки
Za'atar | заатар
Sumac | смрадлика
Jerk seasoning | ямайска подправка
Bouquet garni | букет гарни
Savory | чубрица
Sharena sol | шарена сол
Lemongrass | лимонена трева
Kaffir lime leaves | листа от лайм
Curry leaves | къри листа
Lovage | девесил
Cinnamon sticks | канела пръчка
Vanilla pod | ванилия шушулка
Apricot jam | конфитюр кайсия
Raspberry jam | конфитюр малина
Nutella | шоколадов крем
Popcorn | пуканки
Crisps | чипс
Peanut brittle | фъстъчен крокан
Cookies | бисквитки
Christmas pudding | пудинг
Mango | манго
Pineapple | ананас
Kiwi | киви
Grapes | грозде
Watermelon | диня
Melon | пъпеш
Plums | сливи
Figs | смокини
Pomegranate | нар
Grapefruit | грейпфрут
Mandarins | мандарини
Passion fruit | маракуя
Quince | дюля
Rhubarb | ревен
Cranberries | червени боровинки
Redcurrants | френско грозде
Sultanas | стафиди
Dried fruit | сушени плодове
Prunes | сини сливи сушени
Glacé cherries | захаросани череши
Sour cherries | вишни
Orange zest | портокали
Lime juice | лайм
Orange juice | портокалов сок
Apple juice | ябълков сок
Ackee | аки
Chestnuts | кестени
Flaked almonds | бадемови люспи
Pistachios | шам фъстък
Macadamia nuts | макадамия
Brazil nuts | бразилски орех
Pumpkin seeds | тиквени семки
Chia seeds | чиа
Flax seeds | ленено семе
Poppy seeds | маково семе
Brandy | бренди
Rum | ром
Vodka | водка
Rakia | ракия
Port | порто
Sparkling water | газирана вода
Coffee | кафе
Tea | чай
Ginger cordial | сироп джинджифил
Cola | кола
Gelatine leaves | желатин листа
Ice cubes | лед
Frozen pastry | замразено тесто
Spring rolls | пролетни рулца
Tamarind | тамаринд
Quark | извара
Blue cheese | синьо сирене
Hermelín | камембер
Olomoucké tvarůžky | меко зряло сирене
Smoked cheese | пушено сирене
Bryndza | овче сирене
Žervé | крема сирене
Pomazánkové máslo | масло за мазане
Sirene | бяло саламурено сирене
Bulgarian yogurt | българско кисело мляко
Katak | катък
Salted duck eggs | осолени яйца
Century eggs | столетни яйца
Silken tofu | тофу копринено
Fried tofu | пържено тофу
Tofu skin | юба тофу
Fermented tofu | ферментирало тофу
Smoked meat | пушено месо
Špekáčky | кренвирши за печене
Párky | кренвирши
Klobása | наденица пушена
Jitrnice | дробен колбас
Head cheese | пача
Smoked bacon | пушен бекон
Pork neck | свински врат
Pork shoulder | свинска плешка
Beef sirloin | телешко филе
Beef chuck | телешка плешка
Sujuk | суджук
Pastarma | пастърма
Elenski but | еленски бут
Chinese sausage | китайска наденица
Char siu | свинско чар сиу
Pork belly | свинско бекон гърди
Duck breast | патешки гърди
Fish cake | рибни кюфтенца
Dried shrimp | сушени скариди
Dried scallops | сушени миди сен жак
Bonito flakes | бонито флейкс
Eel | змиорка
Salmon roe | хайвер сьомга
Fish roe | хайвер
Sashimi-grade fish | риба за суши
Pike perch | бяла риба сулка
Daikon | дайкон
Lotus root | корен лотос
Bamboo shoots | бамбукови издънки
Water chestnuts | водни кестени
Wood ear mushrooms | гъби черни дървесни
Enoki mushrooms | гъби еноки
King oyster mushrooms | гъби ерингии
Shimeji mushrooms | гъби шимеджи
Maitake mushrooms | гъби майтаке
Porcini | манатарки
Gai lan | китайски броколи
Choy sum | чой сум
Garlic chives | китайски лук
Chinese celery | китайска целина
Snow peas | грах захарен шушулки
Bitter melon | горчив пъпеш
Winter melon | восъчна тиква
Taro | таро
Burdock root | корен репей
Kabocha | тиква хокайдо
Shiso | шисо
Mitsuba | японски магданоз
Thai basil | тайландски босилек
Japanese cucumber | краставица
Negi | праз
Sweet potato leaves | воден спанак
Konjac | конджак
Bulgarian peppers | чушки
Green tomatoes | зелени домати
Kohlrabi | алабаш
Savoy cabbage | савойско зеле
Root parsley | магданоз корен
Potato dumplings | картофени кнедли
Bread dumplings | кнедли
Bread rolls | питки
Rye bread | ръжен хляб
Wafers | вафли
Gingerbread spice | подправка за меденки
Ground poppy seeds | мак млян
Plum butter | сливов мармалад
Rose jam | сладко от рози
Halva | тахан халва
Kori za banitsa | кори за баница
Medium-coarse flour | брашно тип 500
Coarse flour | брашно грис
Fine flour | брашно бяло
Rum flavouring | есенция ром
Lard cracklings | пръжки
Glutinous rice | ориз лепкав
Glutinous rice flour | брашно от лепкав ориз
Rice flour | оризово брашно
Tapioca starch | нишесте тапиока
Tempura flour | брашно темпура
Kinako | соево брашно
Matcha | матча
Agar | агар агар
Red bean paste | паста от червен боб
Mochi | мочи
Glass noodles | стъклени нудли
Soba noodles | нудли соба
Ramen | нудли рамен
Somen noodles | нудли сомен
Shirataki noodles | нудли ширатаки
Wheat noodles | пшенични нудли
Wonton wrappers | кори за уонтон
Dumpling wrappers | кори за гьоза
Rice paper | оризова хартия
Mung beans | мунг боб
Adzuki beans | адзуки боб
Black soybeans | черна соя
Goji berries | годжи бери
Red dates | хинап
Lotus seeds | семена лотос
Yuzu | юзу
Umeboshi | умебоши
Black sesame seeds | черен сусам
Shaoxing wine | вино шаосин
Chinese black vinegar | черен оцет
Doubanjiang | лют бобов сос
Fermented black beans | ферментирал черен боб
Black bean sauce | сос черен боб
Sweet bean sauce | сладък бобов сос
Chilli oil | лют олио чили
Sichuan peppercorns | сечуански пипер
Dried chillies | сушени люти чушки
Cassia bark | касия канела
MSG | глутамат
Chicken powder | пилешки бульон на прах
Rock sugar | захар кристална
XO sauce | XO сос
Plum sauce | сливов сос
Char siu sauce | сос чар сиу
Hot pot base | основа за хот пот
Chinese sesame paste | сусамов тахан
Light soy sauce | светъл соев сос
Japanese soy sauce | соев сос кикоман
Ponzu | понзу
Tonkatsu sauce | сос тонкацу
Okonomiyaki sauce | сос окономияки
Japanese mayonnaise | майонеза кюпи
Sushi vinegar | оцет за суши
Mentsuyu | менцую
Yuzu kosho | юзу кошо
Japanese curry roux | японско къри
Red miso | червено мисо
Sesame dressing | сусамов дресинг
Wasabi | уасаби
Pickled ginger | маринован джинджифил
Takuan | маринован дайкон
Natto | нато
Dashi | даши
Kombu | комбу
Nori | нори
Wakame | уакаме
Hijiki | хиджики
Furikake | фурикаке
Shichimi togarashi | шичими тогараши
Japanese rice | ориз за суши
Sake lees | саке касу
Rice wine | оризово вино
Boza | боза
Becherovka | бехеровка
Slivovice | сливова ракия
Mead | медовина
Kvass | квас
Cream of tartar | винен камък
Chickpea flour | нахутено брашно
Nut butter | ядково масло
Condensed soup | крем супа
Garlic salt | чеснова сол
Lemon pepper | лимонов пипер
Ginger ale | джинджър ейл
`

export const BULGARIAN = new Map(
  LINES.trim()
    .split('\n')
    .map((line) => line.split('|').map((s) => s.trim()))
    .map(([name, bg]) => [name.toLowerCase(), bg ?? '']),
)

// eBag search words that are not what a Bulgarian recipe means by the word:
// "сирене" is white brine cheese, "сметана" cream, "извара" quark, "краставица" any cucumber
export const SEARCH_ONLY = new Set(['cheese', 'clotted cream', 'fromage frais', 'cottage cheese', 'japanese cucumber'])

// How Bulgarian recipes name ingredients, besides the search words above
// ("масло", "лимон", "гъби"); words ending in -та, -те, -ът are matched without them
export const BULGARIAN_ALIASES = `
Butter | масло, краве масло
Milk | мляко
Chicken | пиле, пилешко, пилешко месо
Salt and pepper | сол и пипер
Cream | сметана, готварска сметана, течна сметана
Sirene | сирене, саламурено сирене
Quark | извара
Cucumber | краставица
Eggs | яйце
Egg yolks | жълтък, жълтъци
Egg whites | белтък, белтъци
Lemon | лимон
Lemon juice | лимонов сок, сок от лимон
Lemon zest | лимонова кора, кора от лимон
Ground beef | кайма, смляно месо
Chicken breast | пилешки гърди, пилешко филе
Mint | джоджен, мента
Mushrooms | гъби, печурки
Courgette | тиквичка, тиквички
Dark chocolate | шоколад, черен шоколад
Vanilla | ванилин, ванилия
Chilli | люта чушка, лют пипер
Cornstarch | нишесте
Baking soda | сода
Beef stock | телешки бульон, говежди бульон
Plant milk | бадемово мляко, овесено мляко, соево мляко
Coconut milk | кокосово мляко
`
