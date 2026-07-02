// Trip Planner — built-in itinerary content (demo-mode fallback + swap alternates).
// Real, followable activities for the 8 atlas destinations, plus a good generic
// pack for anywhere else. Each slot pool is deep enough to power day-swaps.

import type { VibeKey } from "@/agents/scout/atlas";

export interface PoolItem {
  title: string;
  notes: string;
  tags: VibeKey[];
}

export interface PlanPack {
  match: RegExp;
  themes: string[];
  morning: PoolItem[];
  afternoon: PoolItem[];
  evening: PoolItem[];
}

const PACKS: PlanPack[] = [
  {
    match: /porto/i,
    themes: [
      "Ribeira & the River", "Cellars & Miradouros", "Azulejos & Bookshops",
      "Atlantic Side", "Douro Day", "Slow Porto",
    ],
    morning: [
      { title: "Ribeira riverfront walk + Dom Luís I bridge crossing", notes: "Start at Praça da Ribeira, cross the top deck of the bridge for the classic panorama before the crowds arrive.", tags: ["explorer", "culture"] },
      { title: "São Bento station azulejos + Clérigos Tower climb", notes: "20,000 hand-painted tiles in the station hall, then 225 steps up Clérigos for the rooftop view (~€8).", tags: ["culture", "explorer"] },
      { title: "Mercado do Bolhão breakfast crawl", notes: "The restored 19th-century market — pastel de nata, fresh fruit, and queijo da serra straight from the stalls.", tags: ["foodie"] },
      { title: "Livraria Lello early slot + Carmo church tiles", notes: "Book the first entry ticket online to see the famous staircase without the queue; the ticket discounts a book.", tags: ["culture", "chill"] },
      { title: "Foz do Douro lighthouse walk", notes: "Tram 1 along the river to where the Douro meets the Atlantic — bracing, beautiful, and mostly tourist-free before 10am.", tags: ["chill", "beach", "explorer"] },
      { title: "Crystal Palace gardens loop", notes: "Peacocks, camellias and the best free viewpoints over the river bend. Bring coffee.", tags: ["chill", "explorer"] },
    ],
    afternoon: [
      { title: "Port cellar tasting in Vila Nova de Gaia", notes: "Cálem, Graham's or Taylor's — tour plus three-glass tasting from ~€15. Book Graham's ahead for the view.", tags: ["foodie", "culture"] },
      { title: "Six Bridges river cruise", notes: "50 minutes on the Douro seeing all six bridges from the water (~€18). Sit on the right side going upstream.", tags: ["chill", "explorer"] },
      { title: "Cedofeita gallery-and-vintage stroll", notes: "Rua Miguel Bombarda's galleries synchronise openings; the side streets hide Porto's best vintage shops.", tags: ["culture", "explorer"] },
      { title: "Francesinha initiation at Café Santiago", notes: "Porto's monumental sandwich — meat, melted cheese, beer sauce. Split one the first time; nobody finishes solo.", tags: ["foodie"] },
      { title: "Serralves museum + gardens", notes: "Contemporary art in a pink Art Deco villa with 18 hectares of gardens. The treetop walkway is quietly spectacular.", tags: ["culture", "chill"] },
      { title: "Matosinhos beach + surf lesson", notes: "Metro to Matosinhos: broad Atlantic beach, surf schools with beginner boards, and the city's best grilled fish for after.", tags: ["adrenaline", "beach"] },
    ],
    evening: [
      { title: "Sunset at Jardim do Morro", notes: "Cross to the Gaia side at golden hour — buskers, wine sellers, and the whole of old Porto turning amber across the river.", tags: ["chill", "explorer"] },
      { title: "Petiscos dinner in Baixa", notes: "Small plates the Porto way: presunto, octopus salad, bolinhos de bacalhau. Casa Guedes' pork-sandwich-with-Serra-cheese is legend.", tags: ["foodie"] },
      { title: "Fado night at a taberna", notes: "Porto's fado is more intimate than Lisbon's — small rooms, no amplification. Book a table with dinner.", tags: ["culture", "chill"] },
      { title: "Douro riverside wine bar hop", notes: "Start at Prova, finish on the Gaia quay with a glass of white port and tonic — the local aperitivo.", tags: ["foodie", "chill"] },
      { title: "Galerias de Paris street scene", notes: "The nightlife street: start with jazz at Casa do Livro, see where the crowd takes you.", tags: ["adrenaline", "explorer"] },
    ],
  },
  {
    match: /hoi ?an/i,
    themes: [
      "Old Town Awakening", "Lantern Evening", "An Bang Beach Day",
      "Craft & Countryside", "Market to Table", "Slow River Day",
    ],
    morning: [
      { title: "Old town at dawn before the buses", notes: "7am: the Japanese Covered Bridge and Tan Ky house to yourself, soft light on the yellow walls. The old-town ticket covers five sights.", tags: ["culture", "explorer"] },
      { title: "Central market bánh mì breakfast", notes: "The famous stalls (Phi or Madam Khanh) sell out by late morning — get the full-works bánh mì for about a dollar.", tags: ["foodie"] },
      { title: "Bicycle ride through the rice paddies to Tra Que village", notes: "Flat, easy 20-minute pedal past water buffalo to the herb-farming village. Rent bikes from your hotel.", tags: ["explorer", "chill"] },
      { title: "An Bang beach morning swim", notes: "Warm, gentle water before the day heats up; loungers are free if you buy a coconut.", tags: ["beach", "chill"] },
      { title: "Cooking class with market tour", notes: "Most classes start at the market choosing ingredients, then boat you to the kitchen. You'll make cao lầu properly.", tags: ["foodie", "culture"] },
      { title: "My Son sanctuary sunrise trip", notes: "The Cham temple ruins 40 minutes out — go on the sunrise tour to beat both heat and crowds.", tags: ["culture", "explorer"] },
    ],
    afternoon: [
      { title: "Tailor fitting session", notes: "Pick fabric and get measured (Bebe and Yaly are the reliable names); a suit or dress is ready in 24–48h with one fitting.", tags: ["culture", "chill"] },
      { title: "Coconut-boat ride through the water palms", notes: "The round basket boats in the Bay Mau coconut forest — touristy but genuinely fun. Agree the price before boarding.", tags: ["chill", "explorer"] },
      { title: "Cao lầu tasting crawl", notes: "The noodle dish that exists only here (the water supposedly must come from one well). Compare Thanh Cao Lau vs the market stalls.", tags: ["foodie"] },
      { title: "An Bang beach afternoon + seafood shack lunch", notes: "Grilled prawns and morning-glory at a sand-floor shack; the northern end of the beach is quietest.", tags: ["beach", "foodie"] },
      { title: "Motorbike loop to the Marble Mountains", notes: "30 minutes north: caves, pagodas and stairways carved into five marble hills. Confident riders only — or hire a driver.", tags: ["adrenaline", "explorer"] },
      { title: "Museum of Folk Culture + hidden cafés", notes: "The quieter corners of the old town: folk museum, then Reaching Out Teahouse — run by deaf staff, silent and lovely.", tags: ["culture", "chill"] },
    ],
    evening: [
      { title: "Lantern-lit old town + candle boats", notes: "After 8pm the day-trippers leave. Float a paper lantern on the Thu Bon river and walk the riverbank both sides.", tags: ["chill", "culture"] },
      { title: "Night market food graze on An Hoi island", notes: "Cross the bridge to the lantern stalls: grilled skewers, bánh xèo pancakes, black-sesame sweet soup.", tags: ["foodie"] },
      { title: "Riverside bia hơi with the locals", notes: "Fresh draft beer for pennies at the plastic-stool joints east of the market — the real Hoi An happy hour.", tags: ["foodie", "chill"] },
      { title: "Memories Show at Hoi An Impression Park", notes: "A genuinely spectacular outdoor theatre production about the port's history — 500 performers on a river island.", tags: ["culture"] },
      { title: "Beach bonfire night at An Bang", notes: "The beach bars run low-key bonfires most dry-season nights; sea breeze, cold beer, bare feet.", tags: ["beach", "chill"] },
    ],
  },
  {
    match: /kyoto/i,
    themes: [
      "Southern Temples", "Arashiyama Dawn", "Gion & the Old Lanes",
      "Zen & Gardens", "Markets & Craft", "Northern Hills",
    ],
    morning: [
      { title: "Fushimi Inari at dawn", notes: "Be at the first torii by 6:30am and walk at least to the Yotsutsuji viewpoint — the upper gates you'll have alone.", tags: ["explorer", "culture"] },
      { title: "Arashiyama bamboo grove + Tenryū-ji garden", notes: "Bamboo first (before 8am), then the 700-year-old Zen garden when it opens. Skip the crowded main street until later.", tags: ["culture", "chill"] },
      { title: "Kiyomizu-dera + the Higashiyama lanes", notes: "The wooden terrace at opening time, then wander down Sannenzaka's preserved lanes as the shops wake up.", tags: ["culture", "explorer"] },
      { title: "Nishiki Market breakfast graze", notes: "Kyoto's 400-year-old kitchen: tamagoyaki skewers, fresh soy-milk donuts, pickles. Eat standing where each stall indicates.", tags: ["foodie"] },
      { title: "Ryōan-ji rock garden sit", notes: "Arrive at opening, sit on the veranda before the tour groups, and just look at the 15 stones for twenty minutes. That's the point.", tags: ["chill", "culture"] },
      { title: "Philosopher's Path walk to Ginkaku-ji", notes: "The canal-side path is loveliest early; end at the Silver Pavilion's moss garden and sand cone.", tags: ["chill", "explorer"] },
    ],
    afternoon: [
      { title: "Gion walking + tea ceremony", notes: "Hanamikoji street's machiya facades, then a proper tea ceremony at Camellia or En — book the small-group slot.", tags: ["culture"] },
      { title: "Nijō Castle nightingale floors", notes: "The shogun's palace where the floors deliberately chirp to expose intruders. The painted screens alone justify the ticket.", tags: ["culture"] },
      { title: "Day-trip: Nara deer park + Tōdai-ji", notes: "45 minutes by train: bowing deer, and the Great Buddha in the world's largest wooden hall. Back by dinner.", tags: ["explorer", "culture"] },
      { title: "Kaiseki lunch (the affordable way)", notes: "Kyoto's haute cuisine is half price at lunch — a multi-course kaiseki that would cost a fortune at dinner runs ~¥5,000.", tags: ["foodie"] },
      { title: "Kurama to Kibune hillside hike", notes: "Take the train north, hike over the wooded mountain between two shrine villages (~90 min), soak in Kurama onsen after.", tags: ["adrenaline", "explorer"] },
      { title: "Craft afternoon: knife shop + indigo dyeing", notes: "Watch blades sharpened at Aritsugu (est. 1560) in Nishiki, then a hands-on aizome indigo workshop.", tags: ["culture", "foodie"] },
    ],
    evening: [
      { title: "Pontochō alley dinner", notes: "The lantern-lit alley along the Kamo river — pick a spot with kawadoko river terraces in summer.", tags: ["foodie", "chill"] },
      { title: "Gion at dusk, respectfully", notes: "The hour lanterns come on is when you might glimpse a geiko heading to an appointment. Photograph the streets, never the people.", tags: ["culture"] },
      { title: "Izakaya crawl off Kiyamachi", notes: "Smoky yakitori counters and standing bars where the menu is whatever's scrawled on the wall. Point and trust.", tags: ["foodie", "adrenaline"] },
      { title: "Kamo river delta at twilight", notes: "Join students and couples on the stepping stones where the rivers meet — konbini snacks make it a picnic.", tags: ["chill"] },
      { title: "Night illumination at a temple (seasonal)", notes: "In blossom and foliage seasons, temples like Kōdai-ji open after dark with lit gardens — check the season's schedule.", tags: ["culture", "chill"] },
    ],
  },
  {
    match: /mexico city|cdmx|ciudad de m/i,
    themes: [
      "Centro Histórico", "Chapultepec & Museums", "Coyoacán Colours",
      "Pyramids Day", "Roma-Condesa Graze", "Markets & Canals",
    ],
    morning: [
      { title: "Zócalo + Templo Mayor ruins", notes: "The Aztec Great Temple sits right beside the cathedral — start at the ruins when they open, then the Diego Rivera murals in the Palacio Nacional.", tags: ["culture", "explorer"] },
      { title: "Teotihuacán at opening time", notes: "Uber or the Autobuses del Norte bus (~50 min). Walk the Avenue of the Dead before the heat and the crowds; bring water and a hat.", tags: ["explorer", "adrenaline"] },
      { title: "Chapultepec Castle before the park fills", notes: "The only royal castle in the Americas, with murals and a view down Reforma. The park around it is a city in itself.", tags: ["culture"] },
      { title: "Barbacoa breakfast in Roma", notes: "Weekend ritual: slow-pit lamb tacos with consommé. Follow the queue — El Hidalguense is the famous one (Fri–Sun only).", tags: ["foodie"] },
      { title: "Coyoacán + Frida Kahlo's Casa Azul", notes: "Book the Casa Azul ticket online days ahead, then wander Coyoacán's plazas and the market's tostada counter.", tags: ["culture", "foodie"] },
      { title: "Chapultepec park rowboats + Anthropology Museum first hall", notes: "Row on the lake, then give the Museo Nacional de Antropología your freshest attention — the Mexica hall is the great one.", tags: ["chill", "culture"] },
    ],
    afternoon: [
      { title: "Anthropology Museum deep dive", notes: "Give it three unhurried hours: Sun Stone, the Maya rooms, the courtyard umbrella fountain. Best museum in the Americas.", tags: ["culture"] },
      { title: "Street taco crawl al pastor", notes: "The trompo spit, pineapple flying: El Vilsito (afternoon onward), El Huequito, or whichever stand has the longest local queue.", tags: ["foodie"] },
      { title: "Lucha libre matinée logistics + Arena México tickets", notes: "Buy evening tickets in person at the Arena México box office to skip resale markups, then explore the Doctores murals nearby.", tags: ["adrenaline", "culture"] },
      { title: "Roma-Condesa architecture-and-café loop", notes: "Art Deco facades around Parque México, bookshops on Álvaro Obregón, a cajeta ice cream from a neveria.", tags: ["chill", "explorer"] },
      { title: "Xochimilco trajinera ride", notes: "Float the Aztec-era canals on a painted boat with micheladas and a mariachi drive-by. Go with a group; agree the hourly rate first.", tags: ["chill", "adrenaline"] },
      { title: "Mercado de la Merced + Sonora", notes: "The city's vast market belly — chiles by the tonne, herbal remedies next door at Sonora. Keep valuables minimal; go before dusk.", tags: ["foodie", "explorer"] },
    ],
    evening: [
      { title: "Lucha libre at Arena México", notes: "Tuesday or Friday nights: masks, villains, flying bodies, beer in litre cups. Sit close-ish — the theatre is the point.", tags: ["adrenaline"] },
      { title: "Mezcal education in Roma Norte", notes: "A proper mezcalería flight (espadín vs tobalá) with orange slices and worm salt. La Clandestina or Bósforo set the standard.", tags: ["foodie", "culture"] },
      { title: "Plaza Garibaldi mariachi hour", notes: "Bands for hire play the square nightly; hear three songs, then duck into Salón Tenampa's murals. Uber there and back.", tags: ["culture", "adrenaline"] },
      { title: "Rooftop dinner over the Zócalo", notes: "The terraces above the square (Balcón del Zócalo and neighbours) at twilight, cathedral bells included.", tags: ["foodie", "chill"] },
      { title: "Condesa evening: parque + natural wine", notes: "Dusk dog-parade around Parque México, then a low-lit natural wine bar — the neighbourhood does slow evenings perfectly.", tags: ["chill"] },
    ],
  },
  {
    match: /ljubljana/i,
    themes: [
      "Old Town & Castle", "Lake Bled Day", "Green City Slow Day",
      "Alpine Gorges", "Market & Museums", "River Evenings",
    ],
    morning: [
      { title: "Central Market + Plečnik's colonnade", notes: "Saturday is peak market; weekday mornings are calm. Burek from the colonnade bakery, honey and cheese stalls behind.", tags: ["foodie", "culture"] },
      { title: "Ljubljana Castle via the funicular (walk down)", notes: "Views to the Kamnik Alps on clear mornings; the Time Machine tour is short and genuinely good. Walk down through the vineyard path.", tags: ["explorer", "culture"] },
      { title: "Day-trip start: bus to Lake Bled", notes: "75 minutes by bus. Walk the full 6km lake loop first — the postcard angles from Ojstrica viewpoint are a 20-minute climb.", tags: ["explorer", "chill"] },
      { title: "Tivoli Park + Jakopič Promenade photo walk", notes: "The city's living room: outdoor photo exhibitions along the promenade, swans, and coffee at the Čolnarna pavilion.", tags: ["chill"] },
      { title: "Vintgar Gorge boardwalks (from Bled)", notes: "Emerald water under wooden walkways, an easy 1.6km each way. Buy the timed ticket online; go at opening.", tags: ["explorer", "adrenaline"] },
      { title: "Metelkova + museum quarter", notes: "The ex-barracks autonomous art zone is quiet-but-photogenic by day; the Ethnographic Museum next door is a sleeper hit.", tags: ["culture", "explorer"] },
    ],
    afternoon: [
      { title: "Row to Bled Island + cream cake", notes: "Rent a rowboat (or ride a pletna), ring the island church bell, then the obligatory kremšnita cream cake on the terrace back ashore.", tags: ["chill", "explorer"] },
      { title: "Old town icebreaker loop", notes: "Triple Bridge, Dragon Bridge (touch a dragon for luck), Cathedral doors, and the riverside lanes — all inside 90 unhurried minutes.", tags: ["culture", "chill"] },
      { title: "Kayak or SUP on the Ljubljanica", notes: "Paddle through the city centre under the bridges — rentals run from the embankment in warm months.", tags: ["adrenaline", "beach"] },
      { title: "Šmarna Gora hike", notes: "The locals' training hill: 90 minutes up and down, a bell to ring at the top, and a mountain hut serving sausage and štruklji.", tags: ["adrenaline", "explorer"] },
      { title: "Slovenian wine tasting", notes: "Orange wines from Goriška Brda and Rebula flights — the wine bars around Stari trg pour the whole country by the glass.", tags: ["foodie"] },
      { title: "House of Illusions or Plečnik House", notes: "Rainy-afternoon insurance: playful illusions museum, or the preserved home-studio of the architect who shaped the city.", tags: ["culture", "chill"] },
    ],
    evening: [
      { title: "Riverside aperitivo crawl", notes: "The embankment between Triple Bridge and Butchers' Bridge is one long terrace at dusk — start at Slovenska hiša with local spritzes.", tags: ["chill", "foodie"] },
      { title: "Odprta Kuhna street-food night (Fridays)", notes: "March–October: the central square becomes Slovenia's open kitchen — štruklji to Adriatic seafood, chefs cooking live.", tags: ["foodie"] },
      { title: "Castle courtyard event or outdoor cinema", notes: "Summer nights fill the castle courtyard with film and jazz; check the Ljubljanski grad programme.", tags: ["culture", "chill"] },
      { title: "Metelkova after dark", notes: "Europe's most colourful squat-turned-cultural-zone: live gigs, sculpture-covered facades, very cheap beer. Friendly, alternative, loud.", tags: ["adrenaline", "culture"] },
      { title: "Dinner at a gostilna", notes: "Traditional inn cooking done modern — žlikrofi dumplings, porcini soup in bread. Gostilna na Gradu or Druga Violina (social enterprise, lovely).", tags: ["foodie"] },
    ],
  },
  {
    match: /taipei|taiwan/i,
    themes: [
      "Old Taipei & Temples", "Mountains in the Metro", "Night Market Masters",
      "Beitou Hot Springs", "Jiufen Day", "Creative Districts",
    ],
    morning: [
      { title: "Longshan Temple + Bopiliao old street", notes: "Incense spirals and fortune blocks at Taipei's busiest temple, then the preserved Qing-era brick lanes next door.", tags: ["culture", "explorer"] },
      { title: "Elephant Mountain sunrise hike", notes: "20 minutes of steep steps from the MRT to the classic Taipei 101 panorama. Sunrise or late afternoon; bring water.", tags: ["adrenaline", "explorer"] },
      { title: "Traditional breakfast at Fu Hang Dou Jiang", notes: "Queue 30 minutes with half the city for warm soy milk, shaobing and youtiao — the queue moves fast and it's worth it.", tags: ["foodie"] },
      { title: "National Palace Museum highlights", notes: "The jadeite cabbage and the meat-shaped stone plus the greatest Chinese art collection anywhere. Go at opening; do 2–3 focused hours.", tags: ["culture"] },
      { title: "Beitou hot-spring morning", notes: "MRT straight to steaming Thermal Valley, the Japanese-era Hot Spring Museum, then a public or private soak.", tags: ["chill"] },
      { title: "Day-trip start: bus to Jiufen", notes: "The lantern-hung cliffside teahouse town (Spirited Away vibes). Go early — by noon the alleys are shoulder-to-shoulder.", tags: ["explorer", "culture"] },
    ],
    afternoon: [
      { title: "Yangmingshan trails + volcanic fumaroles", notes: "Buses from Jiantan MRT reach grassland ridges and steaming vents at Xiaoyoukeng. Cooler than the city by five degrees.", tags: ["adrenaline", "explorer"] },
      { title: "Dadaocheng tea and fabric street", notes: "Dihua Street's 1850s shophouses: tea tastings, dried-goods apothecaries, and indie craft shops in restored courtyards.", tags: ["culture", "chill"] },
      { title: "Din Tai Fung xiao long bao (original branch)", notes: "Watch the 18-fold dumplings being made through the glass. Off-peak (3pm) halves the wait.", tags: ["foodie"] },
      { title: "Songshan Cultural Park + Taipei 101 observatory", notes: "Design shops in a repurposed tobacco factory, then up the (once) world's fastest lift for the damper-ball view.", tags: ["culture", "explorer"] },
      { title: "Maokong gondola + hillside tea houses", notes: "Glass-floor cabin over tea terraces; drink high-mountain oolong where it grows, overlooking the whole basin.", tags: ["chill", "explorer"] },
      { title: "Ximending street culture", notes: "Taipei's Shibuya: street performers, sneaker shops, and the historic Red House creative market.", tags: ["adrenaline", "explorer"] },
    ],
    evening: [
      { title: "Raohe Night Market end to end", notes: "Enter by the temple gate, exit full: pepper buns from the Michelin-listed stall by the entrance, then whatever queues look serious.", tags: ["foodie"] },
      { title: "Ningxia Night Market deep cuts", notes: "Smaller, more local, all food: oyster omelettes, taro balls, sesame chicken soup. The Bib Gourmand list is your map.", tags: ["foodie"] },
      { title: "Riverside cycling at Dadaocheng wharf", notes: "YouBike along the Tamsui river at sunset — container-bar beers at the wharf when you roll back in.", tags: ["chill", "adrenaline"] },
      { title: "Craft beer + live music in Da'an", notes: "Taiwan's craft scene is quietly excellent — Taihu brewpubs and jazz at Blue Note Taipei.", tags: ["chill"] },
      { title: "Shilin sprawl (with a strategy)", notes: "The biggest night market: eat in the basement food court is the rookie error — hunt the outer alleys for the famous fried chicken cutlet.", tags: ["foodie", "explorer"] },
    ],
  },
  {
    match: /valencia/i,
    themes: [
      "Old Town & Market", "Turia & Arts City", "Beach Day",
      "Albufera Paella Day", "Neighbourhood Graze", "Slow Sunday",
    ],
    morning: [
      { title: "Mercado Central graze + Lonja visit", notes: "Europe's grandest food market under Modernista domes — horchata, jamón, clams — then the UNESCO silk exchange across the street.", tags: ["foodie", "culture"] },
      { title: "Turia gardens bike ride", notes: "Rent a bike and ride the full 9km of the drained riverbed park, from Bioparc end to the City of Arts. Flat, green, car-free.", tags: ["explorer", "adrenaline"] },
      { title: "Old town loop: Cathedral, Miguelete tower, Plaza de la Virgen", notes: "Climb the Miguelete's 207 steps for the blue-domed skyline; the Holy Grail chapel is inside the cathedral (really).", tags: ["culture"] },
      { title: "Malvarrosa beach morning", notes: "Wide, clean city sand on the tram line. Swim, then walk the promenade to the fishermen's quarter of El Cabanyal.", tags: ["beach", "chill"] },
      { title: "City of Arts & Sciences architecture walk", notes: "Calatrava's white sci-fi complex is free to wander — reflections best in morning light. Add the Oceanogràfic if you have three hours.", tags: ["explorer", "culture"] },
      { title: "Ruzafa café-and-pastry crawl", notes: "The hip quarter does breakfast properly: cremaet coffee, artisan ensaimadas, and the colourful Mercado de Ruzafa.", tags: ["foodie", "chill"] },
    ],
    afternoon: [
      { title: "Paella pilgrimage at La Pepica or Casa Carmela", notes: "Beachfront institutions cooking over orange wood since the 1920s. Lunch only if you want locals' respect — order paella valenciana (rabbit and chicken, no seafood heresy).", tags: ["foodie"] },
      { title: "Albufera lagoon boat + rice paddies", notes: "Bus 25 to the lagoon where paella was born: flat-bottomed boat ride through the reeds, sunset famously good here too.", tags: ["chill", "explorer"] },
      { title: "Oceanogràfic deep dive", notes: "Europe's largest aquarium — the beluga pair and the shark tunnel are the headliners.", tags: ["explorer", "chill"] },
      { title: "El Carmen street-art wander", notes: "The medieval quarter's walls are an open gallery; find the Torres de Serranos and climb for free-ish views.", tags: ["culture", "explorer"] },
      { title: "Horchatería break at Santa Catalina", notes: "Two-hundred years of tiger-nut horchata and fartons for dunking — the Valencian siesta-hour institution.", tags: ["foodie", "chill"] },
      { title: "Beach volleyball + patacona chill", notes: "Nets on Patacona beach, chiringuito beers, and the calmest stretch of city sand.", tags: ["beach", "adrenaline"] },
    ],
    evening: [
      { title: "Tapas crawl in Ruzafa", notes: "Esgarraet, clochinas (in season), patatas bravas done right — bar-hop Calle de Cadis and trust the crowded doorways.", tags: ["foodie"] },
      { title: "Sunset from the Turia + Gulliver park", notes: "Golden hour turns Calatrava's bridges pink; the giant Gulliver playground is surreal at dusk.", tags: ["chill"] },
      { title: "Agua de Valencia in the old town", notes: "The city's dangerous signature pitcher (cava + OJ + spirits) at Café de las Horas' baroque fever-dream interior.", tags: ["foodie", "adrenaline"] },
      { title: "Cabanyal evening: grilled sardines by the sea", notes: "The old fishermen's quarter's tiled facades and no-frills seafood grills — Valencia before tourism found it.", tags: ["foodie", "culture"] },
      { title: "Flamenco or jazz cellar night", notes: "Radio City's flamenco Tuesdays are the accessible classic; Jimmy Glass is one of Spain's great jazz rooms.", tags: ["culture"] },
    ],
  },
  {
    match: /cape town/i,
    themes: [
      "Table Mountain Day", "Peninsula Loop", "Winelands Day",
      "City Bowl & History", "Atlantic Beaches", "Adrenaline Day",
    ],
    morning: [
      { title: "Table Mountain: Platteklip Gorge hike or cableway", notes: "Hike up Platteklip (2–3h, steep, start by 7am to beat sun and wind) or ride the rotating cableway. Check the weather webcam first — the 'tablecloth' cloud closes everything.", tags: ["adrenaline", "explorer"] },
      { title: "Lion's Head sunrise circuit", notes: "90 minutes up the spiral path with chains near the top; the sunrise over the city bowl is the trip's best free moment. Go in a group.", tags: ["adrenaline", "explorer"] },
      { title: "Boulders Beach penguins + Simon's Town", notes: "African penguins at the boardwalks from opening (conservation fee ~R190), then coffee on Simon's Town's naval high street.", tags: ["explorer", "beach", "chill"] },
      { title: "Bo-Kaap walk + Cape Malay cooking taster", notes: "The candy-coloured quarter is best photographed before 9am; several family kitchens run morning koesister-and-curry classes.", tags: ["culture", "foodie"] },
      { title: "Kirstenbosch gardens + Boomslang canopy walk", notes: "One of the world's great botanical gardens against the mountain's east face; the tree-canopy walkway snakes above the forest.", tags: ["chill", "explorer"] },
      { title: "Muizenberg surf lesson", notes: "The gentle, warm-ish False Bay break behind the painted huts is where all of Cape Town learns; boards and wetsuits on the beach.", tags: ["adrenaline", "beach"] },
    ],
    afternoon: [
      { title: "Cape Point + Chapman's Peak drive", notes: "The peninsula loop: lighthouse funicular at the 'end of Africa', baboon-guarded roads, and Chapman's Peak's cliff-carved bends for sunset. Rent a car or join a small-group tour.", tags: ["explorer", "adrenaline"] },
      { title: "Stellenbosch wine estate hop", notes: "Tastings from ~R100 at estates like Spier or Warwick; a pairing lunch in the vines makes the day. Book a driver/tour — no one should drive this one.", tags: ["foodie", "chill"] },
      { title: "District Six Museum + city bowl history walk", notes: "The essential, sobering story of the neighbourhood erased under apartheid, told by former residents. Pair with Company's Garden.", tags: ["culture"] },
      { title: "V&A Waterfront + Zeitz MOCAA", notes: "Africa's leading contemporary art museum inside a carved-out grain silo — the building alone is worth the ticket.", tags: ["culture", "chill"] },
      { title: "Clifton beaches hop", notes: "Four granite-boulder coves of increasingly beautiful people; 4th is calmest. The Atlantic is bracing — sunbathe more than swim.", tags: ["beach", "chill"] },
      { title: "Paragliding off Signal Hill", notes: "Tandem flights float you over the Atlantic seaboard to land at Sea Point promenade — conditions permitting, book the morning-of.", tags: ["adrenaline"] },
    ],
    evening: [
      { title: "Sunset at Signal Hill or Camps Bay", notes: "Picnic on Signal Hill's grass as the sun drops into the Atlantic, or cocktails along Camps Bay's strip. Uber both ways after dark.", tags: ["chill"] },
      { title: "Braai night or Mzansi supper in Langa", notes: "A hosted township supper with marimba music (Mzansi is the famous one) — go as part of a guided evening.", tags: ["foodie", "culture"] },
      { title: "Kloof Street dinner crawl", notes: "The city's restaurant mile: Cape Malay curries, springbok carpaccio, and some of the best-value fine dining anywhere.", tags: ["foodie"] },
      { title: "First Thursdays art night (monthly)", notes: "On the first Thursday, city-centre galleries open late and Bree Street becomes one long block party.", tags: ["culture", "adrenaline"] },
      { title: "Gold Restaurant pan-African feast", notes: "Fourteen tastes across the continent with djembe drumming — touristy, joyful, and genuinely delicious.", tags: ["foodie", "culture"] },
    ],
  },
];

/** Good-quality generic pack, interpolated with the destination's city name. */
export function genericPack(city: string): PlanPack {
  return {
    match: /.*/,
    themes: [
      "First Contact", "Local Life", "Green Escape",
      "Deeper Cuts", "Market to Table", "Slow Day",
    ],
    morning: [
      { title: `Old-quarter walking loop`, notes: `Start where ${city} began: the historic core, main square and oldest church or temple — before the day-trippers, with a coffee stop midway.`, tags: ["explorer", "culture"] },
      { title: `Central market breakfast`, notes: `Eat what ${city} eats: find the main covered market and follow the longest local queue to breakfast.`, tags: ["foodie"] },
      { title: `Best-view climb`, notes: `Every city keeps a viewpoint — tower, hill or rooftop. Earn ${city}'s on foot while the light is still soft.`, tags: ["adrenaline", "explorer"] },
      { title: `Flagship museum, first hall only`, notes: `Pick ${city}'s single most important museum and give its best wing two fresh, unhurried morning hours.`, tags: ["culture"] },
      { title: `Riverside or seaside promenade`, notes: `Walk ${city}'s waterline end to end — the honest cross-section of any city — and stop wherever locals are stopping.`, tags: ["chill", "beach"] },
      { title: `Neighbourhood bakery crawl`, notes: `Three bakeries, one pastry each, a ranking by the end. The winner becomes your daily breakfast spot.`, tags: ["foodie", "chill"] },
    ],
    afternoon: [
      { title: `The second neighbourhood`, notes: `Skip the centre: ride local transport to the district guides call 'up-and-coming' and wander ${city}'s real daily life.`, tags: ["explorer"] },
      { title: `Signature-dish hunt`, notes: `Find the plate ${city} argues about, order it where the menu isn't translated, and learn to pronounce it.`, tags: ["foodie"] },
      { title: `Park + café reset`, notes: `${city}'s biggest green space with a book and no agenda — trips need one deliberate idle afternoon.`, tags: ["chill"] },
      { title: `Hands-on craft or cooking class`, notes: `Two hours making the local thing — food, craft or drink — beats two more hours of looking at it.`, tags: ["culture", "foodie"] },
      { title: `Day-trip teaser`, notes: `The town, beach or hill everyone says to leave ${city} for. Half a day is enough for the highlight reel.`, tags: ["explorer", "adrenaline"] },
      { title: `Gallery-and-vintage lane`, notes: `Find the street where ${city}'s galleries and second-hand shops cluster — the souvenir you keep is usually from here.`, tags: ["culture", "chill"] },
    ],
    evening: [
      { title: `Golden-hour viewpoint`, notes: `Return to (or discover) the best sunset spot with snacks and something local to drink. Stay until the lights come on.`, tags: ["chill", "explorer"] },
      { title: `Street-food dinner graze`, notes: `${city}'s night stalls or late market: three small plates from three vendors beats one big restaurant.`, tags: ["foodie"] },
      { title: `Live music, local rules`, notes: `Whatever ${city} does after dark — fado, jazz, folk, or a bar with a house band — find the small room, not the arena.`, tags: ["culture", "adrenaline"] },
      { title: `Old town by night walk`, notes: `The same lanes from day one, transformed after dark and emptied of coaches. End with dessert.`, tags: ["chill", "culture"] },
      { title: `Neighbourhood dinner splurge`, notes: `One properly good dinner per trip: book the mid-range local favourite (not the tourist-strip one) and order the tasting.`, tags: ["foodie"] },
    ],
  };
}

export function packFor(destination: string): { pack: PlanPack; known: boolean } {
  const hit = PACKS.find((p) => p.match.test(destination));
  if (hit) return { pack: hit, known: true };
  const city = destination.split(",")[0].trim() || "the city";
  return { pack: genericPack(city), known: false };
}
