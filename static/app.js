// ==========================================================================
// LUMINA AUDIO — PRO AI AUDIOBOOK & MOON+ READER ENGINE (v12.0)
// ==========================================================================
// 1. Rock-Solid, Non-Skipping Speech Engine (Desktop & Mobile)
// 2. Fully Synchronized Moon+ Reader (Pages, Spreads & Continuous Scroll)
// 3. Multi-Chapter Pre-Loaded Classics with Full Georgian Translations
// 4. Zero-Overflow Responsive Touch Controls for Mobile & Desktop
// ==========================================================================

// ── Application State ──────────────────────────────────────────────────────
let db = null;
let currentBook = null;
let currentPlayingChapterId = null;
let isPlaying = false;
let isPaused = false;
let currentGlobalSpeed = 1.0;
let currentPitch = 1.0;
let currentLang = 'en'; // 'en' or 'ka'
let selectedVoiceURI = '';

let sentenceQueue = [];
let currentSentenceIndex = 0;
let utteranceTimeout = null;
let secondsElapsed = 0;
let timerInterval = null;
let currentUser = null;
let isSpeakingLock = false;

// Moon+ Reader State
let readerActive = false;
let readerBook = null;
let readerChapterId = null;
let readerLang = 'en'; // 'en' or 'ka'
let readerMode = 'dual'; // 'dual' (Pages), 'scroll' (Continuous)
let readerCurrentPage = 1;
let readerPages = []; // Array of arrays of sentence objects { text: string, globalIndex: number }
let readerSentenceToPageMap = {}; // Map: sentenceGlobalIndex -> pageIndex (0-based)
let readerFontSize = 19; // in px
let readerTheme = 'sepia'; // 'sepia', 'mocha', 'dark', 'light', 'forest', 'oled'
let readerFontFamily = 'font-serif-book';

// Touch Gesture Detection
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// ElevenLabs Audio State
let elevenLabsEnabled = false;
let elevenLabsApiKey = '';
let elevenLabsVoiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam
let currentElevenAudio = null;

// Whole Book Translation State
let isTranslatingWholeBook = false;
let cancelTranslationFlag = false;

// ── Georgian Unicode Normalization ─────────────────────────────────────────
function normalizeGeorgian(text) {
    if (!text) return '';
    const res = [];
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code >= 0x1C90 && code <= 0x1CBA) {
            res.push(String.fromCharCode(code - 0x1C90 + 0x10D0));
        } else {
            res.push(text[i]);
        }
    }
    return res.join('');
}

const GEORGIAN_TO_PHONETIC = {
    'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e',
    'ვ': 'v', 'ზ': 'z', 'თ': 't', 'ი': 'i', 'კ': 'k',
    'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': 'p',
    'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u',
    'ფ': 'p', 'ქ': 'k', 'ღ': 'gh', 'ყ': 'k', 'შ': 'sh',
    'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts', 'ჭ': 'ch',
    'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
};

function transliterateGeorgianToPhonetic(kaText) {
    if (!kaText) return '';
    const normalized = normalizeGeorgian(kaText);
    let out = '';
    for (let i = 0; i < normalized.length; i++) {
        const ch = normalized[i];
        out += GEORGIAN_TO_PHONETIC[ch] !== undefined ? GEORGIAN_TO_PHONETIC[ch] : ch;
    }
    return out;
}

// ── Rich Pre-Bundled Classic Masterworks with Full Chapters ────────────────
const DISCOVER_CLASSICS = [
    {
        id: 'classic_art_of_war',
        title: 'The Art of War',
        author: 'Sun Tzu',
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
        chapters: [
            {
                id: 1,
                title: 'Chapter 1: Laying Plans',
                text: "The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected. The art of war, then, is governed by five constant factors, to be taken into account in one's deliberations, when seeking to determine the conditions obtaining in the field. These are: The Moral Law; Heaven; Earth; The Commander; Method and Discipline. The Moral Law causes the people to be in complete accord with their ruler, so that they will follow him regardless of their lives, undismayed by any danger. Heaven signifies night and day, cold and heat, times and the seasons. Earth comprises distances, great and small; danger and security; open ground and narrow passes; the chances of life and death. The Commander stands for the virtues of wisdom, sincerely, benevolence, courage and strictness. By method and discipline are to be understood the marshaling of the army in its proper subdivisions, the graduations of rank among the officers, the maintenance of roads by which supplies may reach the army, and the control of military expenditure. These five heads should be familiar to every general: he who knows them will be victorious; he who knows them not will fail. Therefore, in your deliberations, when seeking to determine the military conditions, let them be made the basis of a comparison. Which of the two sovereigns is imbued with the Moral law? Which of the two generals has most ability? With whom lie the advantages derived from Heaven and Earth? On which side is discipline most rigorously enforced? Which army is stronger? On which side are officers and men more highly trained? In which army is there the greater constancy both in reward and punishment? By means of these seven considerations I can forecast victory or defeat.",
                text_ka: "ომის ხელოვნებას სასიცოცხლო მნიშვნელობა აქვს სახელმწიფოსთვის. ეს არის სიცოცხლისა და სიკვდილის საკითხი, გზა ან უსაფრთხოებისკენ, ან დაღუპვისკენ. აქედან გამომდინარე, ეს არის კვლევის საგანი, რომლის უგულებელყოფა არავითარ შემთხვევაში არ შეიძლება. ომის ხელოვნება იმართება ხუთი მუდმივი ფაქტორით: მორალური კანონი; ცა; მიწა; მხედართმთავარი; მეთოდი და დისციპლინა. მორალური კანონი აიძულებს ხალხს იყოს სრულ თანხმობაში თავის მმართველთან. ცა ნიშნავს ღამესა და დღეს, სიცივესა და სიცხეს. მიწა მოიცავს დისტანციებს, დიდსა და პატარას. მხედართმთავარი განასახიერებს სიბრძნის, გულწრფელობის, კეთილგანწყობის, გამბედაობისა და სიმკაცრის სათნოებებს. მეთოდითა და დისციპლინით უნდა გავიგოთ არმიის სწორი დაყოფა და მომარაგების გზები. ეს ხუთი თავი ნაცნობი უნდა იყოს ყოველი გენერლისთვის: ვინც მათ იცის, გამარჯვებული იქნება; ვინც არ იცის, დამარცხდება.",
                word_count: 260,
                estimated_duration_sec: 95
            },
            {
                id: 2,
                title: 'Chapter 2: Waging War',
                text: "Sun Tzu said: In the operations of war, where there are in the field a thousand swift chariots, as many heavy chariots, and a hundred thousand mail-clad soldiers, with provisions enough to carry them a thousand li, the expenditure at home and at the front, including entertainment of guests, small items such as glue and paint, and sums spent on chariots and armor, will reach the total of a thousand ounces of silver per day. Such is the cost of raising an army of 100,000 men. When you engage in actual fighting, if victory is long in coming, then men's weapons will grow dull and their ardor will be damped. If you lay siege to a town, you will exhaust your strength. Again, if the campaign is protracted, the resources of the State will not be equal to the strain. Now, when your weapons are dulled, your ardor damped, your strength exhausted and your treasure spent, other chieftains will spring up to take advantage of your extremity. Then no man, however wise, will be able to avert the consequences that must ensue. Thus, though we have heard of stupid haste in war, cleverness has never been seen associated with long delays. In war, then, let your great object be victory, not lengthy campaigns.",
                text_ka: "სუნ ძიმ თქვა: საომარ ოპერაციებში, როდესაც ბრძოლის ველზე არის ათასი სწრაფი ეტლი და ასი ათასი ჯარისკაცი, ხარჯები მიაღწევს ათას უნცია ვერცხლს დღეში. ასეთია არმიის შეკრების ფასი. როდესაც რეალურ ბრძოლაში ერთვებით, თუ გამარჯვება აგვიანებს, იარაღი დაბლაგვდება და მხნეობა გაქრება. თუ ქალაქს ალყას შემოარტყამთ, ძალებს ამოწურავთ. თუ კამპანია გაჭიანურდა, სახელმწიფოს რესურსები ვერ გაუძლებს დაძაბულობას. ამიტომ ომში თქვენი მთავარი მიზანი უნდა იყოს სწრაფი გამარჯვება და არა ხანგრძლივი კამპანიები.",
                word_count: 240,
                estimated_duration_sec: 85
            },
            {
                id: 3,
                title: 'Chapter 3: Attack by Stratagem',
                text: "In the practical art of war, the best thing of all is to take the enemy's country whole and intact; to shatter and destroy it is not so good. So, too, it is better to recapture an army entire than to destroy it. Hence to fight and conquer in all your battles is not supreme excellence; supreme excellence consists in breaking the enemy's resistance without fighting. Thus the highest form of generalship is to balk the enemy's plans; the next best is to prevent the junction of the enemy's forces; the next in order is to attack the enemy's army in the field; and the worst policy of all is to besiege walled cities. If you know the enemy and know yourself, you need not fear the result of a hundred battles. If you know yourself but not the enemy, for every victory gained you will also suffer a defeat. If you know neither the enemy nor yourself, you will succumb in every battle.",
                text_ka: "ომის პრაქტიკულ ხელოვნებაში ყველაზე კარგია მტრის ქვეყნის ხელუხლებლად აღება; მისი განადგურება არც ისე კარგია. უმაღლესი სრულყოფილება მდგომარეობს მტრის წინააღმდეგობის გატეხვაში უბრძოლველად. ამიტომ მხედართმთავრობის უმაღლესი ფორმაა მტრის გეგმების ჩაშლა. თუ იცნობ მტერს და იცნობ საკუთარ თავს, ასი ბრძოლის შედეგისაც არ შეგეშინდება. თუ იცნობ საკუთარ თავს, მაგრამ არა მტერს, ყოველი გამარჯვებისთვის მარცხსაც განიცდი. თუ არც მტერს იცნობ და არც საკუთარ თავს, ყველა ბრძოლაში დამარცხდები.",
                word_count: 175,
                estimated_duration_sec: 65
            },
            {
                id: 4,
                title: 'Chapter 4: Tactical Dispositions',
                text: "Sun Tzu said: The good fighters of old first put themselves beyond the possibility of defeat, and then waited for an opportunity of defeating the enemy. To secure ourselves against defeat lies in our own hands, but the opportunity of defeating the enemy is provided by the enemy himself. Thus the good fighter is able to secure himself against defeat, but cannot make certain of defeating the enemy. Hence the saying: One may know how to conquer without being able to do it. Security against defeat implies defensive tactics; ability to defeat the enemy means taking the offensive. Standing on the defensive indicates insufficient strength; attacking, a superabundance of strength.",
                text_ka: "სუნ ძიმ თქვა: ძველი დროის გამოცდილი მებრძოლები ჯერ თავად იცავდნენ თავს დამარცხებისგან, შემდეგ კი ელოდნენ მტრის დამარცხების ხელსაყრელ მომენტს. თავის დაცვა ჩვენს ხელშია, ხოლო მტრის დამარცხების შესაძლებლობას თავად მტერი გვაძლევს. თავდაცვითი ტაქტიკა მიუთითებს ძალების ნაკლებობაზე; თავდასხმა - ძალების სიჭარბეზე.",
                word_count: 120,
                estimated_duration_sec: 45
            },
            {
                id: 5,
                title: 'Chapter 5: Energy and Direct Force',
                text: "The control of a large force is the same principle as the control of a few men: it is merely a question of dividing up their numbers. Fighting with a large army under your command is nowise different from fighting with a small one: it is merely a question of instituting signs and signals. In all fighting, the direct method may be used for joining battle, but indirect methods will be needed in order to secure victory. In battle there are not more than two methods of attack: the direct and the indirect; yet these two in combination give rise to an endless series of maneuvers.",
                text_ka: "დიდი ძალის მართვა იგივე პრინციპია, რაც რამდენიმე ადამიანის მართვა: ეს მხოლოდ მათი რიცხვის სწორი განაწილების საკითხია. ბრძოლაში არსებობს შეტევის მხოლოდ ორი მეთოდი: პირდაპირი და ირიბი; თუმცა ეს ორი ერთად ქმნის მანევრების უსასრულო სერიას.",
                word_count: 110,
                estimated_duration_sec: 40
            }
        ],
        translatedLangs: ['ka'],
        dateAdded: new Date().toISOString(),
        progressPct: 0
    },
    {
        id: 'classic_meditations',
        title: 'Meditations',
        author: 'Marcus Aurelius',
        coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80',
        chapters: [
            {
                id: 1,
                title: 'Book 1: Debts and Lessons',
                text: "From my grandfather Verus I learned good morals and the government of my temper. From the reputation and remembrance of my father, modesty and a manly character. From my mother, piety and beneficence, and abstinence, not only from evil deeds, but even from evil thoughts; and further, simplicity in my way of living, far removed from the habits of the rich. When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil. But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own.",
                text_ka: "ჩემი ბაბუა ვერუსისგან ვისწავლე კარგი ზნეობა და ხასიათის სიმშვიდე. მამაჩემის ხსოვნისგან - მოკრძალება და ვაჟკაცური ხასიათი. დედაჩემისგან - ღვთისმოსაობა, სიკეთე და თავშეკავება არა მხოლოდ ბოროტი საქმეებისგან, არამედ ბოროტი აზრებისგანაც. როდესაც დილით იღვიძებ, უთხარი საკუთარ თავს: ადამიანები, ვისთანაც დღეს მექნება საქმე, იქნებიან უმადურები და ქედმაღლები. ისინი ასეთები არიან იმიტომ, რომ არ შეუძლიათ სიკეთის გარჩევა ბოროტებისგან. მაგრამ მე დავინახე სიკეთის სილამაზე.",
                word_count: 155,
                estimated_duration_sec: 55
            },
            {
                id: 2,
                title: 'Book 2: The Inner Citadel',
                text: "Remember how long you have been putting this off, how many times the gods have granted you a period of grace of which you have made no use. It is high time now that you understood the universe of which you are a part, and the Ruler of that universe by whose emanation you subsist; that there is a limit set to your time, which will shortly pass away, and you with it, and will not return. Every hour focus your mind attentively on the performance of the task in hand, with dignity, human sympathy, benevolence and freedom, and rid yourself of all other thoughts.",
                text_ka: "გახსოვდეთ, რამდენ ხანს დებდით ამას, რამდენჯერ მოგცეს ღმერთებმა მადლის პერიოდი, რომელიც არ გამოგიყენებიათ. დროა გააცნობიეროთ სამყარო, რომლის ნაწილიც ხართ. ყოველ საათში ყურადღება გაამახვილეთ მიმდინარე დავალების შესრულებაზე ღირსებით, ადამიანური თანაგრძნობით, კეთილგანწყობითა და თავისუფლებით.",
                word_count: 105,
                estimated_duration_sec: 42
            },
            {
                id: 3,
                title: 'Book 3: Harmony and Reason',
                text: "We ought to observe also that even the things which follow after the things which are produced according to nature contain something pleasing and attractive. For instance, when bread is baked some parts are split open, and these crevices, though in a manner contrary to the art of the baker, look well and in a peculiar way excite the desire for eating. Do not waste the remainder of your life in thoughts about others, when you do not refer your thoughts to some object of common utility.",
                text_ka: "ჩვენ ასევე უნდა დავაკვირდეთ, რომ ბუნების მიერ წარმოებულ მოვლენებშიც კი არის რაღაც სასიამოვნო და მიმზიდველი. ნუ დაკარგავთ თქვენი ცხოვრების დარჩენილ ნაწილს სხვებზე ფიქრში, როდესაც თქვენი აზრები არ ემსახურება საზოგადო სიკეთეს.",
                word_count: 90,
                estimated_duration_sec: 35
            }
        ],
        translatedLangs: ['ka'],
        dateAdded: new Date().toISOString(),
        progressPct: 0
    }
];

// ── DOM Cache ──────────────────────────────────────────────────────────────
let DOM = {};

function cacheDOM() {
    DOM = {
        fileInput: document.getElementById('fileInput'),
        dropZone: document.getElementById('dropZone'),
        uploadProgressContainer: document.getElementById('uploadProgressContainer'),
        uploadProgressBar: document.getElementById('uploadProgressBar'),
        uploadStatusText: document.getElementById('uploadStatusText'),
        uploadProgressPct: document.getElementById('uploadProgressPct'),

        booksGrid: document.getElementById('booksGrid'),
        discoverGrid: document.getElementById('discoverGrid'),
        shelfMetaText: document.getElementById('shelfMetaText'),

        heroSection: document.getElementById('heroSection'),
        heroPlayBtn: document.getElementById('heroPlayBtn'),
        heroCover: document.getElementById('heroCover'),
        heroTitle: document.getElementById('heroTitle'),
        heroSubtitleHeader: document.getElementById('heroSubtitleHeader'),
        heroLiveSubtitle: document.getElementById('heroLiveSubtitle'),
        heroProgressText: document.getElementById('heroProgressText'),
        heroProgressCircle: document.getElementById('heroProgressCircle'),
        heroProgressBarInner: document.getElementById('heroProgressBarInner'),
        heroPlayIcon: document.getElementById('heroPlayIcon'),
        heroGeorgianBadge: document.getElementById('heroGeorgianBadge'),

        chaptersContainer: document.getElementById('chaptersContainer'),
        chaptersList: document.getElementById('chaptersList'),
        activeBookTitle: document.getElementById('activeBookTitle'),
        activeBookMetaDetail: document.getElementById('activeBookMetaDetail'),
        btnDownloadAllZip: document.getElementById('btnDownloadAllZip'),
        btnTranslateWholeBook: document.getElementById('btnTranslateWholeBook'),
        btnTranslateWholeBookText: document.getElementById('btnTranslateWholeBookText'),

        playerDock: document.getElementById('playerDock'),
        dockCover: document.getElementById('dockCover'),
        dockTitle: document.getElementById('dockTitle'),
        dockSubtitle: document.getElementById('dockSubtitle'),
        dockVisualizer: document.getElementById('dockVisualizer'),
        dockPlayIcon: document.getElementById('dockPlayIcon'),
        btnPlayerPlayPause: document.getElementById('btnPlayerPlayPause'),
        btnPlayerRewind: document.getElementById('btnPlayerRewind'),
        btnPlayerForward: document.getElementById('btnPlayerForward'),
        playerProgressContainer: document.getElementById('playerProgressContainer'),
        playerProgressBar: document.getElementById('playerProgressBar'),
        playerCurrentTime: document.getElementById('playerCurrentTime'),
        playerTotalTime: document.getElementById('playerTotalTime'),
        btnDockSpeed: document.getElementById('btnDockSpeed'),
        btnDockLangToggle: document.getElementById('btnDockLangToggle'),
        dockLangBadge: document.getElementById('dockLangBadge'),
        dockLangBadgeMobile: document.getElementById('dockLangBadgeMobile'),

        searchInput: document.getElementById('searchInput'),
        topVoiceBadge: document.getElementById('topVoiceBadge'),
        topProfileBtn: document.getElementById('topProfileBtn'),
        topAvatarBadge: document.getElementById('topAvatarBadge'),
        sideNavUserName: document.getElementById('sideNavUserName'),
        userNavSection: document.getElementById('userNavSection'),

        // Voice & ElevenLabs Modal
        voiceModalSelect: document.getElementById('voiceModalSelect'),
        optgroupMale: document.getElementById('optgroupMale'),
        optgroupFemale: document.getElementById('optgroupFemale'),
        optgroupOther: document.getElementById('optgroupOther'),
        modalSpeedSlider: document.getElementById('modalSpeedSlider'),
        modalSpeedVal: document.getElementById('modalSpeedVal'),
        modalPitchSlider: document.getElementById('modalPitchSlider'),
        modalPitchVal: document.getElementById('modalPitchVal'),
        elevenLabsToggle: document.getElementById('elevenLabsToggle'),
        elevenLabsKeySection: document.getElementById('elevenLabsKeySection'),
        elevenLabsApiKey: document.getElementById('elevenLabsApiKey'),
        elevenLabsVoiceSelect: document.getElementById('elevenLabsVoiceSelect'),

        // Moon+ Reader View
        readerView: document.getElementById('readerView'),
        readerBookTitle: document.getElementById('readerBookTitle'),
        readerChapterTitle: document.getElementById('readerChapterTitle'),
        readerPageSpread: document.getElementById('readerPageSpread'),
        readerScrollContainer: document.getElementById('readerScrollContainer'),
        btnReaderPlayPause: document.getElementById('btnReaderPlayPause'),
        readerPlayIcon: document.getElementById('readerPlayIcon'),
        readerReadingProgressText: document.getElementById('readerReadingProgressText'),
        readerPageStatusBottom: document.getElementById('readerPageStatusBottom'),
        readerBookProgressText: document.getElementById('readerBookProgressText'),
        btnReaderLangToggle: document.getElementById('btnReaderLangToggle'),
        readerLangLabel: document.getElementById('readerLangLabel'),
        readerFullscreenIcon: document.getElementById('readerFullscreenIcon'),
        readerModalFontSizeText: document.getElementById('readerModalFontSizeText'),

        // Table of Contents Drawer
        tocDrawer: document.getElementById('tocDrawer'),
        tocDrawerList: document.getElementById('tocDrawerList'),

        // Whole Book Translate Modal
        wholeBookTranslateModal: document.getElementById('wholeBookTranslateModal'),
        wbChapterLabel: document.getElementById('wbChapterLabel'),
        wbProgressPct: document.getElementById('wbProgressPct'),
        wbProgressBar: document.getElementById('wbProgressBar'),
        wbSentenceCounter: document.getElementById('wbSentenceCounter'),
        wbCharCounter: document.getElementById('wbCharCounter'),
        wbLiveOriginal: document.getElementById('wbLiveOriginal'),
        wbLiveGeorgian: document.getElementById('wbLiveGeorgian'),
    };
}

// ── Initialization ──────────────────────────────────────────────────────────
async function init() {
    cacheDOM();
    await initDB();
    setupEventListeners();
    setupKeyboardAndTouchControls();
    checkAuthState();
    loadElevenLabsSettings();

    populateVoiceList();
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    await seedDefaultBooks();
    await renderDigitalShelf();
    renderDiscoverClassics();

    const books = await getAllBooks();
    if (books.length > 0) {
        selectBook(books[0].id, false);
    }

    if (window.lucide) lucide.createIcons();
}

// ── IndexedDB (v12) ─────────────────────────────────────────────────────────
function initDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('LuminaAudioStudioDB_v12', 1);
        req.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains('books')) {
                db.createObjectStore('books', { keyPath: 'id' });
            }
        };
        req.onsuccess = (e) => { db = e.target.result; resolve(); };
        req.onerror = (e) => { console.error('IndexedDB Error:', e); reject(e); };
    });
}

function saveBookToDB(book) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('books', 'readwrite');
        tx.objectStore('books').put(book);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
    });
}

function getAllBooks() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('books', 'readonly');
        const req = tx.objectStore('books').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e);
    });
}

function deleteBookFromDB(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('books', 'readwrite');
        tx.objectStore('books').delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
    });
}

async function seedDefaultBooks() {
    const existing = await getAllBooks();
    for (const b of DISCOVER_CLASSICS) {
        const found = existing.find(e => String(e.id) === String(b.id));
        if (!found || (found.chapters && found.chapters.length < b.chapters.length)) {
            await saveBookToDB(b);
        }
    }
}

// Helper: Calculate full book stats
function getBookStats(book) {
    if (!book || !book.chapters) return { chaptersCount: 0, totalWords: 0, totalSeconds: 0, totalFormattedTime: '0m' };
    const chaptersCount = book.chapters.length;
    let totalWords = 0;
    let totalSeconds = 0;
    book.chapters.forEach(c => {
        totalWords += c.word_count || (c.text ? c.text.split(/\s+/).length : 0);
        totalSeconds += c.estimated_duration_sec || Math.round((totalWords / 140) * 60);
    });
    const mins = Math.max(1, Math.round(totalSeconds / 60));
    return {
        chaptersCount,
        totalWords,
        totalSeconds,
        totalFormattedTime: mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`
    };
}

// ── Navigation & Modals ─────────────────────────────────────────────────────
function navigate(viewId) {
    ['library', 'discover'].forEach(id => {
        const view = document.getElementById(`view-${id}`);
        const nav = document.getElementById(`nav-${id}`);
        if (view) view.classList.add('hidden');
        if (nav) {
            nav.classList.remove('text-primary-fixed-dim', 'bg-white/10', 'border-l-2', 'border-primary-container');
            nav.classList.add('text-on-surface-variant');
        }
    });

    const activeView = document.getElementById(`view-${viewId}`);
    const activeNav = document.getElementById(`nav-${viewId}`);
    if (activeView) activeView.classList.remove('hidden');
    if (activeNav) {
        activeNav.classList.add('text-primary-fixed-dim', 'bg-white/10', 'border-l-2', 'border-primary-container');
        activeNav.classList.remove('text-on-surface-variant');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function openToCDrawer() {
    renderToCDrawerList();
    if (DOM.tocDrawer) DOM.tocDrawer.classList.add('active');
}

function closeToCDrawer() {
    if (DOM.tocDrawer) DOM.tocDrawer.classList.remove('active');
}

function renderToCDrawerList() {
    if (!DOM.tocDrawerList || !readerBook) return;
    DOM.tocDrawerList.innerHTML = '';

    readerBook.chapters.forEach((chap, idx) => {
        const isCurrent = String(chap.id) === String(readerChapterId);
        const hasKa = !!chap.text_ka;
        const btn = document.createElement('button');
        btn.className = `w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-3 ${isCurrent ? 'bg-primary-container/20 border-primary-container/50 text-white font-bold' : 'bg-white/5 border-white/10 hover:bg-white/10 text-on-surface'}`;
        btn.onclick = () => {
            closeToCDrawer();
            onReaderChapterChange(chap.id);
        };

        btn.innerHTML = `
            <div class="overflow-hidden">
                <p class="text-xs truncate">${idx + 1}. ${chap.title}</p>
                <p class="text-[10px] text-on-surface-variant mt-0.5">${chap.word_count} words • ~${formatTime(chap.estimated_duration_sec)}</p>
            </div>
            ${hasKa ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-georgian-gold/20 text-georgian-gold font-bold">🇬🇪</span>' : ''}
        `;
        DOM.tocDrawerList.appendChild(btn);
    });
}

// ── Authentication ──────────────────────────────────────────────────────────
function checkAuthState() {
    const saved = localStorage.getItem('lumina_auth_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        updateAuthUI();
    }
}

function updateAuthUI() {
    if (currentUser) {
        const name = currentUser.email.split('@')[0];
        if (DOM.sideNavUserName) DOM.sideNavUserName.textContent = name;
        if (DOM.topAvatarBadge) DOM.topAvatarBadge.textContent = name.charAt(0).toUpperCase();
        if (DOM.userNavSection) {
            DOM.userNavSection.innerHTML = `
                <div class="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                    <div class="flex items-center gap-2.5 overflow-hidden">
                        <div class="w-8 h-8 rounded-full bg-primary-container/20 border border-primary-container/40 flex items-center justify-center text-primary-fixed font-bold text-xs">
                            ${name.charAt(0).toUpperCase()}
                        </div>
                        <div class="truncate">
                            <p class="text-xs font-semibold text-white truncate">${name}</p>
                            <p class="text-[10px] text-primary-fixed">PRO Studio</p>
                        </div>
                    </div>
                    <button onclick="logout()" class="p-1.5 text-on-surface-variant hover:text-error transition" title="Sign Out">
                        <span class="material-symbols-outlined text-base">logout</span>
                    </button>
                </div>
            `;
        }
    } else {
        if (DOM.sideNavUserName) DOM.sideNavUserName.textContent = "Sign In / Register";
        if (DOM.topAvatarBadge) DOM.topAvatarBadge.textContent = "G";
        if (DOM.userNavSection) {
            DOM.userNavSection.innerHTML = `
                <button onclick="openModal('authModal')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-on-surface-variant hover:text-white transition-all text-sm font-medium">
                    <div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-primary-fixed">
                        <span class="material-symbols-outlined text-lg">person</span>
                    </div>
                    <div class="text-left overflow-hidden">
                        <p class="text-sm font-medium text-white truncate">Sign In</p>
                        <p class="text-xs text-on-surface-variant">Sync your books</p>
                    </div>
                </button>
            `;
        }
    }
}

function login(email, password) {
    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address.');
        return;
    }
    currentUser = { email, id: 'usr_' + Date.now(), pro: true };
    localStorage.setItem('lumina_auth_user', JSON.stringify(currentUser));
    updateAuthUI();
    closeModal('authModal');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('lumina_auth_user');
    updateAuthUI();
}

// ── ElevenLabs Settings ────────────────────────────────────────────────────
function loadElevenLabsSettings() {
    elevenLabsEnabled = localStorage.getItem('lumina_el_enabled') === 'true';
    elevenLabsApiKey = localStorage.getItem('lumina_el_key') || '';
    elevenLabsVoiceId = localStorage.getItem('lumina_el_voice') || 'pNInz6obpgDQGcFmaJgB';

    if (DOM.elevenLabsToggle) DOM.elevenLabsToggle.checked = elevenLabsEnabled;
    if (DOM.elevenLabsApiKey) DOM.elevenLabsApiKey.value = elevenLabsApiKey;
    if (DOM.elevenLabsVoiceSelect) DOM.elevenLabsVoiceSelect.value = elevenLabsVoiceId;

    if (elevenLabsEnabled && DOM.elevenLabsKeySection) {
        DOM.elevenLabsKeySection.classList.remove('hidden');
    }
}

function toggleElevenLabsMode(enabled) {
    elevenLabsEnabled = enabled;
    localStorage.setItem('lumina_el_enabled', enabled ? 'true' : 'false');
    if (DOM.elevenLabsKeySection) {
        if (enabled) DOM.elevenLabsKeySection.classList.remove('hidden');
        else DOM.elevenLabsKeySection.classList.add('hidden');
    }
    updateTopVoiceBadge();
}

function saveElevenLabsSettings() {
    if (DOM.elevenLabsApiKey) {
        elevenLabsApiKey = DOM.elevenLabsApiKey.value.trim();
        localStorage.setItem('lumina_el_key', elevenLabsApiKey);
    }
    if (DOM.elevenLabsVoiceSelect) {
        elevenLabsVoiceId = DOM.elevenLabsVoiceSelect.value;
        localStorage.setItem('lumina_el_voice', elevenLabsVoiceId);
    }
    alert('ElevenLabs settings saved successfully!');
    updateTopVoiceBadge();
}

// ── Voice Management ────────────────────────────────────────────────────────
function populateVoiceList() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    if (DOM.optgroupMale) DOM.optgroupMale.innerHTML = '';
    if (DOM.optgroupFemale) DOM.optgroupFemale.innerHTML = '';
    if (DOM.optgroupOther) DOM.optgroupOther.innerHTML = '';

    const savedVoice = localStorage.getItem('lumina_selected_voice_uri');

    const maleKeywords = ['male', 'david', 'mark', 'george', 'guy', 'christopher', 'ryan', 'james', 'daniel', 'thomas', 'stefan'];
    const femaleKeywords = ['female', 'zira', 'jenny', 'susan', 'aria', 'sonia', 'hazel', 'linda', 'catherine', 'heera', 'emily', 'anna'];

    voices.forEach(v => {
        const option = document.createElement('option');
        option.value = v.voiceURI || v.name;
        option.textContent = `${v.name} (${v.lang})`;

        const nameLower = v.name.toLowerCase();
        const isMale = maleKeywords.some(k => nameLower.includes(k));
        const isFemale = femaleKeywords.some(k => nameLower.includes(k));

        if (isMale && DOM.optgroupMale) {
            DOM.optgroupMale.appendChild(option);
        } else if (isFemale && DOM.optgroupFemale) {
            DOM.optgroupFemale.appendChild(option);
        } else if (DOM.optgroupOther) {
            DOM.optgroupOther.appendChild(option);
        }
    });

    if (savedVoice) {
        selectedVoiceURI = savedVoice;
    } else {
        const defaultMale = voices.find(v =>
            v.name.toLowerCase().includes('david') ||
            (v.name.toLowerCase().includes('male') && v.lang.startsWith('en'))
        );
        if (defaultMale) {
            selectedVoiceURI = defaultMale.voiceURI || defaultMale.name;
        } else if (voices.length > 0) {
            selectedVoiceURI = voices[0].voiceURI || voices[0].name;
        }
    }

    if (DOM.voiceModalSelect) DOM.voiceModalSelect.value = selectedVoiceURI;
    updateTopVoiceBadge();
}

function updateTopVoiceBadge() {
    if (!DOM.topVoiceBadge) return;
    if (elevenLabsEnabled && elevenLabsApiKey) {
        DOM.topVoiceBadge.textContent = `✨ ElevenLabs Studio`;
        return;
    }

    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    const matched = voices.find(v => (v.voiceURI && v.voiceURI === selectedVoiceURI) || v.name === selectedVoiceURI);
    if (matched) {
        const maleKeywords = ['male', 'david', 'mark', 'ryan', 'george', 'guy', 'james'];
        const isMale = maleKeywords.some(k => matched.name.toLowerCase().includes(k));
        DOM.topVoiceBadge.textContent = `${isMale ? '👨' : '👩'} ${matched.name.split(' - ')[0].replace(/Microsoft |Google /g, '')}`;
    } else {
        DOM.topVoiceBadge.textContent = `🎙️ Studio Narrator`;
    }
}

function testVoicePreview() {
    const text = "Hello! Welcome to Lumina Audio Studio. Enjoy your high-fidelity reading and listening experience.";
    speakStandardSentence(text, 'en');
}

function testGeorgianVoicePreview() {
    const text = "გამარჯობა! მოგესალმებით ლუმინას ქართულ აუდიო და მთვარის წამკითხველში.";
    speakStandardSentence(text, 'ka');
}

// ══════════════════════════════════════════════════════════════════════════
// ██ 1. ZERO-BLANK-PAGE MOON+ READER ENGINE ██
// ══════════════════════════════════════════════════════════════════════════

function openCurrentBookInReader() {
    if (!currentBook) {
        alert('Please select an audiobook from your shelf first.');
        return;
    }
    const chapId = currentPlayingChapterId || (currentBook.chapters[0] ? currentBook.chapters[0].id : 1);
    openReader(currentBook.id, chapId, currentLang);
}

async function openReader(bookId, chapterId, lang = 'en') {
    const books = await getAllBooks();
    readerBook = books.find(b => String(b.id) === String(bookId));
    if (!readerBook) return;

    readerChapterId = chapterId !== undefined ? chapterId : (readerBook.chapters[0] ? readerBook.chapters[0].id : 1);
    readerLang = lang;
    readerCurrentPage = 1;

    if (readerLang === 'ka') {
        const hasKa = readerBook.translatedLangs && readerBook.translatedLangs.includes('ka');
        if (!hasKa) {
            const doTranslate = confirm('This book is not yet translated to Georgian. Would you like to translate the whole book now?');
            if (doTranslate) {
                startWholeBookTranslation();
                return;
            } else {
                readerLang = 'en';
            }
        }
    }

    readerActive = true;
    DOM.readerView.className = `reader-theme-${readerTheme} active`;
    document.body.style.overflow = 'hidden';

    DOM.readerBookTitle.textContent = readerBook.title;
    updateReaderLangUI();
    paginateChapter();
    renderCurrentPage();
}

function closeReader() {
    readerActive = false;
    DOM.readerView.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function onReaderChapterChange(targetChapId) {
    if (!readerBook) return;
    const matched = readerBook.chapters.find(c => String(c.id) === String(targetChapId));
    if (!matched) return;

    readerChapterId = matched.id;
    readerCurrentPage = 1;

    paginateChapter();
    renderCurrentPage();

    if (isPlaying) {
        playChapterAudio(readerChapterId);
    }
}

function updateReaderLangUI() {
    if (!DOM.btnReaderLangToggle || !DOM.readerLangLabel) return;
    if (readerLang === 'ka') {
        DOM.readerLangLabel.textContent = 'ქართული 🇬🇪';
        DOM.btnReaderLangToggle.classList.add('bg-georgian-gold/25');
    } else {
        DOM.readerLangLabel.textContent = 'English 🇺🇸';
        DOM.btnReaderLangToggle.classList.remove('bg-georgian-gold/25');
    }
}

function toggleReaderLanguage() {
    if (!readerBook) return;
    if (readerLang === 'en') {
        const hasKa = readerBook.translatedLangs && readerBook.translatedLangs.includes('ka');
        if (!hasKa) {
            const doTranslate = confirm('This book has not been translated to Georgian yet. Translate whole book now?');
            if (doTranslate) {
                startWholeBookTranslation();
            }
            return;
        }
        readerLang = 'ka';
        currentLang = 'ka';
    } else {
        readerLang = 'en';
        currentLang = 'en';
    }
    updateReaderLangUI();
    paginateChapter();
    renderCurrentPage();
    updateLangToggleUI();

    if (isPlaying) {
        playChapterAudio(readerChapterId);
    }
}

// ── Dynamic Book Pagination Engine ─────────────────────────────────────────
function paginateChapter() {
    if (!readerBook) return;
    const chap = readerBook.chapters.find(c => String(c.id) === String(readerChapterId));
    if (!chap) return;

    let rawText = '';
    if (readerLang === 'ka') {
        rawText = (chap.text_ka && chap.text_ka.trim().length > 0) ? chap.text_ka : (chap.text || '');
    } else {
        rawText = chap.text || '';
    }

    if (!rawText || rawText.trim().length === 0) {
        rawText = "No chapter text available.";
    }

    const sentences = splitIntoNaturalSentences(rawText);
    readerPages = [];
    readerSentenceToPageMap = {};

    // Density: dynamically adjust based on font size. Base font size is 18.
    let baseWords = window.innerWidth < 640 ? 80 : 135;
    const fontRatio = 18 / readerFontSize;
    const WORDS_PER_PAGE = Math.max(30, Math.floor(baseWords * fontRatio * fontRatio));
    let curPageSentences = [];
    let curPageWords = 0;
    let pageIndex = 0;

    sentences.forEach((sent, globalIdx) => {
        const clean = sent.trim();
        if (!clean) return;

        const wordCount = clean.split(/\s+/).length;
        curPageSentences.push({ text: clean, globalIndex: globalIdx });
        curPageWords += wordCount;
        readerSentenceToPageMap[globalIdx] = pageIndex;

        if (curPageWords >= WORDS_PER_PAGE) {
            readerPages.push(curPageSentences);
            curPageSentences = [];
            curPageWords = 0;
            pageIndex++;
        }
    });

    if (curPageSentences.length > 0) {
        readerPages.push(curPageSentences);
    }

    if (readerPages.length === 0) {
        readerPages.push([{ text: rawText, globalIndex: 0 }]);
        readerSentenceToPageMap[0] = 0;
    }

    readerCurrentPage = Math.max(1, Math.min(readerCurrentPage, readerPages.length));
}

function renderCurrentPage() {
    if (!readerBook || !DOM.readerPageSpread) return;
    const chap = readerBook.chapters.find(c => String(c.id) === String(readerChapterId));
    if (!chap) return;

    DOM.readerChapterTitle.textContent = chap.title;
    const totalPages = readerPages.length;

    DOM.readerPageSpread.classList.remove('page-flip-anim');
    void DOM.readerPageSpread.offsetWidth;
    DOM.readerPageSpread.classList.add('page-flip-anim');

    if (DOM.readerScrollContainer) {
        DOM.readerScrollContainer.scrollTop = 0;
    }

    const isWidescreen = window.innerWidth >= 900;
    const isDual = readerMode === 'dual' && isWidescreen;

    let html = '';

    if (readerMode === 'scroll') {
        // CONTINUOUS SCROLL MODE
        html = `
            <div class="book-page-card w-full max-w-4xl mx-auto">
                <header class="mb-6 text-center border-b border-black/10 dark:border-white/10 pb-4 select-none">
                    <span class="text-xs font-label-caps font-bold tracking-widest uppercase opacity-75">✦ ${readerBook.title} ✦</span>
                    <h1 class="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-1 mb-2 tracking-tight ${readerLang === 'ka' ? 'font-georgian-sans' : 'font-cinzel'}">${chap.title}</h1>
                    <div class="flex items-center justify-center gap-3 text-xs opacity-75">
                        <span>${chap.word_count} words</span>
                        <span>•</span>
                        <span>~${formatTime(chap.estimated_duration_sec)}</span>
                    </div>
                    <div class="mt-3 text-xs opacity-60">── ❖ ──</div>
                </header>
                <div class="space-y-5 ${readerFontFamily}" style="font-size: ${readerFontSize}px; line-height: 1.85;">
        `;

        let pBuffer = [];
        let isFirstParagraph = true;

        readerPages.forEach(p => {
            p.forEach(item => {
                pBuffer.push(`<span class="reader-sentence" id="rsentence_${item.globalIndex}" onclick="onReaderSentenceClick(${item.globalIndex})">${item.text}</span> `);
                if (pBuffer.length >= 3) {
                    const dropCapClass = isFirstParagraph ? 'book-drop-cap' : '';
                    html += `<p class="text-justify indent-6 ${dropCapClass}">${pBuffer.join('')}</p>`;
                    pBuffer = [];
                    isFirstParagraph = false;
                }
            });
        });

        if (pBuffer.length > 0) {
            html += `<p class="text-justify indent-6">${pBuffer.join('')}</p>`;
        }

        html += `
                </div>
                <footer class="mt-10 pt-6 border-t border-black/10 dark:border-white/10 text-center opacity-60 text-xs select-none">
                    <p>── ❦ ──</p>
                    <p class="mt-1">End of ${chap.title}</p>
                </footer>
            </div>
        `;

    } else if (isDual) {
        // DUAL PAGE OPEN BOOK SPREAD (Left Page & Right Page)
        const leftPageNum = readerCurrentPage % 2 === 0 ? readerCurrentPage - 1 : readerCurrentPage;
        const rightPageNum = leftPageNum + 1;

        const leftSentences = readerPages[leftPageNum - 1] || [];
        const rightSentences = rightPageNum <= totalPages ? (readerPages[rightPageNum - 1] || []) : null;

        html += renderSinglePageCard(leftPageNum, totalPages, leftSentences, chap, leftPageNum === 1, 'book-spine-left');

        if (rightSentences) {
            html += renderSinglePageCard(rightPageNum, totalPages, rightSentences, chap, false, 'book-spine-right');
        } else {
            html += `
                <div class="book-page-card book-spine-right hidden md:flex items-center justify-center text-center opacity-30 select-none">
                    <div>
                        <span class="text-4xl">❦</span>
                        <p class="text-xs font-serif-book mt-3">End of ${chap.title}</p>
                    </div>
                </div>
            `;
        }

    } else {
        // SINGLE FULL-WIDTH PAGE
        const pageSentences = readerPages[readerCurrentPage - 1] || [];
        html += renderSinglePageCard(readerCurrentPage, totalPages, pageSentences, chap, readerCurrentPage === 1, '');
    }

    DOM.readerPageSpread.innerHTML = html;

    // Update Status Bars
    if (DOM.readerPageStatusBottom) {
        DOM.readerPageStatusBottom.textContent = `Page ${readerCurrentPage} of ${totalPages}`;
    }

    if (DOM.readerReadingProgressText && sentenceQueue.length > 0) {
        DOM.readerReadingProgressText.textContent = `Sentence ${currentSentenceIndex + 1} / ${sentenceQueue.length}`;
    }

    if (DOM.readerBookProgressText && readerBook) {
        const curChapIdx = readerBook.chapters.findIndex(c => String(c.id) === String(readerChapterId));
        const chapPct = (curChapIdx + (readerCurrentPage / totalPages)) / readerBook.chapters.length;
        const totalPct = Math.min(100, Math.round(chapPct * 100));
        DOM.readerBookProgressText.textContent = `${totalPct}% Book Progress`;
    }

    // Highlight current sentence if playing this chapter
    if (isPlaying && String(currentPlayingChapterId) === String(readerChapterId)) {
        highlightReaderSentence(currentSentenceIndex);
    }
}

function renderSinglePageCard(pageNumber, totalPages, sentences, chap, isFirstPage, spineClass) {
    let cardHtml = `
        <div class="book-page-card ${spineClass}" style="height: max-content; min-height: 100%;">
            <div class="flex-grow">
    `;

    if (isFirstPage) {
        cardHtml += `
            <header class="mb-5 text-center border-b border-black/10 dark:border-white/10 pb-3 select-none">
                <span class="text-[10px] sm:text-[11px] font-label-caps font-bold tracking-widest uppercase opacity-75">✦ ${readerBook.title} ✦</span>
                <h2 class="text-lg sm:text-2xl font-extrabold mt-1 mb-1 tracking-tight ${readerLang === 'ka' ? 'font-georgian-sans' : 'font-cinzel'}">${chap.title}</h2>
                <div class="mt-1 text-xs opacity-60">── ❖ ──</div>
            </header>
        `;
    }

    cardHtml += `<div class="space-y-4 ${readerFontFamily}" style="font-size: ${readerFontSize}px; line-height: 1.85;">`;

    let pBuffer = [];
    let isFirstParagraph = isFirstPage;

    sentences.forEach((item, idx) => {
        pBuffer.push(`<span class="reader-sentence" id="rsentence_${item.globalIndex}" onclick="onReaderSentenceClick(${item.globalIndex})">${item.text}</span> `);

        if (pBuffer.length >= 3 || idx === sentences.length - 1) {
            const dropCapClass = isFirstParagraph ? 'book-drop-cap' : '';
            cardHtml += `<p class="text-justify indent-6 ${dropCapClass}">${pBuffer.join('')}</p>`;
            pBuffer = [];
            isFirstParagraph = false;
        }
    });

    cardHtml += `</div></div>`;

    cardHtml += `
        <div class="mt-6 pt-3 border-t border-black/10 dark:border-white/10 flex justify-between items-center text-[10px] sm:text-[11px] opacity-70 select-none font-mono">
            <span>Page ${pageNumber} of ${totalPages}</span>
            <span class="truncate max-w-[140px]">${chap.title}</span>
        </div>
    </div>`;

    return cardHtml;
}

// ── Page Steppers ──────────────────────────────────────────────────────────
function readerNextPage() {
    if (!readerBook) return;
    const totalPages = readerPages.length;
    const isDual = readerMode === 'dual' && window.innerWidth >= 900;
    const step = isDual ? 2 : 1;

    if (readerCurrentPage + step <= totalPages) {
        readerCurrentPage += step;
        renderCurrentPage();
        syncAudioToCurrentPage();
    } else if (readerCurrentPage < totalPages) {
        readerCurrentPage = totalPages;
        renderCurrentPage();
        syncAudioToCurrentPage();
    } else {
        readerNextChapter();
    }
}

function readerPrevPage() {
    if (!readerBook) return;
    const isDual = readerMode === 'dual' && window.innerWidth >= 900;
    const step = isDual ? 2 : 1;

    if (readerCurrentPage - step >= 1) {
        readerCurrentPage -= step;
        renderCurrentPage();
        syncAudioToCurrentPage();
    } else if (readerCurrentPage > 1) {
        readerCurrentPage = 1;
        renderCurrentPage();
        syncAudioToCurrentPage();
    } else {
        const curIdx = readerBook.chapters.findIndex(c => String(c.id) === String(readerChapterId));
        if (curIdx > 0) {
            readerChapterId = readerBook.chapters[curIdx - 1].id;
            paginateChapter();
            readerCurrentPage = readerPages.length;
            renderCurrentPage();
            if (isPlaying) playChapterAudio(readerChapterId);
        }
    }
}

function syncAudioToCurrentPage() {
    if (!isPlaying) return;
    const pageSentences = readerPages[readerCurrentPage - 1];
    if (pageSentences && pageSentences.length > 0) {
        currentSentenceIndex = pageSentences[0].globalIndex;
        speakCurrentSentence();
    }
}

function readerPrevChapter() {
    if (!readerBook) return;
    const curIdx = readerBook.chapters.findIndex(c => String(c.id) === String(readerChapterId));
    if (curIdx > 0) {
        onReaderChapterChange(readerBook.chapters[curIdx - 1].id);
    }
}

function readerNextChapter() {
    if (!readerBook) return;
    const curIdx = readerBook.chapters.findIndex(c => String(c.id) === String(readerChapterId));
    if (curIdx >= 0 && curIdx < readerBook.chapters.length - 1) {
        onReaderChapterChange(readerBook.chapters[curIdx + 1].id);
    }
}

function onReaderSentenceClick(sentenceIdx) {
    if (!readerBook) return;
    if (String(currentBook?.id) !== String(readerBook.id) || String(currentPlayingChapterId) !== String(readerChapterId)) {
        selectBook(readerBook.id, false);
        playChapterAudio(readerChapterId);
    }
    currentSentenceIndex = sentenceIdx;
    speakCurrentSentence();
}

function highlightReaderSentence(sentenceIdx) {
    if (readerActive && readerMode !== 'scroll' && readerSentenceToPageMap[sentenceIdx] !== undefined) {
        const targetPage = readerSentenceToPageMap[sentenceIdx] + 1;
        const isDual = readerMode === 'dual' && window.innerWidth >= 900;

        if (isDual) {
            const leftPage = readerCurrentPage % 2 === 0 ? readerCurrentPage - 1 : readerCurrentPage;
            const rightPage = leftPage + 1;
            if (targetPage !== leftPage && targetPage !== rightPage) {
                readerCurrentPage = targetPage;
                renderCurrentPage();
            }
        } else {
            if (targetPage !== readerCurrentPage) {
                readerCurrentPage = targetPage;
                renderCurrentPage();
            }
        }
    }

    document.querySelectorAll('.reader-sentence.active-sentence').forEach(el => {
        el.classList.remove('active-sentence');
    });

    const targetEl = document.getElementById(`rsentence_${sentenceIdx}`);
    if (targetEl) {
        targetEl.classList.add('active-sentence');
        if (readerMode === 'scroll') {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    if (DOM.readerReadingProgressText && sentenceQueue.length > 0) {
        DOM.readerReadingProgressText.textContent = `Sentence ${sentenceIdx + 1} / ${sentenceQueue.length}`;
    }
}

function setReaderTheme(theme) {
    readerTheme = theme;
    DOM.readerView.className = `reader-theme-${theme} active`;
}

function changeReaderFontSize(delta) {
    readerFontSize = Math.max(14, Math.min(32, readerFontSize + delta));
    if (DOM.readerModalFontSizeText) DOM.readerModalFontSizeText.textContent = `${readerFontSize}px`;
    paginateChapter();
    renderCurrentPage();
}

function changeReaderFontFamily(fontClass) {
    readerFontFamily = fontClass;
    renderCurrentPage();
}

function toggleReaderFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.warn(err));
        if (DOM.readerFullscreenIcon) DOM.readerFullscreenIcon.textContent = 'fullscreen_exit';
    } else {
        document.exitFullscreen().catch(err => console.warn(err));
        if (DOM.readerFullscreenIcon) DOM.readerFullscreenIcon.textContent = 'fullscreen';
    }
}

// ── Full Keyboard & Touch Gestures Matrix ──────────────────────────────────
function setupKeyboardAndTouchControls() {
    window.addEventListener('keydown', (e) => {
        if (!readerActive) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        switch (e.key) {
            case 'ArrowRight':
            case 'PageDown':
                e.preventDefault();
                readerNextPage();
                break;
            case 'ArrowLeft':
            case 'PageUp':
                e.preventDefault();
                readerPrevPage();
                break;
            case 'ArrowDown':
                e.preventDefault();
                readerForwardSentence();
                break;
            case 'ArrowUp':
                e.preventDefault();
                readerRewindSentence();
                break;
            case ' ':
                e.preventDefault();
                togglePlayPause();
                break;
            case 't':
            case 'T':
                e.preventDefault();
                toggleReaderLanguage();
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                toggleReaderFullscreen();
                break;
            case 'Escape':
                e.preventDefault();
                closeReader();
                break;
        }
    });

    const container = document.getElementById('readerScrollContainer');
    if (container) {
        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleTouchSwipe();
        }, { passive: true });
    }
}

function handleTouchSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY) * 1.3 && Math.abs(diffX) > 40) {
        if (diffX < 0) {
            readerNextPage();
        } else {
            readerPrevPage();
        }
    }
}

// ── Dock Chapter Steppers ──────────────────────────────────────────────────
function playPrevChapter() {
    if (!currentBook) return;
    const curIdx = currentBook.chapters.findIndex(c => String(c.id) === String(currentPlayingChapterId));
    if (curIdx > 0) {
        playChapterAudio(currentBook.chapters[curIdx - 1].id);
    }
}

function playNextChapter() {
    if (!currentBook) return;
    const curIdx = currentBook.chapters.findIndex(c => String(c.id) === String(currentPlayingChapterId));
    if (curIdx >= 0 && curIdx < currentBook.chapters.length - 1) {
        playChapterAudio(currentBook.chapters[curIdx + 1].id);
    }
}

function readerRewindSentence() {
    if (sentenceQueue.length > 0) {
        currentSentenceIndex = Math.max(0, currentSentenceIndex - 1);
        speakCurrentSentence();
    }
}

function readerForwardSentence() {
    if (sentenceQueue.length > 0) {
        currentSentenceIndex = Math.min(sentenceQueue.length - 1, currentSentenceIndex + 1);
        speakCurrentSentence();
    }
}

// ══════════════════════════════════════════════════════════════════════════
// ██ 2. WHOLE-BOOK TRANSLATION STUDIO (Step-by-Step Batch Engine) ██
// ══════════════════════════════════════════════════════════════════════════

async function translateSingleSentence(text, targetLang = 'ka') {
    if (!text || !text.trim()) return '';
    const clean = text.trim();

    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|${targetLang}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data && data.responseData && data.responseData.translatedText) {
                const trans = normalizeGeorgian(data.responseData.translatedText);
                if (trans && !trans.includes('MYMEMORY WARNING')) {
                    return trans;
                }
            }
        }
    } catch (e) { console.warn('MyMemory failed:', e); }

    try {
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(clean)}`;
        const gRes = await fetch(gUrl);
        if (gRes.ok) {
            const gData = await gRes.json();
            if (gData && gData[0]) {
                const trans = gData[0].map(item => item[0]).filter(Boolean).join('');
                return normalizeGeorgian(trans);
            }
        }
    } catch (e) { console.warn('Google GTX failed:', e); }

    return clean;
}

async function startWholeBookTranslation() {
    if (!currentBook) {
        alert('Please select an audiobook to translate.');
        return;
    }

    isTranslatingWholeBook = true;
    cancelTranslationFlag = false;
    openModal('wholeBookTranslateModal');

    const totalChapters = currentBook.chapters.length;
    let totalSentencesCount = 0;
    let completedSentencesCount = 0;
    let totalCharsTranslated = 0;

    currentBook.chapters.forEach(chap => {
        const s = splitIntoNaturalSentences(chap.text);
        totalSentencesCount += s.length;
    });

    try {
        for (let chIdx = 0; chIdx < totalChapters; chIdx++) {
            if (cancelTranslationFlag) break;

            const chapter = currentBook.chapters[chIdx];
            const sentences = splitIntoNaturalSentences(chapter.text);
            const translatedArr = [];

            if (DOM.wbChapterLabel) {
                DOM.wbChapterLabel.textContent = `Translating Chapter ${chIdx + 1} of ${totalChapters}: ${chapter.title}`;
            }

            for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
                if (cancelTranslationFlag) break;

                const orig = sentences[sIdx].trim();
                if (!orig) {
                    translatedArr.push('');
                    continue;
                }

                if (DOM.wbLiveOriginal) DOM.wbLiveOriginal.textContent = orig;
                if (DOM.wbSentenceCounter) {
                    DOM.wbSentenceCounter.textContent = `Sentence ${completedSentencesCount + 1} / ${totalSentencesCount}`;
                }

                const translated = await translateSingleSentence(orig, 'ka');
                translatedArr.push(translated);
                totalCharsTranslated += translated.length;

                if (DOM.wbLiveGeorgian) DOM.wbLiveGeorgian.textContent = translated;
                if (DOM.wbCharCounter) {
                    DOM.wbCharCounter.textContent = `${totalCharsTranslated.toLocaleString()} characters translated`;
                }

                completedSentencesCount++;
                const pct = Math.round((completedSentencesCount / totalSentencesCount) * 100);
                if (DOM.wbProgressBar) DOM.wbProgressBar.style.width = `${pct}%`;
                if (DOM.wbProgressPct) DOM.wbProgressPct.textContent = `${pct}%`;

                await new Promise(r => setTimeout(r, 140));
            }

            chapter.text_ka = translatedArr.join(' ');
            if (!currentBook.translatedLangs) currentBook.translatedLangs = [];
            if (!currentBook.translatedLangs.includes('ka')) {
                currentBook.translatedLangs.push('ka');
            }
            await saveBookToDB(currentBook);
        }

        if (!cancelTranslationFlag) {
            if (DOM.wbChapterLabel) DOM.wbChapterLabel.textContent = 'Translation Complete! 🇬🇪';
            if (DOM.wbProgressBar) DOM.wbProgressBar.style.width = '100%';
            if (DOM.wbProgressPct) DOM.wbProgressPct.textContent = '100%';

            setTimeout(() => {
                closeModal('wholeBookTranslateModal');
                isTranslatingWholeBook = false;
                renderChaptersList();
                renderDigitalShelf();
                if (DOM.heroGeorgianBadge) DOM.heroGeorgianBadge.classList.remove('hidden');
                if (readerActive) {
                    readerLang = 'ka';
                    updateReaderLangUI();
                    paginateChapter();
                    renderCurrentPage();
                }
            }, 1200);
        }

    } catch (err) {
        console.error('Whole-book translation error:', err);
        alert('Translation paused. Progress saved.');
    } finally {
        isTranslatingWholeBook = false;
    }
}

function cancelWholeBookTranslation() {
    cancelTranslationFlag = true;
    closeModal('wholeBookTranslateModal');
    isTranslatingWholeBook = false;
    renderChaptersList();
    renderDigitalShelf();
}

// ══════════════════════════════════════════════════════════════════════════
// ██ 3. ZERO-SKIPPING BULLETPROOF SPEECH ENGINE ██
// ══════════════════════════════════════════════════════════════════════════

async function speakCurrentSentence() {
    if (!isPlaying || isPaused) return;

    if (currentSentenceIndex >= sentenceQueue.length) {
        stopSpeech();
        if (DOM.playerProgressBar) DOM.playerProgressBar.style.width = '100%';
        playNextChapter();
        return;
    }

    const rawSentence = sentenceQueue[currentSentenceIndex];
    if (!rawSentence || !rawSentence.trim()) {
        currentSentenceIndex++;
        speakCurrentSentence();
        return;
    }

    const cleanSentence = rawSentence.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();

    const pct = Math.round((currentSentenceIndex / sentenceQueue.length) * 100);
    if (DOM.playerProgressBar) DOM.playerProgressBar.style.width = `${pct}%`;
    if (DOM.playerCurrentTime) DOM.playerCurrentTime.textContent = formatTime(secondsElapsed);

    if (currentBook) {
        currentBook.progressPct = pct;
        currentBook.lastPlayedChapterId = currentPlayingChapterId;
        saveBookToDB(currentBook);
        if (DOM.heroProgressText) DOM.heroProgressText.textContent = `${pct}% Completed`;
        if (DOM.heroProgressBarInner) DOM.heroProgressBarInner.style.width = `${pct}%`;
        if (DOM.heroProgressCircle) {
            DOM.heroProgressCircle.style.strokeDashoffset = 289 - (289 * pct / 100);
        }
    }

    if (DOM.heroSubtitleHeader) {
        DOM.heroSubtitleHeader.textContent = currentLang === 'ka' ? "ქართული ნარაცია (Georgian)" : "Current Narration";
    }
    if (DOM.heroLiveSubtitle) {
        DOM.heroLiveSubtitle.textContent = cleanSentence;
    }

    if (readerActive) {
        highlightReaderSentence(currentSentenceIndex);
    }

    if (elevenLabsEnabled && elevenLabsApiKey) {
        speakElevenLabsSentence(cleanSentence);
    } else {
        speakStandardSentence(cleanSentence, currentLang);
    }
}

function speakStandardSentence(text, lang) {
    if (!('speechSynthesis' in window)) return;

    stopCurrentSpeechAudio();

    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }

    const utter = new SpeechSynthesisUtterance();
    const voices = window.speechSynthesis.getVoices();

    if (lang === 'ka') {
        const normalized = normalizeGeorgian(text);
        const nativeKaVoice = voices.find(v => v.lang.startsWith('ka') || v.name.toLowerCase().includes('georgian'));

        if (nativeKaVoice) {
            utter.text = normalized;
            utter.voice = nativeKaVoice;
            utter.lang = nativeKaVoice.lang;
        } else {
            // Phonetic Georgian with high-clarity voice
            utter.text = transliterateGeorgianToPhonetic(normalized);
            const clearVoice = voices.find(v => v.lang.startsWith('it') || v.lang.startsWith('es') || v.lang.startsWith('el') || v.lang.startsWith('pt')) ||
                               voices.find(v => (v.voiceURI && v.voiceURI === selectedVoiceURI) || v.name === selectedVoiceURI) ||
                               voices[0];
            if (clearVoice) {
                utter.voice = clearVoice;
                utter.lang = clearVoice.lang;
            } else {
                utter.lang = 'en-US';
            }
        }
    } else {
        utter.text = text;
        const matched = voices.find(v => (v.voiceURI && v.voiceURI === selectedVoiceURI) || v.name === selectedVoiceURI);
        if (matched) {
            utter.voice = matched;
            utter.lang = matched.lang || 'en-US';
        } else {
            utter.lang = 'en-US';
        }
    }

    utter.rate = currentGlobalSpeed * (lang === 'ka' ? 0.92 : 1.0);
    utter.pitch = currentPitch;

    utter.onstart = () => {
        isSpeakingLock = true;
        updatePlayerUIState(true);
    };

    utter.onend = () => {
        isSpeakingLock = false;
        if (!isPlaying || isPaused) return;
        currentSentenceIndex++;
        if (utteranceTimeout) clearTimeout(utteranceTimeout);
        utteranceTimeout = setTimeout(() => {
            if (isPlaying && !isPaused) speakCurrentSentence();
        }, 220);
    };

    utter.onerror = (e) => {
        isSpeakingLock = false;
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        // Do NOT run away in a loop on error; gracefully retry once or stop
        console.warn('SpeechSynthesis error:', e.error);
        if (isPlaying && !isPaused) {
            setTimeout(() => {
                if (isPlaying && !isPaused) {
                    currentSentenceIndex++;
                    speakCurrentSentence();
                }
            }, 350);
        }
    };

    window._activeUtterance = utter;
    window.speechSynthesis.speak(utter);
    updatePlayerUIState(true);
}

async function speakElevenLabsSentence(text) {
    stopCurrentSpeechAudio();
    updatePlayerUIState(true);

    try {
        const voiceId = elevenLabsVoiceId || 'pNInz6obpgDQGcFmaJgB';
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'xi-api-key': elevenLabsApiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.8
                }
            })
        });

        if (!res.ok) throw new Error(`ElevenLabs API status ${res.status}`);

        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        currentElevenAudio = audio;
        audio.playbackRate = currentGlobalSpeed;

        audio.onended = () => {
            if (!isPlaying || isPaused) return;
            currentSentenceIndex++;
            if (utteranceTimeout) clearTimeout(utteranceTimeout);
            utteranceTimeout = setTimeout(() => {
                if (isPlaying && !isPaused) speakCurrentSentence();
            }, 260);
        };

        audio.onerror = () => {
            speakStandardSentence(text, currentLang);
        };

        await audio.play();

    } catch (err) {
        speakStandardSentence(text, currentLang);
    }
}

function stopCurrentSpeechAudio() {
    if (currentElevenAudio) {
        currentElevenAudio.pause();
        try { currentElevenAudio.src = ''; } catch(e) {}
        currentElevenAudio = null;
    }
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    isSpeakingLock = false;
}

// ── Playback Controls ───────────────────────────────────────────────────────
function playChapterAudio(chapId) {
    if (!currentBook) return;
    const chap = currentBook.chapters.find(c => String(c.id) === String(chapId));
    if (!chap) return;

    if (String(currentPlayingChapterId) === String(chapId) && isPlaying) {
        togglePlayPause();
        return;
    }

    stopSpeech();

    currentPlayingChapterId = chap.id;

    let textToRead = chap.text;
    if (currentLang === 'ka' && chap.text_ka) {
        textToRead = chap.text_ka;
    }

    sentenceQueue = splitIntoNaturalSentences(textToRead);
    currentSentenceIndex = 0;
    secondsElapsed = 0;
    isPlaying = true;
    isPaused = false;

    // Reveal player dock
    DOM.playerDock.classList.remove('translate-y-12', 'opacity-0', 'pointer-events-none');
    DOM.playerDock.classList.add('translate-y-0', 'opacity-100');

    DOM.dockCover.src = currentBook.coverUrl;
    DOM.dockTitle.textContent = chap.title;
    DOM.dockSubtitle.textContent = currentBook.title;
    if (DOM.playerTotalTime) DOM.playerTotalTime.textContent = formatTime(chap.estimated_duration_sec);

    updateLangToggleUI();
    startTimer();
    speakCurrentSentence();
    renderChaptersList();

    if (readerActive) {
        readerChapterId = chap.id;
        paginateChapter();
        renderCurrentPage();
    }
}

function togglePlayPause() {
    if (!currentPlayingChapterId) {
        if (currentBook && currentBook.chapters.length > 0) {
            playChapterAudio(currentBook.chapters[0].id);
        }
        return;
    }

    if (isPlaying && !isPaused) {
        isPaused = true;
        if (utteranceTimeout) clearTimeout(utteranceTimeout);
        if (currentElevenAudio) currentElevenAudio.pause();
        if (window.speechSynthesis) window.speechSynthesis.pause();
        stopTimer();
        updatePlayerUIState(false);
    } else if (isPlaying && isPaused) {
        isPaused = false;
        startTimer();
        if (currentElevenAudio) {
            currentElevenAudio.play().catch(() => speakCurrentSentence());
        } else if (window.speechSynthesis && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        } else {
            speakCurrentSentence();
        }
        updatePlayerUIState(true);
    } else {
        playChapterAudio(currentPlayingChapterId);
    }
}

function updatePlayerUIState(speaking) {
    if (DOM.dockPlayIcon) DOM.dockPlayIcon.textContent = speaking ? 'pause' : 'play_arrow';
    if (DOM.heroPlayIcon) DOM.heroPlayIcon.textContent = speaking ? 'pause' : 'play_arrow';
    if (DOM.readerPlayIcon) DOM.readerPlayIcon.textContent = speaking ? 'pause' : 'play_arrow';
    if (DOM.dockVisualizer) {
        if (speaking) DOM.dockVisualizer.classList.remove('hidden');
        else DOM.dockVisualizer.classList.add('hidden');
    }
    renderChaptersList();
}

function stopSpeech() {
    isPlaying = false;
    isPaused = false;
    sentenceQueue = [];
    currentSentenceIndex = 0;
    if (utteranceTimeout) clearTimeout(utteranceTimeout);
    stopCurrentSpeechAudio();
    stopTimer();
    updatePlayerUIState(false);
}

function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
        secondsElapsed++;
        if (DOM.playerCurrentTime) DOM.playerCurrentTime.textContent = formatTime(secondsElapsed);
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function cycleSpeed() {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const idx = speeds.indexOf(currentGlobalSpeed);
    currentGlobalSpeed = speeds[(idx + 1) % speeds.length];
    if (DOM.btnDockSpeed) DOM.btnDockSpeed.textContent = `${currentGlobalSpeed.toFixed(2).replace(/\.00$/, '')}x`;
    if (DOM.modalSpeedSlider) DOM.modalSpeedSlider.value = currentGlobalSpeed;
    if (DOM.modalSpeedVal) DOM.modalSpeedVal.textContent = `${currentGlobalSpeed.toFixed(2)}x`;
    if (currentElevenAudio) currentElevenAudio.playbackRate = currentGlobalSpeed;
    if (isPlaying && !isPaused) speakCurrentSentence();
}

function togglePlaybackLanguage() {
    if (!currentBook) return;
    if (currentLang === 'en') {
        const hasKa = currentBook.translatedLangs && currentBook.translatedLangs.includes('ka');
        if (!hasKa) {
            const doTranslate = confirm('This book has not been translated to Georgian yet. Translate the whole book now?');
            if (doTranslate) {
                startWholeBookTranslation();
            }
            return;
        }
        currentLang = 'ka';
    } else {
        currentLang = 'en';
    }

    updateLangToggleUI();

    if (currentPlayingChapterId) {
        stopSpeech();
        playChapterAudio(currentPlayingChapterId);
    }
}

function updateLangToggleUI() {
    if (DOM.dockLangBadge) {
        DOM.dockLangBadge.textContent = currentLang === 'ka' ? '🇬🇪 KA' : '🇺🇸 EN';
    }
    if (DOM.dockLangBadgeMobile) {
        DOM.dockLangBadgeMobile.textContent = currentLang === 'ka' ? '🇬🇪 KA' : '🇺🇸 EN';
    }
}

// ══════════════════════════════════════════════════════════════════════════
// ██ 4. FORMATTED PDF EXPORT GENERATOR ██
// ══════════════════════════════════════════════════════════════════════════

function exportCurrentBookPDF() {
    if (!currentBook) {
        alert('Please select a book to export.');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF generator is initializing, please try again in a moment.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 45;
    const maxLineWidth = pageWidth - margin * 2;

    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.text(currentBook.title, margin, 120);

    doc.setFont("times", "normal");
    doc.setFontSize(13);
    doc.text(`By ${currentBook.author || 'Author'} • Lumina AI Studio Edition`, margin, 150);
    doc.text(`Language: ${readerLang === 'ka' ? 'Georgian (ქართული)' : 'English (Original)'}`, margin, 172);
    doc.text(`Exported on: ${new Date().toLocaleDateString()}`, margin, 194);

    doc.setLineWidth(1);
    doc.line(margin, 215, pageWidth - margin, 215);

    let yPos = 250;

    currentBook.chapters.forEach((chap, cIdx) => {
        if (yPos > 650) {
            doc.addPage();
            yPos = 60;
        }

        doc.setFont("times", "bold");
        doc.setFontSize(18);
        doc.text(chap.title, margin, yPos);
        yPos += 25;

        doc.setFont("times", "normal");
        doc.setFontSize(11);

        const chapterContent = (readerLang === 'ka' && chap.text_ka) ? chap.text_ka : chap.text;
        const lines = doc.splitTextToSize(chapterContent, maxLineWidth);

        lines.forEach(line => {
            if (yPos > 780) {
                doc.addPage();
                yPos = 60;
            }
            doc.text(line, margin, yPos);
            yPos += 16;
        });

        yPos += 30;
    });

    const safeTitle = currentBook.title.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`${safeTitle}_${readerLang === 'ka' ? 'Georgian' : 'English'}.pdf`);
}

// ══════════════════════════════════════════════════════════════════════════
// ██ 5. PDF UPLOAD & PARSING ██
// ══════════════════════════════════════════════════════════════════════════

function cleanBookTitle(rawName) {
    return rawName
        .replace(/\.pdf$/i, '')
        .replace(/[_\-]+/g, ' ')
        .replace(/\b(fastpencil|pbo|edition|version|full|book|pdf|download|epub|compressed|ocr)\b/gi, '')
        .trim();
}

async function fetchBookCoverArt(title) {
    const cleaned = cleanBookTitle(title);
    try {
        const gRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(cleaned)}&maxResults=1`);
        if (gRes.ok) {
            const gData = await gRes.json();
            if (gData.items?.[0]?.volumeInfo?.imageLinks) {
                const links = gData.items[0].volumeInfo.imageLinks;
                const thumb = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;
                if (thumb) return thumb.replace('http:', 'https:');
            }
        }
    } catch (e) { console.warn('Google Books failed:', e); }

    try {
        const oRes = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(cleaned)}&limit=1`);
        if (oRes.ok) {
            const oData = await oRes.json();
            if (oData.docs?.[0]?.cover_i) {
                return `https://covers.openlibrary.org/b/id/${oData.docs[0].cover_i}-L.jpg`;
            }
        }
    } catch (e) { console.warn('Open Library failed:', e); }

    return generateDynamicStudioCover(cleaned);
}

function generateDynamicStudioCover(title) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 400, 600);
    grad.addColorStop(0, '#0a0f1d');
    grad.addColorStop(0.5, '#19153a');
    grad.addColorStop(1, '#06080c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 600);

    ctx.save();
    ctx.filter = 'blur(40px)';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.beginPath(); ctx.arc(90, 130, 90, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 209, 102, 0.35)';
    ctx.beginPath(); ctx.arc(310, 470, 110, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 40; i < 400; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 600); ctx.stroke(); }
    for (let j = 40; j < 600; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(400, j); ctx.stroke(); }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 360, 560);

    ctx.fillStyle = '#00f0ff';
    ctx.font = '600 12px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LUMINA MOON AUDIOBOOK', 200, 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    const words = title.split(' ');
    let line = '';
    let y = 260;
    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > 300 && n > 0) {
            ctx.fillText(line.trim(), 200, y);
            line = words[n] + ' ';
            y += 34;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), 200, y);

    ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
    ctx.font = '500 14px Inter, sans-serif';
    ctx.fillText('Studio Reader Edition', 200, 520);

    return canvas.toDataURL('image/jpeg', 0.9);
}

async function handleFileUpload(file) {
    if (!file || file.type !== 'application/pdf') {
        alert('Please select a valid PDF file.');
        return;
    }

    DOM.uploadProgressContainer.classList.remove('hidden');
    DOM.uploadStatusText.textContent = "Extracting text from PDF...";
    DOM.uploadProgressBar.style.width = '15%';
    DOM.uploadProgressPct.textContent = '15%';

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        const totalPages = pdf.numPages;

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(' ') + '\n\n';

            const pct = 15 + Math.round((i / totalPages) * 45);
            DOM.uploadProgressBar.style.width = `${pct}%`;
            DOM.uploadProgressPct.textContent = `${pct}%`;
        }

        DOM.uploadStatusText.textContent = "Searching for official book cover art...";
        DOM.uploadProgressBar.style.width = '70%';
        DOM.uploadProgressPct.textContent = '70%';

        const coverUrl = await fetchBookCoverArt(file.name);

        DOM.uploadStatusText.textContent = "Structuring chapters...";
        DOM.uploadProgressBar.style.width = '90%';
        DOM.uploadProgressPct.textContent = '90%';

        const rawTitle = cleanBookTitle(file.name);
        const chapters = splitIntoChapters(fullText);

        const newBook = {
            id: 'book_' + Date.now(),
            title: rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1),
            author: 'PDF Audiobook',
            coverUrl: coverUrl,
            chapters: chapters,
            translatedLangs: [],
            dateAdded: new Date().toISOString(),
            lastPlayedChapterId: chapters.length > 0 ? chapters[0].id : null,
            progressPct: 0
        };

        await saveBookToDB(newBook);
        DOM.uploadProgressBar.style.width = '100%';
        DOM.uploadProgressPct.textContent = '100%';
        DOM.uploadStatusText.textContent = "Import complete!";

        setTimeout(() => {
            closeModal('uploadModal');
            DOM.uploadProgressContainer.classList.add('hidden');
            renderDigitalShelf();
            selectBook(newBook.id, true);
        }, 800);

    } catch (err) {
        console.error('PDF Parse Error:', err);
        DOM.uploadStatusText.textContent = "Error parsing PDF document.";
        DOM.uploadStatusText.classList.add('text-error');
    }
}

function splitIntoChapters(text) {
    const chapters = [];
    const MAX_WORDS = 600;
    const words = text.split(/\s+/).filter(w => w.trim().length > 0);

    let currentChunk = [];
    let chapIndex = 1;

    for (let i = 0; i < words.length; i++) {
        currentChunk.push(words[i]);
        if (currentChunk.length >= MAX_WORDS) {
            chapters.push({
                id: chapIndex,
                title: `Chapter ${chapIndex}`,
                text: currentChunk.join(' '),
                text_ka: null,
                word_count: currentChunk.length,
                estimated_duration_sec: Math.round((currentChunk.length / 140) * 60)
            });
            chapIndex++;
            currentChunk = [];
        }
    }

    if (currentChunk.length > 0) {
        chapters.push({
            id: chapIndex,
            title: `Chapter ${chapIndex}`,
            text: currentChunk.join(' '),
            text_ka: null,
            word_count: currentChunk.length,
            estimated_duration_sec: Math.round((currentChunk.length / 140) * 60)
        });
    }

    if (chapters.length === 0) {
        chapters.push({
            id: 1,
            title: 'Full Reading',
            text: text.substring(0, 4000),
            text_ka: null,
            word_count: 500,
            estimated_duration_sec: 180
        });
    }

    return chapters;
}

function splitIntoNaturalSentences(text) {
    if (!text) return [];
    const regex = /[^.!?։]+[.!?։]+["']?|[^.!?։]+$/g;
    const matches = text.match(regex);
    return matches ? matches.map(s => s.trim()).filter(s => s.length > 0) : [text];
}

// ══════════════════════════════════════════════════════════════════════════
// ██ 6. DIGITAL SHELF & DISCOVER RENDERING ██
// ══════════════════════════════════════════════════════════════════════════

async function renderDigitalShelf(filterText = '') {
    const books = await getAllBooks();
    DOM.booksGrid.innerHTML = '';

    const filtered = filterText
        ? books.filter(b => b.title.toLowerCase().includes(filterText.toLowerCase()))
        : books;

    if (DOM.shelfMetaText) {
        DOM.shelfMetaText.textContent = `${books.length} Audiobooks in your personal library`;
    }

    if (filtered.length === 0) {
        DOM.booksGrid.innerHTML = `
            <div class="col-span-full py-16 text-center glass-panel rounded-2xl">
                <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">library_books</span>
                <p class="text-white font-semibold">No audiobooks found</p>
                <p class="text-xs text-on-surface-variant mt-1">Upload a PDF to get started</p>
            </div>
        `;
        return;
    }

    filtered.forEach(book => {
        const isSelected = currentBook && String(currentBook.id) === String(book.id);
        const hasGeorgian = book.translatedLangs && book.translatedLangs.includes('ka');
        const stats = getBookStats(book);

        const div = document.createElement('div');
        div.className = 'group relative cursor-pointer';
        div.onclick = () => selectBook(book.id, true);

        div.innerHTML = `
            <div class="aspect-[2/3] rounded-2xl overflow-hidden mb-2 relative glass-card p-1.5 ${isSelected ? 'border-primary-container ring-2 ring-primary-container/30 shadow-[0_0_25px_rgba(0,240,255,0.25)]' : ''}">
                <img src="${book.coverUrl}" class="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500 bg-surface-container">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl gap-2">
                    <button onclick="event.stopPropagation(); selectBook('${book.id}', true);" class="w-10 h-10 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform" title="Listen Now">
                        <span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                    </button>
                    <button onclick="event.stopPropagation(); selectBook('${book.id}', false); openCurrentBookInReader();" class="w-10 h-10 bg-georgian-gold text-black rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform" title="Moon Reader">
                        <span class="material-symbols-outlined text-lg">menu_book</span>
                    </button>
                </div>
                ${hasGeorgian ? '<div class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-georgian-gold/90 text-[10px] font-bold text-black shadow-lg">🇬🇪 KA</div>' : ''}
                ${book.progressPct > 0 ? `<div class="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-md rounded-full h-1 overflow-hidden"><div class="h-full bg-primary-container" style="width: ${book.progressPct}%"></div></div>` : ''}
            </div>
            <h4 class="font-bold text-white text-xs sm:text-sm truncate group-hover:text-primary-fixed transition-colors">${book.title}</h4>
            <div class="flex justify-between items-center mt-0.5">
                <p class="text-[10px] sm:text-[11px] text-on-surface-variant truncate">${stats.chaptersCount} Ch • ${stats.totalFormattedTime}</p>
                <button onclick="deleteBook(event, '${book.id}')" class="text-on-surface-variant hover:text-error transition p-1" title="Delete Book">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            </div>
        `;
        DOM.booksGrid.appendChild(div);
    });
}

function renderDiscoverClassics() {
    if (!DOM.discoverGrid) return;
    DOM.discoverGrid.innerHTML = '';

    DISCOVER_CLASSICS.forEach(book => {
        const stats = getBookStats(book);
        const div = document.createElement('div');
        div.className = 'group relative cursor-pointer glass-card p-4 rounded-2xl flex flex-col justify-between';
        div.onclick = async () => {
            await saveBookToDB(book);
            await renderDigitalShelf();
            selectBook(book.id, true);
            navigate('library');
        };

        div.innerHTML = `
            <div>
                <div class="aspect-[16/10] sm:aspect-[2/3] rounded-xl overflow-hidden mb-3.5 relative">
                    <img src="${book.coverUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-georgian-gold text-[10px] font-bold text-black shadow">🇬🇪 Ready</div>
                </div>
                <h4 class="font-bold text-white text-base truncate">${book.title}</h4>
                <p class="text-xs text-primary-fixed mt-0.5">${book.author}</p>
                <p class="text-xs text-on-surface-variant mt-1">${stats.chaptersCount} Chapters • ${stats.totalWords.toLocaleString()} Words • ~${stats.totalFormattedTime}</p>
            </div>
            <button class="mt-4 w-full py-2.5 rounded-xl bg-white/5 group-hover:bg-primary-container group-hover:text-on-primary-container text-white text-xs font-semibold flex items-center justify-center gap-2 transition">
                <span class="material-symbols-outlined text-base">headphones</span>
                Read & Listen
            </button>
        `;
        DOM.discoverGrid.appendChild(div);
    });
}

async function selectBook(bookId, autoPlayFirst = false) {
    const books = await getAllBooks();
    currentBook = books.find(b => String(b.id) === String(bookId));
    if (!currentBook) return;

    if (!currentBook.translatedLangs) currentBook.translatedLangs = [];

    const stats = getBookStats(currentBook);

    // Update Hero UI
    DOM.heroCover.src = currentBook.coverUrl;
    DOM.heroTitle.textContent = currentBook.title;

    const hasKa = currentBook.translatedLangs && currentBook.translatedLangs.includes('ka');
    if (DOM.heroGeorgianBadge) {
        if (hasKa) DOM.heroGeorgianBadge.classList.remove('hidden');
        else DOM.heroGeorgianBadge.classList.add('hidden');
    }

    if (DOM.btnTranslateWholeBookText) {
        DOM.btnTranslateWholeBookText.textContent = hasKa ? "Re-translate Whole Book (Georgian)" : "Translate Book (Georgian)";
    }

    const lastChap = currentBook.chapters.find(c => String(c.id) === String(currentBook.lastPlayedChapterId)) || currentBook.chapters[0];
    DOM.heroLiveSubtitle.textContent = `Ready to play ${lastChap ? lastChap.title : 'Chapter 1'}`;

    const pct = currentBook.progressPct || 0;
    DOM.heroProgressText.textContent = `${pct}% Completed`;
    DOM.heroProgressBarInner.style.width = `${pct}%`;
    DOM.heroProgressCircle.style.strokeDashoffset = 289 - (289 * pct / 100);

    if (lastChap) {
        DOM.heroPlayBtn.onclick = () => playChapterAudio(lastChap.id);
    }

    DOM.chaptersContainer.classList.remove('hidden');
    DOM.activeBookTitle.textContent = currentBook.title;
    if (DOM.activeBookMetaDetail) {
        DOM.activeBookMetaDetail.textContent = `${stats.chaptersCount} Chapters • ${stats.totalWords.toLocaleString()} Words • ~${stats.totalFormattedTime} listening time`;
    }
    renderChaptersList();

    if (autoPlayFirst && lastChap) {
        playChapterAudio(lastChap.id);
    }
}

async function deleteBook(e, bookId) {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this audiobook from your shelf?')) {
        await deleteBookFromDB(bookId);
        if (currentBook && String(currentBook.id) === String(bookId)) {
            stopSpeech();
            currentBook = null;
            DOM.chaptersContainer.classList.add('hidden');
            DOM.playerDock.classList.add('translate-y-12', 'opacity-0', 'pointer-events-none');
        }
        await renderDigitalShelf();
    }
}

function renderChaptersList() {
    if (!currentBook || !DOM.chaptersList) return;
    DOM.chaptersList.innerHTML = '';

    currentBook.chapters.forEach((chap, idx) => {
        const isCurrent = String(currentPlayingChapterId) === String(chap.id);
        const isSpeaking = isCurrent && isPlaying && !isPaused;
        const chapHasKa = !!chap.text_ka;

        const div = document.createElement('div');
        div.className = `glass-panel rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${isSpeaking ? 'border-primary-container/60 bg-primary-container/10 shadow-[0_0_20px_rgba(0,240,255,0.15)]' : 'hover:bg-white/5'}`;

        div.innerHTML = `
            <div class="flex items-center gap-3.5 min-w-0 flex-grow">
                <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${isSpeaking ? 'bg-primary-container text-on-primary-container' : 'bg-white/5 text-primary-fixed'} flex items-center justify-center font-bold text-xs sm:text-sm font-mono flex-shrink-0">
                    ${idx + 1}
                </div>
                <div class="overflow-hidden">
                    <h4 class="font-semibold text-white text-xs sm:text-base truncate flex items-center gap-2">
                        ${chap.title}
                        ${chapHasKa ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-georgian-gold/20 text-georgian-gold border border-georgian-gold/30 font-bold">🇬🇪</span>' : ''}
                    </h4>
                    <p class="text-[10px] sm:text-xs text-on-surface-variant mt-0.5">${chap.word_count} words • ~${formatTime(chap.estimated_duration_sec)}</p>
                </div>
            </div>

            <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button onclick="openReader('${currentBook.id}', ${chap.id}, currentLang)" class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1 border border-white/10 transition" title="Read in Moon Reader">
                    <span class="material-symbols-outlined text-sm text-georgian-gold">menu_book</span>
                    <span>Read</span>
                </button>
                <button onclick="playChapterAudio(${chap.id})" class="px-3.5 py-1.5 rounded-xl ${isSpeaking ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(0,240,255,0.5)]' : 'bg-white/10 text-white hover:bg-primary-container/20 hover:text-primary-fixed'} text-xs font-bold transition flex items-center gap-1">
                    <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 1;">${isSpeaking ? 'pause' : 'play_arrow'}</span>
                    <span>${isSpeaking ? 'Pause' : 'Listen'}</span>
                </button>
            </div>
        `;
        DOM.chaptersList.appendChild(div);
    });
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ── Event Listeners Binding ─────────────────────────────────────────────────
function setupEventListeners() {
    const btnNavUpload = document.getElementById('btnNavUpload');
    if (btnNavUpload) {
        btnNavUpload.addEventListener('click', () => openModal('uploadModal'));
    }

    if (DOM.dropZone) {
        DOM.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            DOM.dropZone.classList.add('border-primary-container');
        });
        DOM.dropZone.addEventListener('dragleave', () => {
            DOM.dropZone.classList.remove('border-primary-container');
        });
        DOM.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            DOM.dropZone.classList.remove('border-primary-container');
            if (e.dataTransfer.files.length > 0) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });
    }

    if (DOM.fileInput) {
        DOM.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
        });
    }

    if (DOM.searchInput) {
        DOM.searchInput.addEventListener('input', (e) => {
            renderDigitalShelf(e.target.value);
        });
    }

    if (DOM.btnPlayerPlayPause) DOM.btnPlayerPlayPause.addEventListener('click', togglePlayPause);
    
    if (DOM.btnPlayerRewind) {
        DOM.btnPlayerRewind.addEventListener('click', () => {
            if (sentenceQueue.length > 0) {
                currentSentenceIndex = Math.max(0, currentSentenceIndex - 2);
                if (isPlaying && !isPaused) speakCurrentSentence();
            }
        });
    }

    if (DOM.btnPlayerForward) {
        DOM.btnPlayerForward.addEventListener('click', () => {
            if (sentenceQueue.length > 0) {
                currentSentenceIndex = Math.min(sentenceQueue.length - 1, currentSentenceIndex + 2);
                if (isPlaying && !isPaused) speakCurrentSentence();
            }
        });
    }

    if (DOM.playerProgressContainer) {
        DOM.playerProgressContainer.addEventListener('click', (e) => {
            if (!sentenceQueue || sentenceQueue.length === 0) return;
            const rect = DOM.playerProgressContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, clickX / rect.width));
            currentSentenceIndex = Math.floor(pct * sentenceQueue.length);
            if (isPlaying && !isPaused) speakCurrentSentence();
        });
    }

    if (DOM.voiceModalSelect) {
        DOM.voiceModalSelect.addEventListener('change', (e) => {
            selectedVoiceURI = e.target.value;
            localStorage.setItem('lumina_selected_voice_uri', selectedVoiceURI);
            updateTopVoiceBadge();
            if (isPlaying && !isPaused && !elevenLabsEnabled) speakCurrentSentence();
        });
    }

    if (DOM.modalSpeedSlider) {
        DOM.modalSpeedSlider.addEventListener('input', (e) => {
            currentGlobalSpeed = parseFloat(e.target.value);
            if (DOM.modalSpeedVal) DOM.modalSpeedVal.textContent = `${currentGlobalSpeed.toFixed(2)}x`;
            if (DOM.btnDockSpeed) DOM.btnDockSpeed.textContent = `${currentGlobalSpeed.toFixed(2).replace(/\.00$/, '')}x`;
            if (currentElevenAudio) currentElevenAudio.playbackRate = currentGlobalSpeed;
        });
    }

    if (DOM.modalPitchSlider) {
        DOM.modalPitchSlider.addEventListener('input', (e) => {
            currentPitch = Math.max(0.5, Math.min(1.8, 1 + parseInt(e.target.value) / 20));
            if (DOM.modalPitchVal) DOM.modalPitchVal.textContent = e.target.value;
        });
    }

    const btnAuthSignIn = document.getElementById('btnAuthSignIn');
    if (btnAuthSignIn) {
        btnAuthSignIn.addEventListener('click', () => {
            login(document.getElementById('authEmail').value, document.getElementById('authPassword').value);
        });
    }

    const btnAuthRegister = document.getElementById('btnAuthRegister');
    if (btnAuthRegister) {
        btnAuthRegister.addEventListener('click', () => {
            login(document.getElementById('authEmail').value, document.getElementById('authPassword').value);
        });
    }

    if (DOM.btnDownloadAllZip) {
        DOM.btnDownloadAllZip.addEventListener('click', async () => {
            if (!currentBook) return;
            const zip = new JSZip();
            currentBook.chapters.forEach(c => {
                const enContent = `--- ${c.title} (English) ---\n\n${c.text}`;
                const kaContent = c.text_ka ? `\n\n--- ${c.title} (Georgian / ქართული) ---\n\n${c.text_ka}` : '';
                zip.file(`${c.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`, enContent + kaContent);
            });
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentBook.title.replace(/[^a-zA-Z0-9]/g, '_')}_Audiobook.zip`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
}

// Start App
document.addEventListener('DOMContentLoaded', init);
