import { PrismaClient } from "@prisma/client";
import { normalizeBlockText, snapToWords } from "../lib/highlights/offsets";

const prisma = new PrismaClient();

/* ----------------------------- Deterministic RNG ----------------------------- */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260623);
const rand = () => rng();
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;
function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, n);
}

const DAY = 86400000;
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * DAY);

/* -------------------------------- Publishers -------------------------------- */
const PUBLISHERS = [
  { slug: "vedat-milor", name: "Vedat Milor", title: "Gastronomi", category: "Gastronomi", bio: "Damak, hafızanın en sadık arşividir." },
  { slug: "sinan-canan", name: "Sinan Canan", title: "Nörobilim", category: "Nörobilim", bio: "Zihni anlamak, kendine yabancılaşmamaktır." },
  { slug: "zeki-demirkubuz", name: "Zeki Demirkubuz", title: "Sinema", category: "Sinema", bio: "Kamerayı hiçbir şey olmayan anlarda açık tutmak." },
  { slug: "refika-birgul", name: "Refika Birgül", title: "Mutfak", category: "Gastronomi", bio: "İyi yemek, sevgiyle ölçülür." },
  { slug: "celal-sengor", name: "Celal Şengör", title: "Yerbilim", category: "Yerbilim", bio: "Bir taşın yaşı, bizim kibrimizi düzeltir." },
  { slug: "emrah-safa-gurkan", name: "Emrah Safa Gürkan", title: "Tarih", category: "Tarih", bio: "Geçmiş, hiçbir zaman geçmez." },
  { slug: "ugur-bati", name: "Uğur Batı", title: "Günlük Yaşam", category: "Günlük Yaşam", bio: "Sıradan olan, en çok saklananı taşır." },
  { slug: "defne-koryurek", name: "Defne Koryürek", title: "Mutfak", category: "Gastronomi", bio: "Yemek politik bir eylemdir." },
];

/* --------------------------------- Sponsors --------------------------------- */
const SPONSORS = [
  { slug: "hiwell", name: "Hiwell", logoText: "hiwell", category: "Psikoloji" },
  { slug: "taze-direkt", name: "Taze Direkt", logoText: "TAZE DİREKT", category: "Gastronomi" },
  { slug: "garanti-bbva", name: "Garanti BBVA", logoText: "Garanti BBVA", category: "Günlük Yaşam" },
];

/* ------------------------------- Hero articles ------------------------------ */
type ArticleSpec = {
  slug: string;
  title: string;
  subject: string;
  category: string;
  pullQuote: string;
  publisher: string;
  theme: string;
  blocks?: string[];
  daysAgo: number;
  live?: boolean;
};

const HERO: ArticleSpec[] = [
  {
    slug: "sebepsiz-aci", title: "Sebepsiz Acı", category: "Sinema", publisher: "zeki-demirkubuz", theme: "crimson", daysAgo: 1,
    subject: "Adını koyamadığın o ağırlık üzerine.",
    pullQuote: "Belki de dünyadaki en büyük acı budur. Sebebi olmayan.",
    blocks: [
      "Acı çoğu zaman yaşananlardan değil, farkındalıktan doğar. İnsan, başına gelenden çok, başına geleni anladığı an çöker.",
      "Bir sabah uyanırsın ve hiçbir şey olmamıştır. Yine de göğsünde bir ağırlık vardır, adını koyamadığın. Belki de dünyadaki en büyük acı budur. Sebebi olmayan.",
      "Sebebi olan acıya tutunabilirsin; onu anlatır, paylaşır, bir gün geçmesini beklersin. Ama sebepsiz olanı kime anlatacaksın?",
      "Sinema bana bunu öğretti: kamerayı en çok, hiçbir şey olmayan anlarda açık tutmak gerekir. Çünkü insan asıl orada, kimse bakmıyorken kırılır.",
    ],
  },
  {
    slug: "beynin-en-buyuk-yalani", title: "Beynin En Büyük Yalanı", category: "Nörobilim", publisher: "sinan-canan", theme: "midnight", daysAgo: 0, live: true,
    subject: "Beyin, karar vermeden 300 milisaniye önce harekete geçiyor. Peki özgür irade gerçek mi?",
    pullQuote: "Kararı sen vermiyorsun; sen yalnızca onaylıyorsun.",
    blocks: [
      "Elini kaldırmaya 'karar verdiğini' sandığın andan yaklaşık üç yüz milisaniye önce, beynin o hareketi çoktan başlatmıştır.",
      "Libet'in deneyleri yarım asırdır tartışılıyor. Sonuç rahatsız edici: kararı sen vermiyorsun; sen yalnızca onaylıyorsun.",
      "Belki de özgür irade dediğimiz şey bir karar değil, bir veto hakkıdır. Beynin başlattığını son anda durdurabilme gücü.",
      "Bu, sorumluluğu ortadan kaldırmaz. Aksine, kendini tanımak için elimizdeki en güçlü araç, bu rahatsızlıkla yüzleşmektir.",
    ],
  },
  {
    slug: "makarna-pisirmek-bir-felsefe", title: "Makarna Pişirmek Bir Felsefe", category: "Gastronomi", publisher: "vedat-milor", theme: "amber", daysAgo: 2,
    subject: "Al dente tartışması sabır üzerine.",
    pullQuote: "Makarnayı suya atmak kolay; doğru anda çıkarmak bir ömür ister.",
    blocks: [
      "İyi makarna pahalı malzemeyle değil, dikkatle yapılır. Tuzun miktarı, suyun bolluğu, ateşin sabrı.",
      "Al dente, 'dişe gelen' demek. Ne çiğ ne fazla pişmiş; tam o eşikte. Makarnayı suya atmak kolay; doğru anda çıkarmak bir ömür ister.",
      "Sosu makarnaya değil, makarnayı sosa götürürsün. Tavada birkaç saniye buluştuklarında ikisi tek bir şeye dönüşür.",
      "Mutfak aceleyi affetmez. Sabrı olanın sofrası her zaman daha lezzetlidir.",
    ],
  },
  {
    slug: "zeytinyaginin-agirligi", title: "Zeytinyağının Ağırlığı", category: "Gastronomi", publisher: "vedat-milor", theme: "forest", daysAgo: 3,
    subject: "Bir damlada bölge, toprak, zaman.",
    pullQuote: "İyi zeytinyağı acıdır; çünkü gerçek olan her şey biraz acıdır.",
    blocks: [
      "Bir kaşık zeytinyağı aslında bir coğrafyadır. Toprağın taşı, güneşin açısı, hasadın saati; hepsi o damlada saklı.",
      "Tadım yaparken acılığı kusur sanırlar. Oysa iyi zeytinyağı acıdır; çünkü gerçek olan her şey biraz acıdır.",
      "Erken hasat daha keskin, daha yeşil. Geç hasat yumuşak ama yorgun. Seçim damağın değil, niyetin meselesidir.",
    ],
  },
  {
    slug: "sinirlar-neden-bu-kadar-zor", title: "Sınırlar Neden Bu Kadar Zor?", category: "Psikoloji", publisher: "sinan-canan", theme: "violet", daysAgo: 4,
    subject: "Hayır demenin nörobilimi.",
    pullQuote: "Sınır koymak reddetmek değildir; kendine ait olanı korumaktır.",
    blocks: [
      "'Hayır' demek çoğumuz için fiziksel bir rahatsızlık yaratır. Çünkü beyin, dışlanmayı tehditle aynı bölgede işler.",
      "Sınır koymak reddetmek değildir; kendine ait olanı korumaktır. Ama bunu öğrenmek yıllarımızı alır.",
      "Suçluluk, sınırın bedeli değil; sağlıklı bir sınırın ilk belirtisidir.",
    ],
  },
  {
    slug: "sofranin-hafizasi", title: "Sofranın Hafızası", category: "Gastronomi", publisher: "vedat-milor", theme: "sand", daysAgo: 6,
    subject: "Her tabak bir şehrin hafızasını taşır.",
    pullQuote: "Bir yemeği hatırlamak aslında bir anı hatırlamaktır.",
    blocks: [
      "Hiçbir tarif tarafsız değildir. Her tabak bir mutfağın, bir annenin, bir şehrin hafızasını taşır.",
      "Bir yemeği hatırlamak aslında bir anı hatırlamaktır. Damak, beynin en sadık arşividir.",
      "Bu yüzden bir kokuyla yıllar öncesine düşeriz. Sofra, zamanda yolculuğun en eski makinesidir.",
    ],
  },
  {
    slug: "farkindalik-bir-yuk-mu", title: "Farkındalık Bir Yük mü?", category: "Psikoloji", publisher: "sinan-canan", theme: "graphite", daysAgo: 8,
    subject: "Görmek bazen en ağır yüktür.",
    pullQuote: "Farkındalık bir hediyedir. Ama hediyenin ağırlığını taşımak zordur.",
    blocks: [
      "Daha çok farkında olmak her zaman daha mutlu olmak demek değildir. Bazen görmek, en ağır yüktür.",
      "Farkındalık bir hediyedir. Ama hediyenin ağırlığını taşımak zordur.",
      "Yine de geri dönüş yoktur. Bir kez gören göz, görmemeyi seçemez.",
    ],
  },
];

/* ----------------------------- Generated fillers ---------------------------- */
const SENTENCES = [
  "Sıradan görünen her şey, dikkatle bakıldığında tuhaflaşır.",
  "Bilmek ile anlamak arasındaki mesafe, bir ömür kadar uzundur.",
  "Acele eden, yalnızca yüzeyi görür.",
  "Hafıza bir arşiv değil, sürekli yeniden yazılan bir metindir.",
  "En basit şeyler, en zor öğrenilenlerdir.",
  "İnsan, anlattığı hikâyenin kendisidir.",
  "Zaman geçmez; biz onun içinden geçeriz.",
  "Sessizlik de bir cevaptır, hatta en dürüst olanı.",
  "Alışkanlık, görünmez bir kafestir.",
  "Merak, zekânın en sadık yoldaşıdır.",
  "Bir şeyi gerçekten sevmek, ona zaman ayırmaktır.",
  "Korku, çoğu zaman bilgisizliğin gölgesidir.",
  "Sabır, pasiflik değil; doğru anı bekleme sanatıdır.",
  "Gerçek olan her şey biraz pürüzlüdür.",
  "Yavaşlamak, kaçırmamanın tek yoludur.",
];

const FILLERS: ArticleSpec[] = [
  { slug: "ekmek-neden-kutsaldir", title: "Ekmek Neden Kutsaldır", category: "Gastronomi", publisher: "vedat-milor", theme: "amber", daysAgo: 5, subject: "En küçük lokmanın en uzun tarihi.", pullQuote: "Ekmeği bölüşmek, en eski barış antlaşmasıdır." },
  { slug: "tuzun-kisa-tarihi", title: "Tuzun Kısa Tarihi", category: "Gastronomi", publisher: "defne-koryurek", theme: "sand", daysAgo: 7, subject: "Bir tutamın imparatorlukları.", pullQuote: "Tuz, lezzeti yaratmaz; saklı olanı açığa çıkarır." },
  { slug: "fermentasyon-ve-sabir", title: "Fermentasyon ve Sabır", category: "Gastronomi", publisher: "defne-koryurek", theme: "forest", daysAgo: 9, subject: "Bekleyişin kimyası.", pullQuote: "Mayalanma, zamanın yemeğe verdiği armağandır." },
  { slug: "bir-tabagin-cografyasi", title: "Bir Tabağın Coğrafyası", category: "Gastronomi", publisher: "refika-birgul", theme: "crimson", daysAgo: 11, subject: "Tabaktaki harita.", pullQuote: "Her tarif, bir yere ait olma çabasıdır." },
  { slug: "mutfakta-sessizlik", title: "Mutfakta Sessizlik", category: "Gastronomi", publisher: "refika-birgul", theme: "graphite", daysAgo: 13, subject: "Pişirmenin meditasyonu.", pullQuote: "Mutfak, kafanın değil, ellerin düşündüğü yerdir." },
  { slug: "hafiza-nasil-yaniltir", title: "Hafıza Nasıl Yanıltır", category: "Nörobilim", publisher: "sinan-canan", theme: "midnight", daysAgo: 10, subject: "Hatırladığını sandığın şey.", pullQuote: "Her hatırlayış, anıyı biraz daha değiştirir." },
  { slug: "uyku-ve-unutma", title: "Uyku ve Unutma", category: "Nörobilim", publisher: "sinan-canan", theme: "violet", daysAgo: 12, subject: "Beyin geceleri neyi siler?", pullQuote: "Unutmak bir kusur değil, bir bakım işlemidir." },
  { slug: "empati-ogrenilebilir-mi", title: "Empati Öğrenilebilir mi?", category: "Psikoloji", publisher: "ugur-bati", theme: "forest", daysAgo: 14, subject: "Aynalı nöronların vaadi.", pullQuote: "Empati bir duygu değil, bir dikkat biçimidir." },
  { slug: "yalnizlik-ve-sehir", title: "Yalnızlık ve Şehir", category: "Günlük Yaşam", publisher: "ugur-bati", theme: "ink", daysAgo: 15, subject: "Kalabalıkta yalnız kalmak.", pullQuote: "Şehir, herkesin yanında kimsenin olmadığı yerdir." },
  { slug: "sabah-rituelleri", title: "Sabah Ritüelleri", category: "Günlük Yaşam", publisher: "ugur-bati", theme: "amber", daysAgo: 16, subject: "Günü kuran ilk on dakika.", pullQuote: "Sabahı kuran, günü kurar." },
  { slug: "zamani-yavaslatmak", title: "Zamanı Yavaşlatmak", category: "Günlük Yaşam", publisher: "ugur-bati", theme: "graphite", daysAgo: 18, subject: "Dikkatin zaman algısı.", pullQuote: "Zamanı yavaşlatmanın tek yolu, dikkatle bakmaktır." },
  { slug: "paranin-gorunmeyen-yuku", title: "Paranın Görünmeyen Yükü", category: "Günlük Yaşam", publisher: "ugur-bati", theme: "midnight", daysAgo: 20, subject: "Hesabın ötesindeki maliyet.", pullQuote: "Her harcama, bir saat ömrün takasıdır." },
  { slug: "depremin-hafizasi", title: "Depremin Hafızası", category: "Yerbilim", publisher: "celal-sengor", theme: "sand", daysAgo: 17, subject: "Fayların uzun belleği.", pullQuote: "Yer, unutmaz; yalnızca bekler." },
  { slug: "bir-tasin-yasi", title: "Bir Taşın Yaşı", category: "Yerbilim", publisher: "celal-sengor", theme: "graphite", daysAgo: 19, subject: "Milyon yılların ölçeği.", pullQuote: "Bir taşın yaşı, bizim kibrimizi düzeltir." },
  { slug: "anadolunun-alti", title: "Anadolu'nun Altı", category: "Yerbilim", publisher: "celal-sengor", theme: "crimson", daysAgo: 22, subject: "Ayağımızın altındaki kıtalar.", pullQuote: "Üstünde yürüdüğümüz toprak, aslında bir kavşaktır." },
  { slug: "imparatorluklarin-sofrasi", title: "İmparatorlukların Sofrası", category: "Tarih", publisher: "emrah-safa-gurkan", theme: "amber", daysAgo: 21, subject: "Mutfakta saklı diplomasi.", pullQuote: "Tarih, çoğu zaman sofrada yazıldı." },
  { slug: "korkunun-kisa-tarihi", title: "Korkunun Kısa Tarihi", category: "Tarih", publisher: "emrah-safa-gurkan", theme: "violet", daysAgo: 24, subject: "İktidar ve dehşet.", pullQuote: "Korku yönetmenin en ucuz, en pahalı yoludur." },
  { slug: "sehirler-nasil-dogar", title: "Şehirler Nasıl Doğar", category: "Günlük Yaşam", publisher: "emrah-safa-gurkan", theme: "forest", daysAgo: 26, subject: "Bir pazarın etrafında.", pullQuote: "Her şehir, bir buluşma vaadinin etrafında büyür." },
];

function buildFillerBlocks(spec: ArticleSpec): string[] {
  const intro = `${spec.subject} ${pick(SENTENCES)}`;
  const p2 = `${pick(SENTENCES)} ${pick(SENTENCES)} ${spec.pullQuote}`;
  const p3 = `${pick(SENTENCES)} ${pick(SENTENCES)}`;
  const p4 = `${pick(SENTENCES)} ${pick(SENTENCES)}`;
  return [intro, p2, p3, p4];
}

/* ----------------------------------- Users ---------------------------------- */
const FIRST = ["Efe", "Deniz", "Ece", "Mert", "Zeynep", "Can", "Elif", "Arda", "Naz", "Kerem", "Selin", "Burak", "İrem", "Onur", "Bora", "Ada", "Cem", "Lale", "Tan", "Sena", "Kaan", "Derya", "Eren", "Aslı", "Yağmur", "Barış", "Pelin", "Ufuk", "Melis", "Sarp", "Gizem", "Tolga", "Bilge", "Sinan", "Defne", "Umut", "Ozan", "Çağla", "Berk", "Esra"];
const LAST = ["Yılmaz", "Demir", "Kaya", "Şahin", "Aydın", "Aksoy", "Çelik", "Koç", "Arslan", "Doğan", "Kılıç", "Acar", "Erdem", "Polat", "Taş", "Güneş", "Korkmaz", "Yıldız", "Aslan", "Bulut"];

async function main() {
  console.log("Seeding Tuhaf Club...\n");

  // Reset (FK-safe order)
  await prisma.notification.deleteMany();
  await prisma.highlight.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.articleBlock.deleteMany();
  await prisma.article.deleteMany();
  await prisma.emailSubscription.deleteMany();
  await prisma.publisher.deleteMany();
  await prisma.sponsor.deleteMany();
  await prisma.user.deleteMany();

  // Publishers
  const pubBySlug = new Map<string, string>();
  for (const p of PUBLISHERS) {
    const row = await prisma.publisher.create({
      data: { ...p, avatarSeed: p.slug },
    });
    pubBySlug.set(p.slug, row.id);
  }

  // Sponsors
  const sponsorByCategory = new Map<string, string>();
  for (const s of SPONSORS) {
    const row = await prisma.sponsor.create({ data: s });
    sponsorByCategory.set(s.category, row.id);
  }

  // Users — first is the demo user using the operator's real email.
  const users: { id: string; displayName: string }[] = [];
  const demo = await prisma.user.create({
    data: { email: "efe@infinics.xyz", displayName: "Efe", avatarSeed: "efe@infinics.xyz" },
  });
  users.push(demo);

  for (let i = 0; i < 44; i++) {
    const first = FIRST[(i + 1) % FIRST.length]!;
    const last = pick(LAST);
    const name = `${first} ${last}`;
    const email = `${first}.${last}.${i}`
      .toLocaleLowerCase("tr")
      .replace(/ç/g, "c").replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u") + "@tuhaf.test";
    const u = await prisma.user.create({
      data: { email, displayName: name, avatarSeed: email },
    });
    users.push(u);
  }
  console.log(`Users: ${users.length}`);

  // Articles + blocks
  const allSpecs = [...HERO, ...FILLERS];
  type SeededBlock = { id: string; text: string };
  const articleBlocks = new Map<string, { articleId: string; pullQuote: string; blocks: SeededBlock[] }>();

  for (const spec of allSpecs) {
    const publisherId = pubBySlug.get(spec.publisher)!;
    const sponsorId = sponsorByCategory.get(spec.category) ?? null;
    const rawBlocks = spec.blocks ?? buildFillerBlocks(spec);

    const article = await prisma.article.create({
      data: {
        slug: spec.slug,
        title: spec.title,
        subject: spec.subject,
        category: spec.category,
        pullQuote: spec.pullQuote,
        readMinutes: randInt(3, 6),
        listenSeconds: randInt(180, 360),
        posterTheme: spec.theme,
        status: "published",
        isLive: !!spec.live,
        publishedAt: daysAgo(spec.daysAgo),
        publisherId,
        sponsorId,
      },
    });

    const seeded: SeededBlock[] = [];
    for (let i = 0; i < rawBlocks.length; i++) {
      const text = normalizeBlockText(rawBlocks[i]!);
      const block = await prisma.articleBlock.create({
        data: { articleId: article.id, index: i, type: "paragraph", text },
      });
      seeded.push({ id: block.id, text });
    }
    articleBlocks.set(spec.slug, {
      articleId: article.id,
      pullQuote: normalizeBlockText(spec.pullQuote),
      blocks: seeded,
    });
  }
  console.log(`Articles: ${allSpecs.length}`);

  // Highlights — clustered on the pull-quote sentence so heatmaps + overlap pop.
  type HRow = { userId: string; blockId: string; articleId: string; startOffset: number; endOffset: number; text: string };
  const rows: HRow[] = [];
  const seen = new Set<string>();
  const addRow = (r: HRow) => {
    const key = `${r.userId}:${r.blockId}:${r.startOffset}:${r.endOffset}`;
    if (seen.has(key) || r.startOffset >= r.endOffset) return;
    seen.add(key);
    rows.push(r);
  };

  const spanFromPhrase = (text: string, phrase: string, trimStart = 0, trimEnd = 0) => {
    const idx = text.indexOf(phrase);
    if (idx < 0) return null;
    const raw = { start: idx + trimStart, end: idx + phrase.length - trimEnd };
    return snapToWords(text, raw);
  };

  const randomWordSpan = (text: string) => {
    const words = [...text.matchAll(/[\p{L}\p{M}\p{N}]+/gu)];
    if (words.length < 3) return null;
    const i = randInt(0, words.length - 3);
    const len = randInt(2, Math.min(6, words.length - i));
    const startWord = words[i]!;
    const endWord = words[i + len - 1]!;
    const start = startWord.index!;
    const end = endWord.index! + endWord[0].length;
    return snapToWords(text, { start, end });
  };

  for (const spec of allSpecs) {
    const data = articleBlocks.get(spec.slug)!;
    const hotBlock = data.blocks.find((b) => b.text.includes(data.pullQuote));

    // Popularity: live + hero articles get more underliners.
    const popularity = spec.live ? 30 : spec.blocks ? randInt(14, 26) : randInt(4, 14);
    const readers = sample(users, popularity);

    for (const reader of readers) {
      // Most readers underline the pull-quote, with slight start/end variation
      // to create partial overlaps and varying heat.
      if (hotBlock && rand() < 0.8) {
        const trimStart = rand() < 0.3 ? randInt(1, 6) : 0;
        const trimEnd = rand() < 0.3 ? randInt(1, 6) : 0;
        const span = spanFromPhrase(hotBlock.text, data.pullQuote, trimStart, trimEnd);
        if (span && span.start < span.end) {
          addRow({
            userId: reader.id, blockId: hotBlock.id, articleId: data.articleId,
            startOffset: span.start, endOffset: span.end,
            text: hotBlock.text.slice(span.start, span.end),
          });
        }
      }
      // Some additional random underlines.
      const extra = randInt(0, 2);
      for (let k = 0; k < extra; k++) {
        const block = pick(data.blocks);
        const span = randomWordSpan(block.text);
        if (span && span.start < span.end) {
          addRow({
            userId: reader.id, blockId: block.id, articleId: data.articleId,
            startOffset: span.start, endOffset: span.end,
            text: block.text.slice(span.start, span.end),
          });
        }
      }
    }
  }

  // Spread highlight createdAt across recent days for the journal timeline.
  await prisma.highlight.createMany({
    data: rows.map((r) => ({ ...r, createdAt: daysAgo(randInt(0, 20)) })),
  });
  console.log(`Highlights: ${rows.length}`);

  // Follows — each user follows a few others.
  const followSeen = new Set<string>();
  const followData: { followerId: string; followeeId: string }[] = [];
  for (const u of users) {
    for (const t of sample(users, randInt(2, 6))) {
      if (t.id === u.id) continue;
      const key = `${u.id}:${t.id}`;
      if (followSeen.has(key)) continue;
      followSeen.add(key);
      followData.push({ followerId: u.id, followeeId: t.id });
    }
  }
  await prisma.follow.createMany({ data: followData });
  console.log(`Follows: ${followData.length}`);

  // Subscriptions
  await prisma.emailSubscription.createMany({
    data: sample(users, 28).map((u, i) => ({
      email: `abone${i}@tuhaf.test`,
      status: "confirmed",
    })),
  });

  // A few notifications for the demo user.
  const others = users.slice(1);
  await prisma.notification.createMany({
    data: [
      { userId: demo.id, type: "overlap", actorUserId: pick(others).id, body: `${pick(others).displayName} senin de altını çizdiğin bir cümleyi işaretledi.` },
      { userId: demo.id, type: "follow", actorUserId: pick(others).id, body: `${pick(others).displayName} seni takip etmeye başladı.` },
      { userId: demo.id, type: "new_article", body: "Sinan Canan'dan yeni bir yazı yayında: Beynin En Büyük Yalanı." },
    ],
  });

  console.log("\nDone. Sample logins (allowlist):");
  console.log("  efe@infinics.xyz   (demo user — has highlights)");
  for (const u of users.slice(1, 4)) {
    const full = await prisma.user.findUnique({ where: { id: u.id } });
    console.log(`  ${full!.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
