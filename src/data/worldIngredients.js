// More of the catalog: Czech, Bulgarian, Chinese and Japanese ingredients,
// same line format as ingredients.js (Name | aisle | picture | other names |
// counts as). Names stay English; other names add the local words, so Czech
// or Bulgarian recipes and receipts find them too.

export const WORLD_LINES = `
Quark | Dairy & eggs |  | tvaroh, měkký tvaroh, tučný tvaroh, polotučný tvaroh, tvrdý tvaroh, curd cheese, izvara, извара, twaróg
Blue cheese | Dairy & eggs |  | niva, gorgonzola, roquefort, danish blue | Cheese
Hermelín | Dairy & eggs |  | hermelin | Camembert
Olomoucké tvarůžky | Dairy & eggs |  | tvarůžky, olomoucke tvaruzky, aged soft cheese | Cheese
Smoked cheese | Dairy & eggs |  | uzený sýr, uzeny syr, oštěpek, korbáčik, parenica | Cheese
Bryndza | Dairy & eggs |  | brynza, sheep cheese | Cheese
Žervé | Dairy & eggs |  | zerve, lučina, lucina, fresh cheese | Cream cheese
Pomazánkové máslo | Dairy & eggs |  | pomazankove maslo, butter spread | Butter
Sirene | Dairy & eggs |  | сирене, бяло сирене, bulgarian white cheese, white brined cheese, balkan cheese | Feta
Bulgarian yogurt | Dairy & eggs |  | kiselo mlyako, кисело мляко, bulgarian yoghurt | Yogurt
Katak | Dairy & eggs |  | катък | Yogurt
Salted duck eggs | Dairy & eggs |  | salted egg, salted eggs, 咸鸭蛋 | Eggs
Century eggs | Dairy & eggs |  | century egg, preserved egg, pidan, 皮蛋 | Eggs
Silken tofu | Dairy & eggs |  | soft tofu, 嫩豆腐, kinugoshi | Tofu
Fried tofu | Dairy & eggs |  | aburaage, abura-age, inari tofu, tofu puffs, 油豆腐 | Tofu
Tofu skin | Dairy & eggs |  | yuba, bean curd sheet, bean curd skin, 腐竹 | Tofu
Fermented tofu | Oils & sauces |  | fermented bean curd, furu, 腐乳
Smoked meat | Meat |  | uzené, uzene, uzené maso, uzene maso, smoked pork, kasseler, uzená krkovice
Špekáčky | Meat |  | spekacky, špekáček, spekacek | Sausages
Párky | Meat |  | parky, párek, vídeňské párky, viennese sausages | Sausages
Klobása | Meat |  | klobasa, klobásy, kabanos, debrecínka | Sausages
Jitrnice | Meat |  | jitrnice, liver sausage
Head cheese | Meat |  | tlačenka, tlacenka, brawn
Smoked bacon | Meat |  | uzená slanina, uzena slanina, anglická slanina, slanina | Bacon
Pork neck | Meat |  | krkovice, vepřová krkovice, свински врат | Pork
Pork shoulder | Meat |  | vepřová plec, veprova plec, plec | Pork
Beef sirloin | Meat |  | svíčková, svickova, hovězí svíčková, roštěnec, rostenec | Beef
Beef chuck | Meat |  | hovězí kližka, klizka, hovězí plec, beef shoulder | Beef
Sujuk | Meat |  | sudzhuk, суджук, sucuk
Pastarma | Meat |  | пастърма, pastirma, pastrami
Elenski but | Meat |  | еленски бут, bulgarian cured ham | Prosciutto
Chinese sausage | Meat |  | lap cheong, lup cheong, lap chong, 腊肠
Char siu | Meat |  | chinese bbq pork, cha siu, 叉烧 | Pork
Pork belly | Meat |  | vepřový bůček, bucek, bůček, samgyeopsal, 五花肉 | Pork
Duck breast | Meat |  | kachní prsa | Duck
Fish cake | Fish |  | kamaboko, narutomaki, chikuwa, fish balls | Surimi
Dried shrimp | Fish |  | 虾米, ebi, sakura ebi | Prawns
Dried scallops | Fish |  | conpoy, 干贝 | Scallops
Bonito flakes | Fish |  | katsuobushi, katsuo bushi, 鰹節, かつおぶし
Eel | Fish |  | unagi, kabayaki, úhoř
Salmon roe | Fish |  | ikura, いくら
Fish roe | Fish |  | tobiko, masago, mentaiko, tarako, caviar
Sashimi-grade fish | Fish |  | sashimi, sashimi tuna, sashimi salmon
Pike perch | Fish |  | candát, candat, zander, сулка
Daikon | Vegetables |  | daikon radish, mooli, white radish, 大根, ředkev
Lotus root | Vegetables |  | renkon, 莲藕
Bamboo shoots | Vegetables |  | bamboo shoot, takenoko, 竹笋
Water chestnuts | Vegetables |  | water chestnut, 马蹄
Wood ear mushrooms | Vegetables |  | wood ear, black fungus, cloud ear, kikurage, jidášovo ucho, 木耳 | Mushrooms
Enoki mushrooms | Vegetables |  | enoki, enokitake, 金针菇 | Mushrooms
King oyster mushrooms | Vegetables |  | king oyster, eryngii, trumpet mushrooms | Mushrooms
Shimeji mushrooms | Vegetables |  | shimeji, beech mushrooms | Mushrooms
Maitake mushrooms | Vegetables |  | maitake, hen of the woods | Mushrooms
Porcini | Vegetables |  | hřiby, hriby, sušené houby, susene houby, dried mushrooms, ceps, манатарки | Mushrooms
Gai lan | Vegetables |  | kai lan, chinese kale, 芥兰 | Broccoli
Choy sum | Vegetables |  | yu choy, 菜心 | Bok choy
Garlic chives | Vegetables |  | chinese chives, nira, 韭菜 | Chives
Chinese celery | Vegetables |  | 芹菜 | Celery
Snow peas | Vegetables |  | mangetout, snow pea | Sugar snap peas
Bitter melon | Vegetables |  | bitter gourd, goya, 苦瓜
Winter melon | Vegetables |  | wax gourd, 冬瓜
Taro | Vegetables |  | satoimo, 芋头
Burdock root | Vegetables |  | gobo, gobō
Kabocha | Vegetables |  | kabocha squash, japanese pumpkin, hokkaido, dýně hokkaido | Pumpkin
Shiso | Herbs |  | perilla, ooba, 紫苏
Mitsuba | Herbs |  | japanese parsley
Thai basil | Herbs |  | holy basil, 九层塔 | Basil
Japanese cucumber | Vegetables |  | kyuri | Cucumber
Negi | Vegetables |  | welsh onion, japanese leek, 大葱 | Leek
Sweet potato leaves | Vegetables |  | kangkong, water spinach, morning glory, 空心菜 | Spinach
Konjac | Vegetables |  | konnyaku, 蒟蒻
Bulgarian peppers | Vegetables |  | шипка, shipka, chushki, чушки | Bell pepper
Green tomatoes | Vegetables |  | zelená rajčata, зелени домати | Tomatoes
Kohlrabi | Vegetables |  | kedluben, kedlubna, алабаш
Savoy cabbage | Vegetables |  | kapusta, kel, savoy | Cabbage
Root parsley | Vegetables |  | petržel kořen, kořenová petržel, hamburg parsley
Potato dumplings | Pasta & grains |  | bramborové knedlíky, bramborove knedliky, bramborový knedlík
Bread dumplings | Bakery |  | houskové knedlíky, houskove knedliky, knedlík, knedlíky, knedlik
Bread rolls | Bakery |  | rolls, rohlík, rohlíky, rohlik, rohliky, houska, housky, kaiser rolls | Bread
Rye bread | Bakery |  | chléb, chleba, chleb, žitný chléb, ржан хляб | Bread
Wafers | Bakery |  | oplatky, lázeňské oplatky
Gingerbread spice | Spices |  | perníkové koření, pernikove koreni, perníkové, gingerbread spice mix
Ground poppy seeds | Nuts & seeds |  | mletý mák, mlety mak, mák, mak, мак | Poppy seeds
Plum butter | Oils & sauces |  | povidla, švestková povidla, powidl, lekvar, слива мармалад | Jam
Rose jam | Oils & sauces |  | rose petal jam, сладко от рози | Jam
Halva | Other |  | halwa, tahan halva, тахан халва, халва
Kori za banitsa | Baking |  | кори за баница, banitsa sheets | Filo pastry
Medium-coarse flour | Baking |  | polohrubá mouka, polohruba mouka, polohrubá | Flour
Coarse flour | Baking |  | hrubá mouka, hruba mouka | Flour
Fine flour | Baking |  | hladká mouka, hladka mouka, hladká | Plain flour
Rum flavouring | Baking |  | rumové aroma, rumove aroma, tuzemák, tuzemak, rum aroma
Lard cracklings | Meat |  | škvarky, skvarky, pork cracklings, pork scratchings
Glutinous rice | Pasta & grains |  | sticky rice, sweet rice, mochigome, 糯米 | Rice
Glutinous rice flour | Baking |  | sweet rice flour, mochiko, shiratamako, 糯米粉
Rice flour | Baking |  | rýžová mouka, joshinko
Tapioca starch | Baking |  | tapioca flour, tapioca
Tempura flour | Baking |  | tempura batter mix
Kinako | Baking |  | roasted soybean flour, きな粉
Matcha | Drinks |  | matcha powder, green tea powder, 抹茶
Agar | Baking |  | agar agar, kanten, 寒天
Red bean paste | Baking |  | anko, adzuki bean paste, 红豆沙, あんこ
Mochi | Other |  | rice cake, rice cakes, 年糕, nian gao, tteok
Glass noodles | Pasta & grains |  | cellophane noodles, mung bean noodles, bean thread noodles, harusame, 粉丝 | Noodles
Soba noodles | Pasta & grains |  | soba, buckwheat noodles | Noodles
Ramen | Pasta & grains |  | ramen noodle, instant noodles, chuka soba | Noodles
Somen noodles | Pasta & grains |  | somen | Noodles
Shirataki noodles | Pasta & grains |  | shirataki, konjac noodles | Noodles
Wheat noodles | Pasta & grains |  | lo mein, lo mein noodles, chow mein noodles, hokkien noodles, lamian, 面条 | Noodles
Wonton wrappers | Bakery |  | wonton skins, 馄饨皮
Dumpling wrappers | Bakery |  | gyoza wrappers, dumpling skins, potsticker wrappers, 饺子皮
Rice paper | Bakery |  | rice paper wrappers, spring roll wrappers, banh trang
Mung beans | Pasta & grains |  | mung bean, 绿豆 | Beans
Adzuki beans | Pasta & grains |  | azuki beans, red beans, 红豆 | Beans
Black soybeans | Pasta & grains |  | kuromame | Beans
Goji berries | Fruit |  | wolfberries, 枸杞
Red dates | Fruit |  | jujube, jujubes, 红枣
Lotus seeds | Nuts & seeds |  | 莲子
Yuzu | Fruit |  | yuzu juice, ゆず
Umeboshi | Oils & sauces |  | pickled plum, ume, 梅干し
Black sesame seeds | Nuts & seeds |  | black sesame, 黑芝麻 | Sesame seeds
Shaoxing wine | Drinks |  | shaoxing, chinese cooking wine, shaoxing rice wine, huangjiu, 绍兴酒
Chinese black vinegar | Oils & sauces |  | chinkiang vinegar, zhenjiang vinegar, black vinegar, 镇江香醋 | Vinegar
Doubanjiang | Oils & sauces |  | chilli bean paste, chili bean paste, chilli bean sauce, broad bean paste, toban djan, 豆瓣酱
Fermented black beans | Oils & sauces |  | douchi, salted black beans, 豆豉
Black bean sauce | Oils & sauces |  | black bean garlic sauce
Sweet bean sauce | Oils & sauces |  | tianmianjiang, sweet flour sauce, 甜面酱
Chilli oil | Oils & sauces |  | chili oil, chilli crisp, chili crisp, lao gan ma, rayu, la-yu, 辣椒油
Sichuan peppercorns | Spices |  | szechuan pepper, sichuan pepper, huajiao, sansho, 花椒
Dried chillies | Spices |  | dried chilies, dried red chillies, sušené chilli, 干辣椒 | Chilli
Cassia bark | Spices |  | chinese cinnamon, 桂皮 | Cinnamon
MSG | Spices |  | monosodium glutamate, ajinomoto, glutamát, 味精
Chicken powder | Spices |  | chicken bouillon powder, 鸡精 | Stock
Rock sugar | Baking |  | 冰糖, crystal sugar | Sugar
XO sauce | Oils & sauces |  | xo
Plum sauce | Oils & sauces |  | duck sauce, 梅子酱
Char siu sauce | Oils & sauces |  | chinese bbq sauce, 叉烧酱
Hot pot base | Oils & sauces |  | hotpot base, 火锅底料
Chinese sesame paste | Oils & sauces |  | 芝麻酱, zhima jiang | Tahini
Light soy sauce | Oils & sauces |  | 生抽, usukuchi | Soy sauce
Japanese soy sauce | Oils & sauces |  | shoyu, kikkoman, しょうゆ | Soy sauce
Ponzu | Oils & sauces |  | ponzu sauce, ポン酢
Tonkatsu sauce | Oils & sauces |  | bulldog sauce, katsu sauce
Okonomiyaki sauce | Oils & sauces |  | otafuku sauce
Japanese mayonnaise | Oils & sauces |  | kewpie, kewpie mayo, kewpie mayonnaise | Mayonnaise
Sushi vinegar | Oils & sauces |  | sushizu, seasoned rice vinegar | Rice vinegar
Mentsuyu | Oils & sauces |  | tsuyu, noodle soup base, soba sauce
Yuzu kosho | Oils & sauces |  | yuzukosho
Japanese curry roux | Oils & sauces |  | curry roux, golden curry, japanese curry blocks
Red miso | Oils & sauces |  | aka miso | Miso
Sesame dressing | Oils & sauces |  | goma dressing, goma dare
Wasabi | Oils & sauces |  | wasabi paste, わさび
Pickled ginger | Oils & sauces |  | gari, sushi ginger, beni shoga
Takuan | Oils & sauces |  | pickled daikon, takuwan
Natto | Dairy & eggs |  | nattō, 納豆
Dashi | Oils & sauces |  | dashi stock, hondashi, dashi powder, だし | Stock
Kombu | Other |  | konbu, kelp, dried kelp, 昆布
Nori | Other |  | nori sheets, seaweed sheets, laver, 海苔
Wakame | Other |  | wakame seaweed, dried seaweed, わかめ
Hijiki | Other |  | hijiki seaweed
Furikake | Spices |  | rice seasoning
Shichimi togarashi | Spices |  | shichimi, togarashi, seven spice, ichimi | Chilli flakes
Japanese rice | Pasta & grains |  | short grain rice, japonica rice, calrose | Rice
Sake lees | Other |  | sake kasu
Rice wine | Drinks |  | mijiu, 米酒, makgeolli
Boza | Drinks |  | боза
Becherovka | Drinks |  | becherovka liqueur
Slivovice | Drinks |  | slivovitz, plum brandy | Rakia
Mead | Drinks |  | medovina
Kvass | Drinks |  | kvas, квас
`

// Czech words for ingredients already in the catalog, in the forms recipes
// use them ("2 mrkve", "cibuli"). Bulgarian words come from bulgarian.js.
export const CZECH_ALIASES = `
Beef | hovězí, hovězí maso, hovezi maso
Ground beef | mleté hovězí, mleté hovězí maso, hovězí mleté maso, mleté maso, mletého masa
Veal | telecí, telecí maso
Pork | vepřové, vepřové maso, veprove maso, vepřová kýta, vepřová panenka
Ground pork | mleté vepřové, mleté vepřové maso
Bacon | slaninu, anglickou slaninu
Ham | šunka, šunku, sunka, šunky
Sausages | uzenina, uzeniny
Chicken | kuře, kuřecí maso, kureci maso, kuřete
Chicken breast | kuřecí prsa, kureci prsa, kuřecí prsní řízky, kuřecí řízky, kuřecí prsíčka
Chicken thighs | kuřecí stehna, kuřecí stehýnka, kureci stehna
Chicken liver | kuřecí játra, kureci jatra, játra
Turkey | krůtí, krůtí maso, krůtí prsa
Duck | kachna, kachnu, kachní, kachní stehna
Goose | husa, husu, husí
Lamb | jehněčí, jehněčí maso, skopové
Rabbit | králík, králíka, kralik
Venison | zvěřina, srnčí, jelení
Salmon | losos, lososa, lososí filet
Tuna | tuňák, tuňáka, tunak
Cod | treska, tresku, tresčí filé
Trout | pstruh, pstruha
Carp | kapr, kapra
Herring | sleď, sledě, matjes
Mackerel | makrela, makrelu
Prawns | krevety, krevet, kreveta
Eggs | vejce, vajíčka, vajec, vajíčko, vajicka
Egg yolks | žloutek, žloutky, žloutků, zloutky
Egg whites | bílek, bílky, bílků, bilky, sníh z bílků
Milk | mléko, mléka, mleko, plnotučné mléko, polotučné mléko
Butter | máslo, másla, maslo, máslem
Cream | smetana, smetanu, smetany, smetana ke šlehání, smetanu ke šlehání, šlehačka, šlehačku, smetana na vaření
Sour cream | zakysaná smetana, zakysanou smetanu, kysaná smetana, kyselá smetana
Yogurt | jogurt, bílý jogurt, bily jogurt
Greek yogurt | řecký jogurt, recky jogurt
Cream cheese | krémový sýr, cream sýr
Mascarpone | mascarpone
Cheese | sýr, sýra, syr, strouhaný sýr, tvrdý sýr
Parmesan | parmazán, parmazan, grana padano
Mozzarella | mozzarella, mozzarellu
Edam | eidam, eidamu, eidam 30%
Gouda | gouda, goudu
Emmental | ementál, ementaler
Cottage cheese | cottage, žervé cottage
Processed cheese | tavený sýr, taveny syr, tavený sýrek
Buttermilk | podmáslí, podmasli
Kefir | kefír
Onion | cibule, cibuli, cibulka, cibulku, cibulí
Red onion | červená cibule, červenou cibuli
Spring onions | jarní cibulka, jarní cibulku, jarni cibulka
Shallots | šalotka, šalotky, šalotku
Leek | pórek, pórku, porek
Garlic | česnek, česneku, stroužky česneku, cesnek
Ginger | zázvor, zázvoru, zazvor
Potatoes | brambory, bramboru, brambor, bramborami
Sweet potatoes | batáty, batát, sladké brambory
Carrots | mrkev, mrkve, mrkví, mrkvi
Celery | řapíkatý celer, řapíkový celer
Celeriac | celer, celeru, bulvový celer
Tomatoes | rajčata, rajče, rajčat, rajcata
Cherry tomatoes | cherry rajčata, cherry rajčátka, cherry rajčat
Cucumber | okurka, okurku, salátová okurka
Bell pepper | papriku, papriky, paprik, červená paprika, zelená paprika, žlutá paprika
Chilli | chilli paprička, chilli papričky, feferonka, feferonky
Courgette | cuketa, cuketu, cukety
Aubergine | lilek, lilku
Mushrooms | žampiony, žampionů, houby, hub, zampiony
Broccoli | brokolice, brokolici
Cauliflower | květák, květáku, kvetak
Cabbage | zelí, hlávkové zelí, bílé zelí
Red cabbage | červené zelí, cervene zeli
Brussels sprouts | růžičková kapusta
Kale | kadeřávek
Spinach | špenát, špenátu, spenat, baby špenát
Lettuce | salát, hlávkový salát, ledový salát
Rocket | rukola, rukolu
Asparagus | chřest, chřestu
Green beans | zelené fazolky, fazolky
Peas | hrášek, hrášku, hrasek
Sweetcorn | kukuřice, kukuřici, kukurice
Pumpkin | dýně, dýni, dyne
Beetroot | červená řepa, řepa, řepu, cervena repa
Radishes | ředkvičky, ředkvička, redkvicky
Fennel | fenykl
Parsnip | pastinák, pastinak
Sauerkraut | kysané zelí, kysane zeli, kyselé zelí
Horseradish | křen, křenu, kren
Pickles | sterilované okurky, kyselé okurky, okurky ve sladkokyselém nálevu, nakládané okurky
Lemon | citron, citronu, citrón
Lemon juice | citronová šťáva, citronovou šťávu, šťáva z citronu
Lemon zest | citronová kůra, kůra z citronu
Lime | limetka, limetku, limetky
Orange | pomeranč, pomeranče
Apples | jablka, jablko, jablek
Pears | hrušky, hruška, hrušek
Banana | banán, banány, banánu
Strawberries | jahody, jahod
Raspberries | maliny, malin
Blueberries | borůvky, borůvek
Cherries | třešně, třešní
Sour cherries | višně, višní
Peaches | broskve, broskev
Apricots | meruňky, meruněk
Plums | švestky, švestek, slivky
Raisins | rozinky, rozinek
Walnuts | vlašské ořechy, vlašských ořechů, ořechy
Hazelnuts | lískové ořechy, lískových ořechů
Almonds | mandle, mandlí
Poppy seeds | mák celý
Sunflower seeds | slunečnicová semínka
Pumpkin seeds | dýňová semínka
Parsley | petržel, petrželka, petrželku, petrželová nať, petrželovou nať
Dill | kopr, kopru
Chives | pažitka, pažitku, pazitka
Basil | bazalka, bazalku
Thyme | tymián, tymiánu
Rosemary | rozmarýn, rozmarýnu
Oregano | oregáno
Marjoram | majoránka, majoránku, majoranka
Bay leaves | bobkový list, bobkové listy, bobkového listu
Lovage | libeček, libečku
Mint | máta, mátu
Coriander | koriandr, koriandrová nať
Salt | sůl, soli, sul
Black pepper | pepř, pepře, mletý pepř, celý pepř, pepr
Paprika | sladká paprika, mletá paprika, mleta paprika
Smoked paprika | uzená paprika, uzenou papriku
Chilli powder | pálivá paprika, mleté chilli
Caraway seeds | kmín, kmínu, kmin
Cumin | římský kmín, rimsky kmin, kmín římský
Allspice | nové koření, nove koreni, nového koření
Cloves | hřebíček, hřebíčky, hrebicek
Cinnamon | skořice, skořici, skorice
Nutmeg | muškátový oříšek, muškátový květ
Star anise | badyán, badyan
Vanilla | vanilka, vanilkový lusk
Flour | mouka, mouky, mouku
Wholemeal flour | celozrnná mouka, celozrnnou mouku
Rye flour | žitná mouka, žitnou mouku
Spelt flour | špaldová mouka
Cornstarch | kukuřičný škrob, solamyl, maizena
Potato starch | bramborový škrob, holandský škrob
Sugar | cukr, cukru, krystal, krystalový cukr, krupicový cukr, krupicák
Icing sugar | moučkový cukr, moučkového cukru, moučka
Brown sugar | třtinový cukr, trtinovy cukr
Vanilla sugar | vanilkový cukr, vanilinový cukr, vanilinový
Honey | med, medu
Baking powder | kypřicí prášek, prášek do pečiva, kypřící prášek
Baking soda | jedlá soda, jedlou sodu
Yeast | droždí, kvasnice, sušené droždí
Cocoa | kakao, kakaa
Dark chocolate | hořká čokoláda, hořkou čokoládu, čokoláda na vaření
Gelatine | želatina, želatinu
Puff pastry | listové těsto, listového těsta
Semolina | krupice, krupici, dětská krupička, krupička
Breadcrumbs | strouhanka, strouhanku, strouhanky
Rice | rýže, rýži, ryze
Pasta | těstoviny, těstovin, testoviny
Spaghetti | špagety, špaget
Noodles | nudle, nudlí
Oats | ovesné vločky, ovesných vloček, vločky
Lentils | čočka, čočku, cocka
Chickpeas | cizrna, cizrnu
Beans | fazole, fazolí
Pearl barley | kroupy, krup
Buckwheat | pohanka, pohanku
Millet | jáhly, jáhel
Bread | chlebíček, toustový chléb
Olive oil | olivový olej, olivovým olejem
Vegetable oil | olej, rostlinný olej, slunečnicový olej
Vinegar | ocet, octa, octem, kvasný ocet
Mustard | hořčice, hořčici, plnotučná hořčice
Ketchup | kečup
Mayonnaise | majonéza, majonézu
Tomato paste | rajčatový protlak, protlak, protlaku
Canned tomatoes | loupaná rajčata, drcená rajčata, rajčata v plechovce
Stock | vývar, vývaru, bujón, bujon
Stock cubes | masox, bujónová kostka, bujon kostka
Jam | marmeláda, marmeládu, džem, džemu
Lard | sádlo, sádla, vepřové sádlo
Water | voda, vody, vodu
White wine | bílé víno, bílého vína
Red wine | červené víno, červeného vína
Beer | pivo, piva
Rum | rum, tuzemský rum
`
