// ==========================================================================
// LUMINA AUDIO — PRO AI AUDIOBOOK & MOON+ READER ENGINE (v8.0)
// ==========================================================================
// Full E-Book Capabilities:
//   1. True Paginated Moon+ Reader with Discrete Book Pages & Page-Flip Animation
//   2. Full Keyboard Navigation: Arrow Keys (←/→ Pages, ↑/↓ Sentences), Spacebar, Esc, T, M, F
//   3. Mobile Touch Swipe Gestures & Left/Right Screen Click Turning Zones
//   4. Synchronized Audio Narration with Auto Page-Flipping & Active Sentence Glow
//   5. ElevenLabs Studio Neural AI + Resilient Phonetic Fallback Engine
//   6. Whole-Book Georgian Batch Translation & Multi-Page PDF Export
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

// Moon+ Reader State
let readerActive = false;
let readerBook = null;
let readerChapterId = null;
let readerLang = 'en'; // 'en' or 'ka'
let readerMode = 'pages'; // 'pages' (Paginated Book Mode) or 'scroll' (Continuous Scroll)
let readerCurrentPage = 1;
let readerPages = []; // Array of arrays of sentence objects { text: string, globalIndex: number }
let readerSentenceToPageMap = {}; // Map: sentenceGlobalIndex -> pageIndex (0-based)
let readerFontSize = 18; // in px
let readerTheme = 'sepia'; // 'sepia', 'mocha', 'dark', 'light', 'forest', 'oled'
let readerFontFamily = 'font-serif-book';
let isZenMode = false;

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

// ── Discover Masterworks ───────────────────────────────────────────────────
const DISCOVER_CLASSICS = [
    {
        id: 'classic_war_of_art',
        title: 'The War of Art',
        author: 'Steven Pressfield',
        coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
        chapters: [
            {
                id: 1,
                title: 'Chapter 1: Defining Resistance',
                text: "Most of us have two lives: the life we live, and the unlived life within us. Between the two stands Resistance. Have you ever brought home a treadmill and let it gather dust in the attic? Have you ever quit a diet or a creative project? If you have, you know what Resistance is. Resistance is invisible and cannot be touched, but it can be felt. It is an energetic field radiating from potential work whose only aim is to distract us from our true greatness.",
                text_ka: "უმეტესობას ორი ცხოვრება გვაქვს: ცხოვრება, რომლითაც ვცხოვრობთ და არაცოცხალი ცხოვრება ჩვენში. ამ ორს შორის დგას წინააღმდეგობა. ოდესმე მოგიტანიათ სახლში სარბენი ბილიკი და დაგიტოვებიათ სხვენში მტვრის ასაკრეფად? ოდესმე მიგიტოვებიათ დიეტა ან შემოქმედებითი პროექტი? თუ ასეა, თქვენ იცით, რა არის წინააღმდეგობა. წინააღმდეგობა უხილავია და მისი შეხება შეუძლებელია, მაგრამ მისი შეგრძნება შესაძლებელია.",
                word_count: 78,
                estimated_duration_sec: 32
            },
            {
                id: 2,
                title: 'Chapter 2: Overcoming The Enemy',
                text: "The professional prepares for battle each morning with discipline. Resistance hates discipline. When we sit down day after day and keep grinding, the muse notices and rewards our commitment.",
                text_ka: "პროფესიონალი ყოველ დილით დისციპლინით ემზადება ბრძოლისთვის. წინააღმდეგობას სძულს დისციპლინა. როდესაც ჩვენ დღითიდღე ვსხედვართ და ვაგრძელებთ შრომას, მუზა ამჩნევს და აჯილდოებს ჩვენს ერთგულებას.",
                word_count: 36,
                estimated_duration_sec: 18
            }
        ],
        translatedLangs: ['ka'],
        dateAdded: new Date().toISOString(),
        progressPct: 0
    },
    {
        id: 'classic_art_of_war',
        title: 'The Art of War',
        author: 'Sun Tzu',
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
        chapters: [
            {
                id: 1,
                title: 'Chapter 1: Laying Plans',
                text: "The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected. The moral law causes the people to be in complete accord with their ruler, so that they will follow him regardless of their lives, undismayed by any danger.",
                text_ka: "ომის ხელოვნებას სასიცოცხლო მნიშვნელობა აქვს სახელმწიფოსთვის. ეს არის სიცოცხლისა და სიკვდილის საკითხი, გზა ან უსაფრთხოებისკენ, ან დაღუპვისკენ. აქედან გამომდინარე, ეს არის კვლევის საგანი, რომლის უგულებელყოფა არავითარ შემთხვევაში არ შეიძლება. მორალური კანონი აიძულებს ხალხს იყოს სრულ თანხმობაში თავის მმართველთან.",
                word_count: 62,
                estimated_duration_sec: 26
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
        readerChapterSelect: document.getElementById('readerChapterSelect'),
        readerFontSelect: document.getElementById('readerFontSelect'),
        readerContentArea: document.getElementById('readerContentArea'),
        readerScrollContainer: document.getElementById('readerScrollContainer'),
        readerPageCard: document.getElementById('readerPageCard'),
        btnReaderPlayPause: document.getElementById('btnReaderPlayPause'),
        readerPlayIcon: document.getElementById('readerPlayIcon'),
        readerReadingProgressText: document.getElementById('readerReadingProgressText'),
        btnReaderLangToggle: document.getElementById('btnReaderLangToggle'),
        readerLangLabel: document.getElementById('readerLangLabel'),
        btnReaderModeToggle: document.getElementById('btnReaderModeToggle'),
        readerModeIcon: document.getElementById('readerModeIcon'),
        readerModeLabel: document.getElementById('readerModeLabel'),
        readerPageCounterText: document.getElementById('readerPageCounterText'),
        readerBookProgressText: document.getElementById('readerBookProgressText'),
        readerFullscreenIcon: document.getElementById('readerFullscreenIcon'),

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

// ── IndexedDB (v8) ──────────────────────────────────────────────────────────
function initDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('LuminaAudioStudioDB_v8', 1);
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
    if (existing.length === 0) {
        for (const b of DISCOVER_CLASSICS) {
            await saveBookToDB(b);
        }
    }
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
    speakEnglishSentence(text);
}

function testGeorgianVoicePreview() {
    const text = "გამარჯობა! მოგესალმებით ლუმინას ქართულ აუდიო და მთვარის წამკითხველში.";
    speakGeorgianSentence(text);
}

// ══════════════════════════════════════════════════════════════════════════
// ██ 1. TRUE PAGINATED MOON+ READER ENGINE (Pages, Gestures & Keyboards) ██
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

    // Check if requesting Georgian but not translated yet
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
    populateReaderChapterDropdown();
    updateReaderLangUI();
    paginateChapter();
    renderCurrentPage();
}

function closeReader() {
    readerActive = false;
    DOM.readerView.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function populateReaderChapterDropdown() {
    if (!DOM.readerChapterSelect || !readerBook) return;
    DOM.readerChapterSelect.innerHTML = '';

    readerBook.chapters.forEach((chap, idx) => {
        const opt = document.createElement('option');
        opt.value = chap.id;
        opt.textContent = `${idx + 1}. ${chap.title}`;
        if (String(chap.id) === String(readerChapterId)) opt.selected = true;
        DOM.readerChapterSelect.appendChild(opt);
    });
}

function onReaderChapterChange(targetChapId) {
    if (!readerBook) return;
    const matched = readerBook.chapters.find(c => String(c.id) === String(targetChapId));
    if (!matched) return;

    readerChapterId = matched.id;
    readerCurrentPage = 1;
    if (DOM.readerChapterSelect) DOM.readerChapterSelect.value = readerChapterId;

    paginateChapter();
    renderCurrentPage();

    if (isPlaying) {
        playChapterAudio(readerChapterId);
    }
}

function updateReaderLangUI() {
    if (!DOM.btnReaderLangToggle || !DOM.readerLangLabel) return;
    if (readerLang === 'ka') {
        DOM.readerLangLabel.textContent = 'ქართული';
        DOM.btnReaderLangToggle.classList.add('bg-georgian-gold/25', 'border-georgian-gold/50');
    } else {
        DOM.readerLangLabel.textContent = 'English';
        DOM.btnReaderLangToggle.classList.remove('bg-georgian-gold/25', 'border-georgian-gold/50');
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

function toggleReaderMode() {
    readerMode = readerMode === 'pages' ? 'scroll' : 'pages';
    if (DOM.readerModeIcon) DOM.readerModeIcon.textContent = readerMode === 'pages' ? 'auto_stories' : 'menu_book';
    if (DOM.readerModeLabel) DOM.readerModeLabel.textContent = readerMode === 'pages' ? 'Pages' : 'Scroll';
    renderCurrentPage();
}

// ── Dynamic Book Pagination Engine ─────────────────────────────────────────
function paginateChapter() {
    if (!readerBook) return;
    const chap = readerBook.chapters.find(c => String(c.id) === String(readerChapterId));
    if (!chap) return;

    let rawText = chap.text;
    if (readerLang === 'ka' && chap.text_ka) {
        rawText = chap.text_ka;
    }

    const sentences = splitIntoNaturalSentences(rawText);
    readerPages = [];
    readerSentenceToPageMap = {};

    const WORDS_PER_PAGE = 180; // Standard e-book density per page
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
    if (!readerBook || !DOM.readerContentArea) return;
    const chap = readerBook.chapters.find(c => String(c.id) === String(readerChapterId));
    if (!chap) return;

    DOM.readerChapterTitle.textContent = chap.title;

    const totalPages = readerPages.length;
    const isFirstPage = readerCurrentPage === 1;

    // Trigger page flip animation
    if (DOM.readerPageCard) {
        DOM.readerPageCard.classList.remove('page-flip-anim');
        void DOM.readerPageCard.offsetWidth; // Trigger reflow
        DOM.readerPageCard.classList.add('page-flip-anim');
    }

    if (DOM.readerScrollContainer) {
        DOM.readerScrollContainer.scrollTop = 0;
    }

    let html = '';

    if (readerMode === 'pages') {
        // PAGINATED MODE: Render only current page sentences
        const pageSentences = readerPages[readerCurrentPage - 1] || [];

        // Chapter Header (Only on Page 1)
        if (isFirstPage) {
            html += `
                <header class="mb-8 text-center border-b border-black/10 dark:border-white/10 pb-6 select-none">
                    <span class="text-xs font-label-caps font-bold tracking-widest uppercase opacity-75">✦ ${readerBook.title} ✦</span>
                    <h1 class="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-2 mb-3 tracking-tight ${readerLang === 'ka' ? 'font-georgian-sans' : 'font-cinzel'}">${chap.title}</h1>
                    <div class="flex items-center justify-center gap-3 text-xs opacity-75">
                        <span>${chap.word_count} words</span>
                        <span>•</span>
                        <span>~${formatTime(chap.estimated_duration_sec)} read</span>
                    </div>
                    <div class="mt-4 text-sm opacity-60">── ❖ ──</div>
                </header>
            `;
        }

        html += `<div class="space-y-6 ${readerFontFamily}" style="font-size: ${readerFontSize}px; line-height: 1.85;">`;

        let pBuffer = [];
        let isFirstParagraph = isFirstPage;

        pageSentences.forEach((item, idx) => {
            pBuffer.push(`<span class="reader-sentence" id="rsentence_${item.globalIndex}" onclick="onReaderSentenceClick(${item.globalIndex})">${item.text}</span> `);

            if (pBuffer.length >= 4 || idx === pageSentences.length - 1) {
                const dropCapClass = isFirstParagraph ? 'book-drop-cap' : '';
                html += `<p class="text-justify indent-4 ${dropCapClass}">${pBuffer.join('')}</p>`;
                pBuffer = [];
                isFirstParagraph = false;
            }
        });

        html += `</div>`;

        // Footer Ornament (Only on Last Page)
        if (readerCurrentPage === totalPages) {
            html += `
                <footer class="mt-12 pt-8 border-t border-black/10 dark:border-white/10 text-center opacity-60 text-xs select-none">
                    <p>── ❦ ──</p>
                    <p class="mt-2">End of ${chap.title}</p>
                </footer>
            `;
        }

        // Update Page Counters
        if (DOM.readerPageCounterText) {
            DOM.readerPageCounterText.textContent = `Page ${readerCurrentPage} of ${totalPages}`;
        }

    } else {
        // CONTINUOUS SCROLL MODE: Render all sentences
        html += `
            <header class="mb-8 text-center border-b border-black/10 dark:border-white/10 pb-6 select-none">
                <span class="text-xs font-label-caps font-bold tracking-widest uppercase opacity-75">✦ ${readerBook.title} ✦</span>
                <h1 class="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-2 mb-3 tracking-tight ${readerLang === 'ka' ? 'font-georgian-sans' : 'font-cinzel'}">${chap.title}</h1>
                <div class="mt-4 text-sm opacity-60">── ❖ ──</div>
            </header>
            <div class="space-y-6 ${readerFontFamily}" style="font-size: ${readerFontSize}px; line-height: 1.85;">
        `;

        let pBuffer = [];
        let isFirstParagraph = true;

        readerPages.forEach(p => {
            p.forEach(item => {
                pBuffer.push(`<span class="reader-sentence" id="rsentence_${item.globalIndex}" onclick="onReaderSentenceClick(${item.globalIndex})">${item.text}</span> `);
                if (pBuffer.length >= 4) {
                    const dropCapClass = isFirstParagraph ? 'book-drop-cap' : '';
                    html += `<p class="text-justify indent-4 ${dropCapClass}">${pBuffer.join('')}</p>`;
                    pBuffer = [];
                    isFirstParagraph = false;
                }
            });
        });

        if (pBuffer.length > 0) {
            html += `<p class="text-justify indent-4">${pBuffer.join('')}</p>`;
        }

        html += `
            </div>
            <footer class="mt-12 pt-8 border-t border-black/10 dark:border-white/10 text-center opacity-60 text-xs select-none">
                <p>── ❦ ──</p>
                <p class="mt-2">End of ${chap.title}</p>
            </footer>
        `;

        if (DOM.readerPageCounterText) {
            DOM.readerPageCounterText.textContent = `Continuous Scroll (${chap.word_count} words)`;
        }
    }

    DOM.readerContentArea.innerHTML = html;

    // Update overall book progress indicator
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

// ── Page Steppers ──────────────────────────────────────────────────────────
function readerNextPage() {
    if (!readerBook) return;
    const totalPages = readerPages.length;

    if (readerCurrentPage < totalPages) {
        readerCurrentPage++;
        renderCurrentPage();
    } else {
        // Transition to next chapter, page 1
        readerNextChapter();
    }
}

function readerPrevPage() {
    if (!readerBook) return;

    if (readerCurrentPage > 1) {
        readerCurrentPage--;
        renderCurrentPage();
    } else {
        // Transition to previous chapter
        const curIdx = readerBook.chapters.findIndex(c => String(c.id) === String(readerChapterId));
        if (curIdx > 0) {
            readerChapterId = readerBook.chapters[curIdx - 1].id;
            paginateChapter();
            readerCurrentPage = readerPages.length; // Jump to last page of prev chapter
            if (DOM.readerChapterSelect) DOM.readerChapterSelect.value = readerChapterId;
            renderCurrentPage();
            if (isPlaying) playChapterAudio(readerChapterId);
        }
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
    // Check if sentence is on a different page in paginated mode
    if (readerActive && readerMode === 'pages' && readerSentenceToPageMap[sentenceIdx] !== undefined) {
        const targetPage = readerSentenceToPageMap[sentenceIdx] + 1;
        if (targetPage !== readerCurrentPage) {
            readerCurrentPage = targetPage;
            renderCurrentPage();
        }
    }

    document.querySelectorAll('.reader-sentence.active-sentence').forEach(el => {
        el.classList.remove('active-sentence');
    });

    const targetEl = document.getElementById(`rsentence_${sentenceIdx}`);
    if (targetEl) {
        targetEl.classList.add('active-sentence');
        if (DOM.readerScrollContainer) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    if (DOM.readerReadingProgressText && sentenceQueue.length > 0) {
        DOM.readerReadingProgressText.textContent = `Sentence ${sentenceIdx + 1} / ${sentenceQueue.length}`;
    }
}

function setReaderTheme(theme) {
    readerTheme = theme;
    DOM.readerView.className = `reader-theme-${theme} active ${isZenMode ? 'zen-mode' : ''}`;
}

function changeReaderFontSize(delta) {
    readerFontSize = Math.max(14, Math.min(32, readerFontSize + delta));
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

function toggleZenMode() {
    isZenMode = !isZenMode;
    if (isZenMode) DOM.readerView.classList.add('zen-mode');
    else DOM.readerView.classList.remove('zen-mode');
}

// ── Full Keyboard & Touch Gestures Matrix ──────────────────────────────────
function setupKeyboardAndTouchControls() {
    // 1. Keyboard Navigation
    window.addEventListener('keydown', (e) => {
        if (!readerActive) return;
        // Don't intercept when typing in text inputs or modals
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
            case 'm':
            case 'M':
                e.preventDefault();
                toggleReaderMode();
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

    // 2. Touch Gestures for Mobile & Tablets
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

    // Ensure horizontal swipe is dominant and above 45px threshold
    if (Math.abs(diffX) > Math.abs(diffY) * 1.3 && Math.abs(diffX) > 45) {
        if (diffX < 0) {
            // Swiped Left -> Next Page
            readerNextPage();
        } else {
            // Swiped Right -> Prev Page
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

    // 1. MyMemory API (accurate, grammatical Georgian)
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
    } catch (e) {
        console.warn('MyMemory primary failed:', e);
    }

    // 2. Google GTX Single Fallback
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
    } catch (e) {
        console.warn('Google GTX fallback failed:', e);
    }

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
        alert('Translation paused. All progress up to this point has been saved.');
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
// ██ 3. HIGH-FIDELITY SPEECH ENGINE (With ElevenLabs Studio Integration) ██
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

    // Update UI Subtitles & Progress
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

    // Synchronize Moon Reader active sentence highlighting & page turning
    if (readerActive) {
        highlightReaderSentence(currentSentenceIndex);
    }

    // Dispatch audio speech
    if (elevenLabsEnabled && elevenLabsApiKey) {
        speakElevenLabsSentence(cleanSentence);
    } else if (currentLang === 'ka') {
        speakGeorgianSentence(cleanSentence);
    } else {
        speakEnglishSentence(cleanSentence);
    }
}

async function speakElevenLabsSentence(text) {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    stopElevenAudio();
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

        if (!res.ok) throw new Error(`ElevenLabs API returned status ${res.status}`);

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

        audio.onerror = (e) => {
            console.warn('ElevenLabs audio play error, falling back:', e);
            fallbackStandardSpeech(text);
        };

        await audio.play();

    } catch (err) {
        console.warn('ElevenLabs speech failed, using high-fidelity fallback:', err);
        fallbackStandardSpeech(text);
    }
}

function stopElevenAudio() {
    if (currentElevenAudio) {
        currentElevenAudio.pause();
        try { currentElevenAudio.src = ''; } catch(e) {}
        currentElevenAudio = null;
    }
}

function fallbackStandardSpeech(text) {
    if (currentLang === 'ka') speakGeorgianSentence(text);
    else speakEnglishSentence(text);
}

function speakEnglishSentence(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    stopElevenAudio();

    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const matched = voices.find(v => (v.voiceURI && v.voiceURI === selectedVoiceURI) || v.name === selectedVoiceURI);

    if (matched) {
        utter.voice = matched;
        utter.lang = matched.lang || 'en-US';
    } else {
        utter.lang = 'en-US';
    }

    utter.rate = currentGlobalSpeed;
    utter.pitch = currentPitch;

    utter.onend = () => {
        if (!isPlaying || isPaused) return;
        currentSentenceIndex++;
        if (utteranceTimeout) clearTimeout(utteranceTimeout);
        utteranceTimeout = setTimeout(() => {
            if (isPlaying && !isPaused) speakCurrentSentence();
        }, 260);
    };

    utter.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        currentSentenceIndex++;
        if (isPlaying && !isPaused) setTimeout(() => speakCurrentSentence(), 200);
    };

    window._activeUtterance = utter;
    window.speechSynthesis.speak(utter);
    updatePlayerUIState(true);
}

function speakGeorgianSentence(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    stopElevenAudio();

    const normalized = normalizeGeorgian(text);
    const voices = window.speechSynthesis.getVoices();

    const nativeKaVoice = voices.find(v => v.lang.startsWith('ka') || v.name.toLowerCase().includes('georgian'));

    const utter = new SpeechSynthesisUtterance();

    if (nativeKaVoice) {
        utter.text = normalized;
        utter.voice = nativeKaVoice;
        utter.lang = nativeKaVoice.lang;
    } else {
        const phoneticText = transliterateGeorgianToPhonetic(normalized);
        utter.text = phoneticText;

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

    utter.rate = currentGlobalSpeed * 0.95;
    utter.pitch = currentPitch;

    utter.onend = () => {
        if (!isPlaying || isPaused) return;
        currentSentenceIndex++;
        if (utteranceTimeout) clearTimeout(utteranceTimeout);
        utteranceTimeout = setTimeout(() => {
            if (isPlaying && !isPaused) speakCurrentSentence();
        }, 260);
    };

    utter.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        currentSentenceIndex++;
        if (isPlaying && !isPaused) setTimeout(() => speakCurrentSentence(), 200);
    };

    window._activeUtterance = utter;
    window.speechSynthesis.speak(utter);
    updatePlayerUIState(true);
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
        if (DOM.readerChapterSelect) DOM.readerChapterSelect.value = readerChapterId;
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
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (currentElevenAudio) currentElevenAudio.pause();
        stopTimer();
        updatePlayerUIState(false);
    } else if (isPlaying && isPaused) {
        isPaused = false;
        startTimer();
        if (currentElevenAudio) currentElevenAudio.play().catch(() => speakCurrentSentence());
        else speakCurrentSentence();
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
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    stopElevenAudio();
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
    const MAX_WORDS = 500;
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
            title: 'Full Audio Reading',
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
        const div = document.createElement('div');
        div.className = 'group relative cursor-pointer';
        div.onclick = () => selectBook(book.id, true);

        div.innerHTML = `
            <div class="aspect-[2/3] rounded-2xl overflow-hidden mb-3 relative glass-card p-1.5 ${isSelected ? 'border-primary-container ring-2 ring-primary-container/30 shadow-[0_0_25px_rgba(0,240,255,0.25)]' : ''}">
                <img src="${book.coverUrl}" class="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500 bg-surface-container">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl gap-2">
                    <button onclick="event.stopPropagation(); selectBook('${book.id}', true);" class="w-11 h-11 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform" title="Listen Now">
                        <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                    </button>
                    <button onclick="event.stopPropagation(); selectBook('${book.id}', false); openCurrentBookInReader();" class="w-11 h-11 bg-georgian-gold text-black rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform" title="Moon Reader">
                        <span class="material-symbols-outlined text-xl">menu_book</span>
                    </button>
                </div>
                ${hasGeorgian ? '<div class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-georgian-gold/90 text-[10px] font-bold text-black shadow-lg">🇬🇪 KA</div>' : ''}
                ${book.progressPct > 0 ? `<div class="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-md rounded-full h-1 overflow-hidden"><div class="h-full bg-primary-container" style="width: ${book.progressPct}%"></div></div>` : ''}
            </div>
            <h4 class="font-bold text-white text-sm truncate group-hover:text-primary-fixed transition-colors">${book.title}</h4>
            <div class="flex justify-between items-center mt-0.5">
                <p class="text-[11px] text-on-surface-variant truncate">${book.chapters.length} Chapters</p>
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
                <div class="aspect-[2/3] rounded-xl overflow-hidden mb-3.5 relative">
                    <img src="${book.coverUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-georgian-gold text-[10px] font-bold text-black shadow">🇬🇪 Ready</div>
                </div>
                <h4 class="font-bold text-white text-base truncate">${book.title}</h4>
                <p class="text-xs text-primary-fixed mt-0.5">${book.author}</p>
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

    // Update Hero UI
    DOM.heroCover.src = currentBook.coverUrl;
    DOM.heroTitle.textContent = currentBook.title;

    const hasKa = currentBook.translatedLangs && currentBook.translatedLangs.includes('ka');
    if (DOM.heroGeorgianBadge) {
        if (hasKa) DOM.heroGeorgianBadge.classList.remove('hidden');
        else DOM.heroGeorgianBadge.classList.add('hidden');
    }

    if (DOM.btnTranslateWholeBookText) {
        DOM.btnTranslateWholeBookText.textContent = hasKa ? "Re-translate Whole Book (Georgian)" : "Translate Whole Book to Georgian";
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

    // Show Chapters Drawer
    DOM.chaptersContainer.classList.remove('hidden');
    DOM.activeBookTitle.textContent = currentBook.title;
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
        div.className = `glass-panel rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${isSpeaking ? 'border-primary-container/60 bg-primary-container/10 shadow-[0_0_20px_rgba(0,240,255,0.15)]' : 'hover:bg-white/5'}`;

        div.innerHTML = `
            <div class="flex items-center gap-4 min-w-0 flex-grow">
                <div class="w-9 h-9 rounded-xl ${isSpeaking ? 'bg-primary-container text-on-primary-container' : 'bg-white/5 text-primary-fixed'} flex items-center justify-center font-bold text-sm font-mono flex-shrink-0">
                    ${idx + 1}
                </div>
                <div class="overflow-hidden">
                    <h4 class="font-semibold text-white text-sm sm:text-base truncate flex items-center gap-2">
                        ${chap.title}
                        ${chapHasKa ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-georgian-gold/20 text-georgian-gold border border-georgian-gold/30 font-bold">🇬🇪</span>' : ''}
                    </h4>
                    <p class="text-xs text-on-surface-variant mt-0.5">${chap.word_count} words • ~${formatTime(chap.estimated_duration_sec)}</p>
                </div>
            </div>

            <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button onclick="openReader('${currentBook.id}', ${chap.id}, currentLang)" class="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition" title="Read in Moon Reader">
                    <span class="material-symbols-outlined text-base text-georgian-gold">menu_book</span>
                    <span>Read</span>
                </button>
                <button onclick="playChapterAudio(${chap.id})" class="px-4 py-2 rounded-xl ${isSpeaking ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(0,240,255,0.5)]' : 'bg-white/10 text-white hover:bg-primary-container/20 hover:text-primary-fixed'} text-xs font-bold transition flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1;">${isSpeaking ? 'pause' : 'play_arrow'}</span>
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
