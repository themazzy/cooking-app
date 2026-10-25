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
`

export const BULGARIAN = new Map(
  LINES.trim()
    .split('\n')
    .map((line) => line.split('|').map((s) => s.trim()))
    .map(([name, bg]) => [name.toLowerCase(), bg ?? '']),
)
