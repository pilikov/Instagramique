/**
 * Configurable taxonomy for follower profiling.
 * All dictionaries are defined here — not hardcoded in business logic.
 * To customize: edit these maps or load from an external JSON file.
 */

export const INTEREST_KEYWORDS: Record<string, string[]> = {
  graphic_design: [
    "graphic design", "графический дизайн", "visual design", "визуальный дизайн",
    "graphic designer", "графический дизайнер", "art direction", "арт-директор",
    "motion design", "motion graphics", "моушн дизайн", "motion designer",
  ],
  typography: [
    "typography", "типографика", "type design", "шрифтовой дизайн", "type designer",
    "fonts", "шрифты", "typeface", "lettering", "леттеринг", "calligraphy", "каллиграфия",
  ],
  ui_ux: [
    "ui design", "ux design", "ui/ux", "ux/ui", "user experience", "user interface",
    "product design", "продуктовый дизайн", "interaction design", "интерфейс",
    "figma", "sketch", "prototyping", "wireframe", "юзабилити", "usability",
  ],
  branding: [
    "branding", "брендинг", "brand identity", "brand strategy", "фирменный стиль",
    "brand designer", "brand design", "brand strategist", "бренд",
  ],
  illustration: [
    "illustration", "иллюстрация", "illustrator", "иллюстратор", "digital art",
    "цифровое искусство", "drawing", "рисование", "sketch", "скетч", "comic",
  ],
  photography: [
    "photography", "фотография", "photographer", "фотограф", "photo", "фото",
    "portrait", "портрет", "landscape", "пейзаж", "street photography",
    "wedding photographer", "свадебный фотограф", "lightroom", "photoshoot",
  ],
  fashion: [
    "fashion", "мода", "fashion designer", "модельер", "style", "стиль",
    "fashion blogger", "outfit", "ootd", "streetwear", "стритвир", "haute couture",
    "vintage", "wardrobe", "lookbook", "fashion week",
  ],
  beauty: [
    "beauty", "красота", "makeup", "макияж", "skincare", "уход за кожей",
    "cosmetics", "косметика", "mua", "визажист", "nails", "маникюр",
    "hairstylist", "парикмахер", "hair", "волосы",
  ],
  travel: [
    "travel", "путешествия", "traveler", "путешественник", "wanderlust",
    "adventure", "приключения", "explore", "backpacker", "digital nomad",
    "tourism", "туризм", "passport", "globe", "мир",
  ],
  fitness: [
    "fitness", "фитнес", "gym", "зал", "workout", "тренировка", "training",
    "bodybuilding", "бодибилдинг", "crossfit", "кроссфит", "personal trainer",
    "тренер", "health", "здоровье", "wellness", "велнес",
  ],
  running: [
    "running", "бег", "runner", "бегун", "marathon", "марафон", "trail running",
    "half marathon", "полумарафон", "jogging", "5k", "10k", "ultra", "strava",
  ],
  cycling: [
    "cycling", "велоспорт", "cyclist", "велосипедист", "bike", "велосипед",
    "bicycle", "road cycling", "mtb", "mountain bike",
  ],
  triathlon: [
    "triathlon", "триатлон", "triathlete", "триатлет", "ironman", "swim bike run",
  ],
  business: [
    "business", "бизнес", "entrepreneur", "предприниматель", "ceo", "founder",
    "основатель", "leadership", "management", "менеджмент", "growth", "scale",
  ],
  startups: [
    "startup", "стартап", "saas", "venture", "vc", "fundraising", "pitch",
    "accelerator", "акселератор", "incubator", "инкубатор", "mvp", "product market fit",
  ],
  ai: [
    "ai", "artificial intelligence", "искусственный интеллект", "machine learning",
    "ml", "deep learning", "нейросети", "neural network", "gpt", "llm",
    "data science", "computer vision", "nlp", "chatgpt", "openai",
  ],
  coding: [
    "coding", "programming", "программирование", "developer", "разработчик",
    "software engineer", "frontend", "backend", "fullstack", "javascript",
    "python", "react", "typescript", "code", "github", "open source", "devops",
  ],
  education: [
    "education", "образование", "teacher", "учитель", "professor", "профессор",
    "mentor", "ментор", "coaching", "коучинг", "learning", "обучение",
    "university", "университет", "school", "школа", "course", "курс",
  ],
  parenting: [
    "parenting", "родительство", "mom", "мама", "dad", "папа", "family", "семья",
    "kids", "дети", "motherhood", "материнство", "fatherhood", "baby", "малыш",
  ],
  food: [
    "food", "еда", "cooking", "готовка", "chef", "шеф", "recipe", "рецепт",
    "foodie", "restaurant", "ресторан", "gastronomy", "гастрономия", "baking",
    "выпечка", "vegan", "healthy eating", "правильное питание", "пп",
  ],
  local_business: [
    "local business", "малый бизнес", "small business", "shop", "магазин",
    "store", "салон", "salon", "cafe", "кафе", "service", "услуги",
  ],
  real_estate: [
    "real estate", "недвижимость", "realtor", "риэлтор", "property", "жильё",
    "apartment", "квартира", "house", "дом", "mortgage", "ипотека", "agent",
  ],
  architecture: [
    "architecture", "архитектура", "architect", "архитектор", "interior design",
    "дизайн интерьера", "interior", "интерьер", "building", "construction",
  ],
  marketing: [
    "marketing", "маркетинг", "digital marketing", "smm", "seo", "content marketing",
    "контент-маркетинг", "advertising", "реклама", "pr", "branding", "growth hacking",
    "social media", "email marketing", "performance marketing", "таргет",
  ],
  ecommerce: [
    "ecommerce", "e-commerce", "электронная коммерция", "online store",
    "интернет-магазин", "dropshipping", "shopify", "amazon", "marketplace",
    "маркетплейс", "wildberries", "ozon", "wb",
  ],
  music: [
    "music", "музыка", "musician", "музыкант", "producer", "продюсер",
    "dj", "rapper", "singer", "певец", "певица", "songwriter", "beat",
  ],
  art: [
    "art", "искусство", "artist", "художник", "gallery", "галерея",
    "contemporary art", "современное искусство", "painting", "живопись",
    "sculpture", "скульптура", "exhibition", "выставка",
  ],
  gaming: [
    "gaming", "gamer", "esports", "киберспорт", "streamer", "стример",
    "twitch", "playstation", "xbox", "nintendo", "pc gaming",
  ],
  crypto: [
    "crypto", "крипто", "bitcoin", "btc", "ethereum", "blockchain", "блокчейн",
    "web3", "nft", "defi", "trading", "трейдинг",
  ],
};

export const SEGMENT_KEYWORDS: Record<string, string[]> = {
  designer: [
    "designer", "дизайнер", "design studio", "дизайн-студия", "creative director",
    "art director", "visual artist", "ui designer", "ux designer", "web designer",
  ],
  founder: [
    "founder", "основатель", "co-founder", "сооснователь", "ceo", "cto", "coo",
    "entrepreneur", "предприниматель", "business owner", "владелец бизнеса",
  ],
  developer: [
    "developer", "разработчик", "programmer", "программист", "software engineer",
    "инженер", "coder", "frontend", "backend", "fullstack", "devops", "sre",
  ],
  creator: [
    "creator", "автор", "content creator", "контент-мейкер", "influencer",
    "инфлюенсер", "blogger", "блогер", "youtuber", "ютубер", "tiktoker",
  ],
  agency: [
    "agency", "агентство", "studio", "студия", "creative agency", "digital agency",
    "marketing agency", "рекламное агентство", "design agency",
  ],
  "school/education": [
    "school", "школа", "academy", "академия", "university", "университет",
    "online school", "онлайн-школа", "course", "курс", "training", "обучение",
    "edtech", "bootcamp",
  ],
  "local_business_owner": [
    "owner", "владелец", "local", "местный", "shop owner", "salon owner",
    "restaurant owner", "cafe owner", "small business",
  ],
  athlete: [
    "athlete", "спортсмен", "спортсменка", "professional athlete", "pro athlete",
    "olympian", "champion", "чемпион", "coach", "тренер",
  ],
  parent: [
    "mom", "мама", "dad", "папа", "parent", "родитель", "mommy", "daddy",
    "mother", "father", "мамочка",
  ],
  "lifestyle_consumer": [
    "lifestyle", "лайфстайл", "life", "жизнь", "daily", "everyday",
    "living my best life", "love life",
  ],
  "media/journalist": [
    "journalist", "журналист", "reporter", "репортёр", "editor", "редактор",
    "writer", "писатель", "author", "автор", "media", "сми", "press",
  ],
  "recruiter/hr": [
    "recruiter", "рекрутер", "hr", "hiring", "talent acquisition",
    "headhunter", "хедхантер", "human resources",
  ],
  photographer: [
    "photographer", "фотограф", "photography studio", "photo studio",
    "фотостудия", "wedding photographer", "свадебный фотограф",
  ],
  marketer: [
    "marketer", "маркетолог", "growth", "smm", "seo", "content manager",
    "контент-менеджер", "social media manager", "performance",
  ],
};

export const INTENT_SIGNALS: Record<string, string[]> = {
  personal: [
    "personal", "личный", "just me", "everyday", "life", "жизнь",
    "hobby", "хобби", "private", "my life",
  ],
  professional: [
    "professional", "профессионал", "expert", "эксперт", "specialist",
    "специалист", "certified", "сертифицированный", "official",
  ],
  creator: [
    "creator", "автор", "content", "контент", "subscribe", "подписывайтесь",
    "new video", "новое видео", "link in bio", "ссылка в шапке",
  ],
  business: [
    "business", "бизнес", "company", "компания", "brand", "бренд",
    "official account", "official page", "dm for", "order", "заказ",
    "shop", "магазин", "price", "цена", "доставка", "delivery",
  ],
};

export const COMMERCIAL_SIGNALS: Record<string, string[]> = {
  likely_b2b: [
    "b2b", "enterprise", "saas", "api", "platform", "платформа",
    "solution", "решение", "corporate", "корпоративный", "partnership",
    "партнёрство", "clients", "клиенты",
  ],
  likely_b2c: [
    "b2c", "consumer", "shop", "магазин", "buy", "купить", "sale",
    "скидка", "discount", "free shipping", "бесплатная доставка",
    "order now", "закажи",
  ],
  likely_collaboration_candidate: [
    "collab", "collaboration", "коллаборация", "partnership", "dm for collab",
    "open for", "available for", "let's work", "совместный проект",
  ],
  likely_customer: [
    "looking for", "ищу", "need", "нужен", "recommend", "порекомендуйте",
    "help me", "советуйте", "want to buy",
  ],
  likely_peer: [
    "colleague", "коллега", "fellow", "community", "сообщество",
    "industry", "индустрия", "conference", "конференция", "meetup",
  ],
};

export const LINK_DOMAIN_CATEGORIES: Record<string, string[]> = {
  portfolio: [
    "behance.net", "dribbble.com", "artstation.com", "deviantart.com",
    "carbonmade.com", "coroflot.com", "myportfolio.com",
  ],
  developer: [
    "github.com", "gitlab.com", "stackoverflow.com", "dev.to",
    "medium.com", "hashnode.dev", "codepen.io", "npmjs.com",
  ],
  business: [
    "linkedin.com", "crunchbase.com", "angel.co", "wellfound.com",
  ],
  ecommerce: [
    "shopify.com", "etsy.com", "gumroad.com", "amazon.com",
    "wildberries.ru", "ozon.ru", "lamoda.ru",
  ],
  creator: [
    "youtube.com", "youtu.be", "tiktok.com", "twitch.tv",
    "patreon.com", "ko-fi.com", "buymeacoffee.com", "substack.com",
  ],
  linktree: [
    "linktr.ee", "linkin.bio", "tap.bio", "beacons.ai",
    "bio.link", "campsite.bio", "stan.store",
  ],
  music: [
    "spotify.com", "soundcloud.com", "apple.com/music", "bandcamp.com",
  ],
  photography: [
    "500px.com", "flickr.com", "unsplash.com", "smugmug.com",
  ],
  design: [
    "figma.com", "canva.com", "adobe.com", "creativefabrica.com",
  ],
  typefoundry: [
    "myfonts.com", "fontshop.com", "type.today", "fonts.google.com",
    "fontspring.com", "futurefonts.xyz",
  ],
};

export const EMOJI_INTEREST_MAP: Record<string, string[]> = {
  "📸": ["photography"], "📷": ["photography"], "🎥": ["photography"],
  "🎨": ["art", "graphic_design"], "🖌️": ["art", "illustration"],
  "✏️": ["illustration", "graphic_design"], "🖊️": ["typography"],
  "💻": ["coding", "business"], "⌨️": ["coding"],
  "🏃": ["running", "fitness"], "🏃‍♀️": ["running", "fitness"],
  "🚴": ["cycling"], "🚴‍♂️": ["cycling"],
  "🏊": ["triathlon", "fitness"], "🏋️": ["fitness"],
  "✈️": ["travel"], "🌍": ["travel"], "🗺️": ["travel"],
  "🌎": ["travel"], "🌏": ["travel"], "🧳": ["travel"],
  "👗": ["fashion"], "👠": ["fashion"], "💄": ["beauty", "fashion"],
  "🍕": ["food"], "🍳": ["food"], "👨‍🍳": ["food"], "🍰": ["food"],
  "🎵": ["music"], "🎶": ["music"], "🎸": ["music"], "🎹": ["music"],
  "🏠": ["real_estate", "architecture"], "🏗️": ["architecture"],
  "📱": ["coding", "startups"], "🚀": ["startups", "business"],
  "💰": ["business", "crypto"], "📈": ["marketing", "business"],
  "🎓": ["education"], "📚": ["education"],
  "👶": ["parenting"], "👨‍👩‍👧": ["parenting"], "🤰": ["parenting"],
  "🎮": ["gaming"], "🕹️": ["gaming"],
  "🐕": ["lifestyle_consumer"], "🐈": ["lifestyle_consumer"],
  "💎": ["ecommerce", "fashion"], "🛒": ["ecommerce"],
  "🧘": ["fitness", "wellness"], "🧘‍♀️": ["fitness"],
};

export const GEO_KEYWORDS: Record<string, string[]> = {
  "Moscow": ["москва", "moscow", "мск", "msk"],
  "Saint Petersburg": ["петербург", "spb", "спб", "питер", "saint petersburg", "st. petersburg"],
  "Kyiv": ["kyiv", "київ", "киев"],
  "New York": ["new york", "nyc", "ny", "нью-йорк"],
  "London": ["london", "лондон"],
  "Berlin": ["berlin", "берлин"],
  "Paris": ["paris", "париж"],
  "Dubai": ["dubai", "дубай", "дубаи"],
  "Istanbul": ["istanbul", "стамбул"],
  "Bali": ["bali", "бали"],
  "Los Angeles": ["los angeles", "la", "лос-анджелес"],
  "San Francisco": ["san francisco", "sf", "сан-франциско"],
  "Tokyo": ["tokyo", "токио"],
  "Amsterdam": ["amsterdam", "амстердам"],
  "Barcelona": ["barcelona", "барселона"],
  "Miami": ["miami", "майами"],
  "Singapore": ["singapore", "сингапур"],
  "Bangkok": ["bangkok", "бангкок"],
  "Tbilisi": ["tbilisi", "тбилиси"],
  "Yerevan": ["yerevan", "ереван"],
  "Almaty": ["almaty", "алматы"],
  "Minsk": ["minsk", "минск"],
  "Warsaw": ["warsaw", "варшава"],
  "Prague": ["prague", "прага"],
  "Lisbon": ["lisbon", "лиссабон"],
  "Novosibirsk": ["новосибирск", "novosibirsk"],
  "Kazan": ["казань", "kazan"],
  "Sochi": ["сочи", "sochi"],
};

export const SENSITIVE_CATEGORIES = new Set([
  "religion", "political_affiliation", "sexual_orientation",
  "ethnicity", "health_condition", "disability", "income_level",
  "relationship_status",
]);
