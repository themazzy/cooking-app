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
`

export const BULGARIAN = new Map(
  LINES.trim()
    .split('\n')
    .map((line) => line.split('|').map((s) => s.trim()))
    .map(([name, bg]) => [name.toLowerCase(), bg ?? '']),
)
