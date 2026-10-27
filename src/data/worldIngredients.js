// More of the catalog: Czech, Bulgarian, Chinese and Japanese ingredients,
// same line format as ingredients.js (Name | aisle | picture | other names |
// counts as). Names stay English; other names add the local words, so Czech
// or Bulgarian recipes and receipts find them too.

export const WORLD_LINES = `
Quark | Dairy & eggs |  | tvaroh, tvarohu, tvarohem, měkký tvaroh, tučný tvaroh, polotučný tvaroh, tvrdý tvaroh, curd cheese, izvara, извара, twaróg
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
Smoked meat | Meat | /ingredients/smoked-meat.webp | uzené, uzene, uzené maso, uzene maso, smoked pork, kasseler, uzená krkovice
Špekáčky | Meat | /ingredients/spekacky.webp | spekacky, špekáček, spekacek | Sausages
Párky | Meat | /ingredients/parky.webp | parky, párek, vídeňské párky, viennese sausages | Sausages
Klobása | Meat | /ingredients/klobasa.webp | klobasa, klobásy, kabanos, debrecínka | Sausages
Jitrnice | Meat | /ingredients/jitrnice.webp | jitrnice, liver sausage
Head cheese | Meat | /ingredients/head-cheese.webp | tlačenka, tlacenka, brawn
Smoked bacon | Meat | /ingredients/smoked-bacon.webp | uzená slanina, uzena slanina, anglická slanina, slanina | Bacon
Pork neck | Meat | /ingredients/pork-neck.webp | krkovice, vepřová krkovice, свински врат | Pork
Pork shoulder | Meat | /ingredients/pork-shoulder.webp | vepřová plec, veprova plec, plec | Pork
Beef sirloin | Meat | /ingredients/beef-sirloin.webp | svíčková, svickova, hovězí svíčková, roštěnec, rostenec, sirloin, sirloin steak, striploin, strip steak | Beef
Beef chuck | Meat | /ingredients/beef-chuck.webp | hovězí kližka, klizka, hovězí plec, beef shoulder | Beef
Sujuk | Meat | /ingredients/sujuk.webp | sudzhuk, суджук, sucuk
Pastarma | Meat | /ingredients/pastarma.webp | пастърма, pastirma, pastrami
Elenski but | Meat | Prosciutto | еленски бут, bulgarian cured ham | Prosciutto
Chinese sausage | Meat | /ingredients/chinese-sausage.webp | lap cheong, lup cheong, lap chong, 腊肠
Char siu | Meat | /ingredients/char-siu.webp | chinese bbq pork, cha siu, 叉烧 | Pork
Pork belly | Meat | /ingredients/pork-belly.webp | vepřový bůček, bucek, bůček, samgyeopsal, 五花肉 | Pork
Duck breast | Meat | /ingredients/duck-breast.webp | kachní prsa | Duck
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
Thai basil | Herbs | Basil | holy basil, 九层塔 | Basil
Japanese cucumber | Vegetables |  | kyuri | Cucumber
Negi | Vegetables |  | welsh onion, japanese leek, 大葱 | Leek
Sweet potato leaves | Vegetables |  | kangkong, water spinach, morning glory, 空心菜 | Spinach
Konjac | Vegetables |  | konnyaku, 蒟蒻
Bulgarian peppers | Vegetables |  | шипка, shipka, chushki, чушки | Bell pepper
Green tomatoes | Vegetables |  | zelená rajčata, зелени домати | Tomatoes
Kohlrabi | Vegetables |  | kedluben, kedlubna, алабаш
Savoy cabbage | Vegetables |  | kapusta, kapustu, kapusty, kel, savoy | Cabbage
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
Lard cracklings | Meat | /ingredients/lard-cracklings.webp | škvarky, skvarky, pork cracklings, pork scratchings
Ribeye steak | Meat | /ingredients/ribeye-steak.webp | ribeye, rib eye, rib-eye, rib eye steak, entrecote, vysoký roštěnec | Steak
Rump steak | Meat | /ingredients/rump-steak.webp | rump, hovězí květová špička, květová špička | Steak
Flank steak | Meat | /ingredients/flank-steak.webp | flank, bavette | Steak
Skirt steak | Meat | /ingredients/skirt-steak.webp | skirt, hanger steak, onglet | Steak
T-bone steak | Meat | /ingredients/t-bone-steak.webp | t bone, t bone steak, porterhouse, porterhouse steak | Steak
Beef short ribs | Meat | /ingredients/beef-short-ribs.webp | short ribs, beef ribs, hovězí žebra, hovězí žebro | Beef
Beef cheeks | Meat | /ingredients/beef-cheeks.webp | beef cheek, ox cheek, ox cheeks, hovězí líčka, hovezi licka | Beef
Stewing beef | Meat | /ingredients/stewing-beef.webp | stewing steak, beef chunks, beef cubes, diced beef, goulash meat, gulášové maso, hovězí na guláš, hovězí přední | Beef
Beef round | Meat | /ingredients/beef-round.webp | topside, silverside, beef round, hovězí kýta, hovezi kyta, hovězí ořech | Beef
Roast beef | Meat | /ingredients/roast-beef.webp | rare roast beef, sliced roast beef, rostbíf | Beef
Corned beef | Meat | /ingredients/corned-beef.webp | salt beef | Beef
Beef liver | Meat | /ingredients/beef-liver.webp | ox liver, hovězí játra
Calf liver | Meat | /ingredients/calf-liver.webp | calf's liver, calves liver, veal liver, telecí játra
Beef tongue | Meat | /ingredients/beef-tongue.webp | ox tongue, tongue, hovězí jazyk, jazyk
Tripe | Meat | /ingredients/tripe.webp | honeycomb tripe, dršťky, drstky, шкембе
Bone marrow | Meat | /ingredients/bone-marrow.webp | marrow bones, marrow bone, morkové kosti, morek
Veal shank | Meat | /ingredients/veal-shank.webp | osso buco, ossobuco, veal shanks, telecí kolínko | Veal
Pork chops | Meat | /ingredients/pork-chops.webp | pork chop, pork cutlets, vepřová kotleta, vepřové kotlety, kotlety, kotleta | Pork
Pork loin | Meat | /ingredients/pork-loin.webp | pork loin roast, vepřová pečeně, vepřová kotleta bez kosti, karé | Pork
Pork leg | Meat | /ingredients/pork-leg.webp | leg of pork, fresh ham, pork schnitzel, pork escalope, vepřový řízek, vepřové řízky, vepřová kýta, veprova kyta | Pork
Pork cheeks | Meat | /ingredients/pork-cheeks.webp | pork cheek, vepřová líčka, veprova licka | Pork
Pork liver | Meat | /ingredients/pork-liver.webp | pigs liver, vepřová játra
Gammon | Meat | /ingredients/gammon.webp | gammon steak, gammon joint, gammon steaks | Ham
Pig trotters | Meat | /ingredients/pig-trotters.webp | pigs trotters, pig's trotters, pork feet, vepřové nožičky
Chicken wings | Meat | /ingredients/chicken-wings.webp | chicken wing, wings, kuřecí křídla, kureci kridla, křídla, kuřecí křidélka | Chicken
Chicken drumsticks | Meat | /ingredients/chicken-drumsticks.webp | chicken drumstick, drumsticks, kuřecí paličky, kureci palicky | Chicken
Chicken legs | Meat | Chicken Legs | chicken leg, chicken leg quarters, chicken quarters, whole chicken legs, kuřecí čtvrtky | Chicken
Chicken hearts | Meat | /ingredients/chicken-hearts.webp | chicken heart, kuřecí srdce, kureci srdce, кокоши сърца
Chicken gizzards | Meat | /ingredients/chicken-gizzards.webp | gizzards, chicken gizzard, kuřecí žaludky, kureci zaludky, пилешки воденички
Turkey breast | Meat | /ingredients/turkey-breast.webp | turkey breasts, turkey breast fillet, turkey steaks, krůtí prsa, kruti prsa | Turkey
Turkey legs | Meat | /ingredients/turkey-legs.webp | turkey leg, turkey drumsticks, turkey thighs, turkey thigh, krůtí stehno, krůtí stehna | Turkey
Ground turkey | Meat | Turkey Mince | turkey mince, minced turkey, mleté krůtí maso | Turkey
Duck legs | Meat | Duck Legs | duck leg, kachní stehna, kachni stehna, kachní stehno | Duck
Lamb chops | Meat | Lamb Loin Chops | lamb chop, lamb cutlets, lamb loin chops, jehněčí kotletky | Lamb
Lamb leg | Meat | Lamb Leg | leg of lamb, jehněčí kýta | Lamb
Lamb shoulder | Meat | Lamb Shoulder | shoulder of lamb, jehněčí plec | Lamb
Ground lamb | Meat | Lamb Mince | lamb mince, minced lamb, mleté jehněčí | Lamb
Rack of lamb | Meat | /ingredients/rack-of-lamb.webp | lamb rack, french rack, jehněčí hřbet, jehněčí karé | Lamb
Lamb shanks | Meat | /ingredients/lamb-shanks.webp | lamb shank, jehněčí kolínko, jehněčí kolínka | Lamb
Pheasant | Meat | /ingredients/pheasant.webp | bažant, bazant, bažanta
Hare | Meat | /ingredients/hare.webp | zajíc, zajic, zajíce
Wild boar | Meat | /ingredients/wild-boar.webp | boar, divočák, divocak, divočáka, kančí, kanci maso, глиган
Pancetta | Meat | /ingredients/pancetta.webp | pancetta cubes, diced pancetta | Bacon
Lardons | Meat | /ingredients/lardons.webp | bacon lardons, bacon bits, diced bacon, kostičky slaniny | Bacon
Pepperoni | Meat | /ingredients/pepperoni.webp | pepperoni slices | Salami
Serrano ham | Meat | /ingredients/serrano-ham.webp | jamon serrano, jamón serrano, jamón, jamon, iberico ham | Prosciutto
Speck | Meat | /ingredients/speck.webp | alto adige speck | Prosciutto
Bresaola | Meat | /ingredients/bresaola.webp | 
Mortadella | Meat | /ingredients/mortadella.webp | mortadela
Kielbasa | Meat | /ingredients/kielbasa.webp | polish sausage, kiełbasa, polská klobása | Sausages
Merguez | Meat | /ingredients/merguez.webp | merguez sausage, merguez sausages | Sausages
Soup bones | Meat | /ingredients/soup-bones.webp | beef bones, bones, stock bones, kosti, kosti na vývar, hovězí kosti, vývarové kosti, кокали за супа
Chicken carcass | Meat | /ingredients/chicken-carcass.webp | chicken bones, chicken frame, chicken back, kuřecí skelet, kuřecí kosti, kuřecí kostra | Chicken
Beef neck | Meat | /ingredients/beef-neck.webp | neck of beef, hovězí krk, hovezi krk | Beef
Flat iron steak | Meat | /ingredients/flat-iron-steak.webp | flat iron, top blade steak | Steak
Picanha | Meat | /ingredients/picanha.webp | rump cap, top sirloin cap, hovězí špička | Steak
Tri-tip | Meat | /ingredients/tri-tip.webp | tri tip, tri-tip roast | Beef
Veal escalope | Meat | /ingredients/veal-escalope.webp | veal escalopes, veal schnitzel, scaloppine, telecí řízek, telecí řízky, telecí plátky | Veal
Veal chops | Meat | /ingredients/veal-chops.webp | veal chop, telecí kotleta, telecí kotlety | Veal
Lamb neck | Meat | /ingredients/lamb-neck.webp | neck of lamb, lamb neck fillet, jehněčí krk | Lamb
Goat | Meat | /ingredients/goat.webp | goat meat, kid, kid goat, kůzle, kůzlečí, kozí maso, козе месо, ярешко
Pork back fat | Meat | /ingredients/pork-back-fat.webp | fatback, back fat, pork fat, hřbetní sádlo, plátové sádlo, сланина
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
Dried chillies | Spices | Chilli | dried chilies, dried red chillies, sušené chilli, 干辣椒 | Chilli
Cassia bark | Spices | Cinnamon | chinese cinnamon, 桂皮 | Cinnamon
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
Shichimi togarashi | Spices | Red Chilli Flakes | shichimi, togarashi, seven spice, ichimi | Chilli flakes
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
Pork | vepřové, vepřové maso, veprove maso, vepřového masa, vepřové maso
Pork tenderloin | vepřová panenka, panenka, vepřovou panenku
Ground pork | mleté vepřové, mleté vepřové maso
Bacon | slaninu, anglickou slaninu, slaniny
Ham | šunka, šunku, sunka, šunky
Sausages | uzenina, uzeniny
Chicken | kuře, kuřecí maso, kureci maso, kuřete, kuřecího masa, kuřecí maso
Chicken breast | kuřecí prsa, kureci prsa, kuřecí prsní řízky, kuřecí řízky, kuřecí prsíčka, kuřecí řízek
Goat cheese | kozí sýr, kozího sýra
Chicken thighs | kuřecí stehna, kuřecí stehýnka, kureci stehna
Chicken liver | kuřecí játra, kureci jatra, játra
Turkey | krůtí, krůtí maso
Duck | kachna, kachnu, kachní
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
Yogurt | jogurt, bílý jogurt, bily jogurt, jogurtu, jogurt
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
Potatoes | brambory, bramboru, brambor, bramborami, bramborů
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
Parsley | petržel, petrželka, petrželku, petrželová nať, petrželovou nať, petrželky, petrželka, petrželku
Dill | kopr, kopru, koprem, čerstvý kopr
Dried dill | sušený kopr, sušeného kopru
Chives | pažitka, pažitku, pazitka, pažitky, pažitkou, čerstvá pažitka
Dried chives | sušená pažitka, sušenou pažitku
Basil | bazalka, bazalku, čerstvá bazalka
Dried basil | sušená bazalka, sušenou bazalku, sušené bazalky
Thyme | tymián, tymiánu, čerstvý tymián
Dried thyme | sušený tymián, sušeného tymiánu
Rosemary | rozmarýn, rozmarýnu, čerstvý rozmarýn
Dried rosemary | sušený rozmarýn, sušeného rozmarýnu
Oregano | oregáno, oregano, sušené oregano, sušené oregáno
Fresh oregano | čerstvé oregano, čerstvé oregáno
Marjoram | majoránka, majoránku, majoranka, majoránky, sušená majoránka, sušenou majoránku
Fresh marjoram | čerstvá majoránka, čerstvou majoránku
Bay leaves | bobkový list, bobkové listy, bobkového listu
Lovage | libeček, libečku, čerstvý libeček
Dried lovage | sušený libeček, sušeného libečku
Mint | máta, mátu, čerstvá máta
Dried mint | sušená máta, sušenou mátu, sušené máty
Coriander | koriandr, koriandrová nať, čerstvý koriandr
Dried coriander | sušený koriandr, sušená koriandrová nať
Salt | sůl, soli, sul
Himalayan salt | himálajská sůl, himalájská sůl, růžová sůl, růžovou sůl
Dried parsley | sušená petržel, sušená petrželka, sušenou petržel, sušenou petrželku, sušená petrželová nať
Sage | šalvěj, šalvěje
Dried sage | sušená šalvěj, sušenou šalvěj
Tarragon | estragon, estragonu
Dried tarragon | sušený estragon
Coriander seeds | celý koriandr, koriandr celý, koriandrová semínka, semínka koriandru
Ground coriander | mletý koriandr, mletého koriandru
Cardamom | kardamom, kardamomu, celý kardamom
Ground cardamom | mletý kardamom
Turmeric | kurkuma, kurkumu, mletá kurkuma
Fresh turmeric | čerstvá kurkuma, kurkuma kořen
Fennel seeds | fenyklové semínko, fenyklová semínka, semínka fenyklu
Ground fennel | mletý fenykl
Ground ginger | mletý zázvor, sušený zázvor
Fenugreek leaves | sušené listy pískavice
Black pepper | pepř, pepře, mletý pepř, mletého pepře, černý pepř, mletý černý pepř, pepr
Black peppercorns | celý pepř, pepř celý, celý černý pepř, celého pepře, pepř v zrnech, kuličky pepře
White pepper | bílý pepř, mletý bílý pepř
White peppercorns | celý bílý pepř, bílý pepř celý
Paprika | sladká paprika, mletá paprika, mleta paprika
Smoked paprika | uzená paprika, uzenou papriku
Chilli powder | pálivá paprika, mleté chilli
Caraway seeds | kmín, kmínu, kmin, celý kmín, celého kmínu
Ground caraway | mletý kmín, mletého kmínu, mleta kmin
Cumin | římský kmín, rimsky kmin, kmín římský, mletý římský kmín, mletého římského kmínu, kmín římský mletý
Cumin seeds | celý římský kmín, římský kmín celý
Allspice | nové koření, nove koreni, nového koření, celé nové koření
Ground allspice | mleté nové koření, mletého nového koření
Cloves | hřebíček, hřebíčky, hrebicek, celý hřebíček
Ground cloves | mletý hřebíček, mletého hřebíčku
Cinnamon | skořice, skořici, skorice, mletá skořice, mleté skořice
Cinnamon sticks | celá skořice, skořice celá, skořicová kůra, tyčinka skořice, skořicové tyčinky
Nutmeg | muškátový oříšek, muškátový květ, mletý muškátový oříšek, strouhaný muškátový oříšek
Whole nutmeg | celý muškátový oříšek
Star anise | badyán, badyan
Vanilla | vanilka, vanilkový lusk, vanilky
Flour | mouka, mouky, mouku
Wholemeal flour | celozrnná mouka, celozrnnou mouku
Rye flour | žitná mouka, žitnou mouku
Spelt flour | špaldová mouka
Cornstarch | kukuřičný škrob, solamyl, maizena
Potato starch | bramborový škrob, holandský škrob
Sugar | cukr, cukru, krystal, krystalový cukr, krupicový cukr, krupicák, cukr krupice, cukru krupice, cukr krystal
Icing sugar | moučkový cukr, moučkového cukru, moučka, cukr moučka, cukru moučky
Brown sugar | třtinový cukr, trtinovy cukr
Vanilla sugar | vanilkový cukr, vanilinový cukr, vanilinový
Honey | med, medu
Baking powder | kypřicí prášek, prášek do pečiva, kypřící prášek, prášku do pečiva, prášek do pečiva
Baking soda | jedlá soda, jedlou sodu
Yeast | droždí, kvasnice, sušené droždí
Cocoa | kakao, kakaa
Dark chocolate | hořká čokoláda, hořkou čokoládu, čokoláda na vaření, čokolády, čokoláda, čokoládu
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
Vegetable oil | olej, rostlinný olej, slunečnicový olej, oleje, olejem
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
Coconut milk | kokosové mléko, kokosového mléka, kokosovým mlékem
Plant milk | rostlinné mléko, mandlové mléko, ovesné mléko, sójové mléko, rýžové mléko
Beef stock | hovězí vývar, hovězího vývaru, hovězí bujón
Chicken stock | kuřecí vývar, kuřecího vývaru, slepičí vývar, slepičího vývaru
Vegetable stock | zeleninový vývar, zeleninového vývaru
Cream of tartar | vinný kámen
Chickpea flour | cizrnová mouka, cizrnové mouky
Fine flour | hladké mouky, hladkou mouku
Medium-coarse flour | polohrubé mouky, polohrubou mouku
Coarse flour | hrubé mouky, hrubou mouku
Salt and pepper | sůl a pepř, sůl a pepře
`
