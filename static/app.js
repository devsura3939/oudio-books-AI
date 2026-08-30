// ==========================================================================
// LUMINA AUDIO - ADVANCED AI SPEECH & TRANSLATION ENGINE
// ==========================================================================

// --- App State ---
let db = null;
let currentBook = null;
let currentPlayingChapterId = null;
let isPlaying = false;
let isPaused = false;
let currentGlobalSpeed = 1.0;
let currentPitch = 1.0;
let currentLang = 'en'; // 'en', 'ka', 'es', 'de', 'fr'
let selectedVoiceURI = '';

let sentenceQueue = [];
let currentSentenceIndex = 0;
let utteranceTimeout = null;
let secondsElapsed = 0;
let timerInterval = null;
let currentUser = null;
let translationCache = {}; // Cache translated sentences

// Pre-loaded Classics for Instant Testing
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
                text: "Most of us have two lives: the life we live, and the unlived life within us. Between the two stands Resistance. Have you ever brought home a treadmill and let it gather dust in the attic? Have you ever quit a diet or a creative project? If you have, you know what Resistance is.",
                word_count: 58,
                estimated_duration_sec: 25
            },
            {
                id: 2,
                title: 'Chapter 2: Overcoming The Enemy',
                text: "Resistance is invisible and cannot be touched, but it can be felt. It is an energetic field radiating from potential work whose only aim is to distract us.",
                word_count: 32,
                estimated_duration_sec: 15
            }
        ],
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
                text: "The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected.",
                word_count: 42,
                estimated_duration_sec: 18
            }
        ],
        dateAdded: new Date().toISOString(),
        progressPct: 0
    }
];

// --- DOM Cache ---
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

        chaptersContainer: document.getElementById('chaptersContainer'),
        chaptersList: document.getElementById('chaptersList'),
        activeBookTitle: document.getElementById('activeBookTitle'),
        btnDownloadAllZip: document.getElementById('btnDownloadAllZip'),

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

        searchInput: document.getElementById('searchInput'),
        topVoiceBadge: document.getElementById('topVoiceBadge'),
        btnTopGeorgianToggle: document.getElementById('btnTopGeorgianToggle'),
        topGeorgianBadge: document.getElementById('topGeorgianBadge'),
        topProfileBtn: document.getElementById('topProfileBtn'),
        topAvatarBadge: document.getElementById('topAvatarBadge'),
        sideNavUserName: document.getElementById('sideNavUserName'),
        userNavSection: document.getElementById('userNavSection'),

        // Voice Modal
        voiceModalSelect: document.getElementById('voiceModalSelect'),
        optgroupMale: document.getElementById('optgroupMale'),
        optgroupFemale: document.getElementById('optgroupFemale'),
        optgroupOther: document.getElementById('optgroupOther'),
        modalSpeedSlider: document.getElementById('modalSpeedSlider'),
        modalSpeedVal: document.getElementById('modalSpeedVal'),
        modalPitchSlider: document.getElementById('modalPitchSlider'),
        modalPitchVal: document.getElementById('modalPitchVal')
    };
}

// --- App Initialization ---
async function init() {
    cacheDOM();
    await initDB();
    setupEventListeners();
    checkAuthState();
    
    // Populate voices when loaded
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

// --- Database (IndexedDB) ---
function initDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('LuminaAudioStudioDB_v4', 1);
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

// --- Navigation & Modals ---
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

// --- Authentication ---
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

// --- Voice Management & Accurate Categorization ---
function populateVoiceList() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    if (DOM.optgroupMale) DOM.optgroupMale.innerHTML = '';
    if (DOM.optgroupFemale) DOM.optgroupFemale.innerHTML = '';
    if (DOM.optgroupOther) DOM.optgroupOther.innerHTML = '';

    const savedVoice = localStorage.getItem('lumina_selected_voice_uri');

    voices.forEach((v) => {
        const option = document.createElement('option');
        option.value = v.voiceURI || v.name;
        option.textContent = `${v.name} (${v.lang})`;

        const nameLower = v.name.toLowerCase();
        const isMale = nameLower.includes('male') || nameLower.includes('david') || nameLower.includes('mark') || nameLower.includes('george') || nameLower.includes('guy') || nameLower.includes('christopher') || nameLower.includes('ryan');
        const isFemale = nameLower.includes('female') || nameLower.includes('zira') || nameLower.includes('jenny') || nameLower.includes('susan') || nameLower.includes('aria') || nameLower.includes('sonia');
        
        if (isMale) {
            if (DOM.optgroupMale) DOM.optgroupMale.appendChild(option);
        } else if (isFemale) {
            if (DOM.optgroupFemale) DOM.optgroupFemale.appendChild(option);
        } else {
            if (DOM.optgroupOther) DOM.optgroupOther.appendChild(option);
        }
    });

    // Auto-select preferred male voice if nothing saved
    if (savedVoice) {
        selectedVoiceURI = savedVoice;
    } else {
        const defaultMale = voices.find(v => v.name.toLowerCase().includes('david') || (v.name.toLowerCase().includes('male') && v.lang.startsWith('en')));
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
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    const matched = voices.find(v => (v.voiceURI && v.voiceURI === selectedVoiceURI) || v.name === selectedVoiceURI);
    
    if (matched) {
        const isMale = matched.name.toLowerCase().includes('male') || matched.name.toLowerCase().includes('david') || matched.name.toLowerCase().includes('mark') || matched.name.toLowerCase().includes('ryan');
        DOM.topVoiceBadge.textContent = `Narrator: ${isMale ? '👨' : '👩'} ${matched.name.split(' - ')[0]}`;
    } else {
        DOM.topVoiceBadge.textContent = `Narrator: 🎙️ Default Studio`;
    }
}

function testVoicePreview() {
    const text = currentLang === 'ka' 
        ? "გამარჯობა, ეს არის ლუმინას ქართული აუდიო წამკითხველი."
        : "Hello, this is Lumina Audio Studio. Enjoy your high-fidelity listening experience.";
    
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const matched = voices.find(v => (v.voiceURI && v.voiceURI === selectedVoiceURI) || v.name === selectedVoiceURI);
        if (matched) utter.voice = matched;
        utter.rate = currentGlobalSpeed;
        utter.pitch = currentPitch;
        utter.lang = currentLang === 'ka' ? 'ka-GE' : (matched ? matched.lang : 'en-US');
        window.speechSynthesis.speak(utter);
    }
}

// --- Translation Engine (Authentic Georgian & Multilingual) ---
async function translateText(text, targetLang) {
    if (!targetLang || targetLang === 'en') return text;
    
    const cacheKey = `${targetLang}_${text}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];

    try {
        // MyMemory Professional Translation API
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data && data.responseData && data.responseData.translatedText) {
                const translated = data.responseData.translatedText;
                translationCache[cacheKey] = translated;
                return translated;
            }
        }
    } catch (e) {
        console.warn('Primary translation API error, trying backup:', e);
    }

    try {
        // Backup Google GTX single translate
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const gRes = await fetch(gUrl);
        if (gRes.ok) {
            const gData = await gRes.json();
            if (gData && gData[0]) {
                const translated = gData[0].map(item => item[0]).join('');
                translationCache[cacheKey] = translated;
                return translated;
            }
        }
    } catch (gErr) {
        console.warn('Backup translation error:', gErr);
    }

    return text;
}

function setLanguage(lang) {
    currentLang = lang;
    ['en', 'ka', 'es', 'de'].forEach(l => {
        const btn = document.getElementById(`langBtn_${l}`);
        if (btn) {
            if (l === lang) {
                btn.className = 'p-2.5 rounded-xl border border-primary-container bg-primary-container/20 text-white text-xs font-bold transition shadow-sm';
            } else {
                btn.className = 'p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition';
            }
        }
    });

    if (DOM.topGeorgianBadge) {
        if (lang === 'ka') {
            DOM.topGeorgianBadge.textContent = 'Georgian: ON 🇬🇪';
            DOM.btnTopGeorgianToggle.classList.add('border-primary-container', 'bg-primary-container/20');
        } else {
            DOM.topGeorgianBadge.textContent = 'Translate: OFF';
            DOM.btnTopGeorgianToggle.classList.remove('border-primary-container', 'bg-primary-container/20');
        }
    }

    // If currently playing, update subtitle & restart sentence smoothly
    if (isPlaying && !isPaused) {
        speakCurrentSentence();
    }
}

function toggleGeorgianMode() {
    if (currentLang === 'ka') {
        setLanguage('en');
    } else {
        setLanguage('ka');
    }
}

// --- PDF Processing & Cover Generation ---
function cleanBookTitle(rawName) {
    return rawName
        .replace(/\.pdf$/i, '')
        .replace(/[_\-]+/g, ' ')
        .replace(/\b(fastpencil|pbo|edition|version|full|book|pdf|download|epub|compressed|ocr)\b/gi, '')
        .trim();
}

async function fetchBookCoverArt(title) {
    const cleaned = cleanBookTitle(title);
    
    // 1. Google Books API
    try {
        const gRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(cleaned)}&maxResults=1`);
        if (gRes.ok) {
            const gData = await gRes.json();
            if (gData.items && gData.items.length > 0 && gData.items[0].volumeInfo?.imageLinks) {
                const links = gData.items[0].volumeInfo.imageLinks;
                const thumb = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;
                if (thumb) return thumb.replace('http:', 'https:');
            }
        }
    } catch (e) {
        console.warn('Google Books failed:', e);
    }

    // 2. Open Library Search
    try {
        const oRes = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(cleaned)}&limit=1`);
        if (oRes.ok) {
            const oData = await oRes.json();
            if (oData.docs && oData.docs.length > 0 && oData.docs[0].cover_i) {
                return `https://covers.openlibrary.org/b/id/${oData.docs[0].cover_i}-L.jpg`;
            }
        }
    } catch (e) {
        console.warn('Open Library failed:', e);
    }

    // 3. Fallback: High-End Holographic Cyber Studio Canvas Cover
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

    // Glowing Neon Orbs
    ctx.save();
    ctx.filter = 'blur(40px)';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(90, 130, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(220, 184, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(310, 470, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Geometric Grid Accent
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 40; i < 400; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 600); ctx.stroke();
    }
    for (let j = 40; j < 600; j += 40) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(400, j); ctx.stroke();
    }

    // Glass Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 360, 560);

    // Top Badge
    ctx.fillStyle = '#00f0ff';
    ctx.font = '600 12px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LUMINA AI AUDIOBOOK', 200, 70);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Inter, sans-serif';
    const words = title.split(' ');
    let line = '';
    let y = 260;
    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > 300 && n > 0) {
            ctx.fillText(line.trim(), 200, y);
            line = words[n] + ' ';
            y += 34;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), 200, y);

    // Bottom Badge
    ctx.fillStyle = 'rgba(220, 184, 255, 0.85)';
    ctx.font = '500 14px Inter, sans-serif';
    ctx.fillText('Studio Narration Edition', 200, 520);

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
            const strings = content.items.map(item => item.str);
            fullText += strings.join(' ') + '\n\n';
            
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
            word_count: currentChunk.length,
            estimated_duration_sec: Math.round((currentChunk.length / 140) * 60)
        });
    }

    if (chapters.length === 0) {
        chapters.push({
            id: 1,
            title: 'Full Audio Reading',
            text: text.substring(0, 4000),
            word_count: 500,
            estimated_duration_sec: 180
        });
    }

    return chapters;
}

function splitIntoNaturalSentences(text) {
    const regex = /[^.!?]+[.!?]+["']?|[^.!?]+$/g;
    const matches = text.match(regex);
    return matches ? matches.map(s => s.trim()).filter(s => s.length > 0) : [text];
}

// --- Bulletproof Speech Engine ---
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
    
    // 1. Live Translation
    let spokenText = cleanSentence;
    if (currentLang !== 'en') {
        if (DOM.heroSubtitleHeader) DOM.heroSubtitleHeader.textContent = `Translating to ${currentLang.toUpperCase()}...`;
        spokenText = await translateText(cleanSentence, currentLang);
    }

    // 2. Update Live Subtitle on Hero
    if (DOM.heroSubtitleHeader) DOM.heroSubtitleHeader.textContent = currentLang === 'ka' ? "ქართული თარგმანი (Georgian)" : "Current Narration";
    if (DOM.heroLiveSubtitle) DOM.heroLiveSubtitle.textContent = spokenText;

    // 3. Update Progress
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

    // 4. Synthesize with Web Speech API with explicit voice & language
    if (!('speechSynthesis' in window)) {
        alert('Your browser does not support Speech Synthesis.');
        return;
    }

    // Cancel previous stuck utterance
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(spokenText);
    const voices = window.speechSynthesis.getVoices();
    
    // Bind exact chosen voice
    let matchedVoice = voices.find(v => (v.voiceURI && v.voiceURI === selectedVoiceURI) || v.name === selectedVoiceURI);
    
    if (currentLang === 'ka') {
        const kaVoice = voices.find(v => v.lang.startsWith('ka') || v.name.toLowerCase().includes('georgian'));
        if (kaVoice) {
            utter.voice = kaVoice;
            utter.lang = kaVoice.lang;
        } else {
            utter.lang = 'ka-GE';
        }
    } else if (matchedVoice) {
        utter.voice = matchedVoice;
        utter.lang = matchedVoice.lang || 'en-US';
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
        }, 320); // Breath gap
    };

    utter.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        console.warn('Utterance error:', e);
        currentSentenceIndex++;
        if (isPlaying && !isPaused) {
            setTimeout(() => speakCurrentSentence(), 200);
        }
    };

    // Garbage collector safety lock
    window._activeUtterance = utter;
    window.speechSynthesis.speak(utter);
    updatePlayerUIState(true);
}

function playChapterAudio(chapId) {
    if (!currentBook) return;
    const chap = currentBook.chapters.find(c => c.id === chapId);
    if (!chap) return;

    if (currentPlayingChapterId === chapId && isPlaying) {
        togglePlayPause();
        return;
    }

    currentPlayingChapterId = chapId;
    sentenceQueue = splitIntoNaturalSentences(chap.text);
    currentSentenceIndex = 0;
    secondsElapsed = 0;
    isPlaying = true;
    isPaused = false;

    // Reveal Player Dock
    DOM.playerDock.classList.remove('translate-y-12', 'opacity-0', 'pointer-events-none');
    DOM.playerDock.classList.add('translate-y-0', 'opacity-100');
    
    DOM.dockCover.src = currentBook.coverUrl;
    DOM.dockTitle.textContent = chap.title;
    DOM.dockSubtitle.textContent = currentBook.title;
    if (DOM.playerTotalTime) DOM.playerTotalTime.textContent = formatTime(chap.estimated_duration_sec);

    startTimer();
    speakCurrentSentence();
    renderChaptersList();
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
        stopTimer();
        updatePlayerUIState(false);
    } else if (isPlaying && isPaused) {
        isPaused = false;
        startTimer();
        speakCurrentSentence();
        updatePlayerUIState(true);
    } else {
        playChapterAudio(currentPlayingChapterId);
    }
}

function updatePlayerUIState(speaking) {
    if (DOM.dockPlayIcon) {
        DOM.dockPlayIcon.textContent = speaking ? 'pause' : 'play_arrow';
    }
    if (DOM.heroPlayIcon) {
        DOM.heroPlayIcon.textContent = speaking ? 'pause' : 'play_arrow';
    }
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
    stopTimer();
    updatePlayerUIState(false);
}

function playNextChapter() {
    if (!currentBook) return;
    const currentIndex = currentBook.chapters.findIndex(c => c.id === currentPlayingChapterId);
    if (currentIndex >= 0 && currentIndex < currentBook.chapters.length - 1) {
        playChapterAudio(currentBook.chapters[currentIndex + 1].id);
    }
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
}

// --- UI Rendering ---
async function renderDigitalShelf(filterText = '') {
    const books = await getAllBooks();
    DOM.booksGrid.innerHTML = '';

    const filtered = filterText ? books.filter(b => b.title.toLowerCase().includes(filterText.toLowerCase())) : books;

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
        const isSelected = currentBook && currentBook.id === book.id;
        const div = document.createElement('div');
        div.className = 'group relative cursor-pointer';
        div.onclick = () => selectBook(book.id, true);
        
        div.innerHTML = `
            <div class="aspect-[2/3] rounded-2xl overflow-hidden mb-3 relative glass-card p-1.5 ${isSelected ? 'border-primary-container ring-2 ring-primary-container/30 shadow-[0_0_25px_rgba(0,240,255,0.25)]' : ''}">
                <img src="${book.coverUrl}" class="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500 bg-surface-container">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                    <button class="w-12 h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.6)] transform group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                    </button>
                </div>
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
                </div>
                <h4 class="font-bold text-white text-base truncate">${book.title}</h4>
                <p class="text-xs text-primary-fixed mt-0.5">${book.author}</p>
            </div>
            <button class="mt-4 w-full py-2.5 rounded-xl bg-white/5 group-hover:bg-primary-container group-hover:text-on-primary-container text-white text-xs font-semibold flex items-center justify-center gap-2 transition">
                <span class="material-symbols-outlined text-base">headphones</span>
                Listen Now
            </button>
        `;
        DOM.discoverGrid.appendChild(div);
    });
}

async function selectBook(bookId, autoPlayFirst = false) {
    const books = await getAllBooks();
    currentBook = books.find(b => b.id === bookId);
    if (!currentBook) return;

    // Update Hero UI
    DOM.heroCover.src = currentBook.coverUrl;
    DOM.heroTitle.textContent = currentBook.title;
    
    const lastChap = currentBook.chapters.find(c => c.id === currentBook.lastPlayedChapterId) || currentBook.chapters[0];
    DOM.heroLiveSubtitle.textContent = `Ready to play ${lastChap.title}`;
    
    const pct = currentBook.progressPct || 0;
    DOM.heroProgressText.textContent = `${pct}% Completed`;
    DOM.heroProgressBarInner.style.width = `${pct}%`;
    DOM.heroProgressCircle.style.strokeDashoffset = 289 - (289 * pct / 100);

    DOM.heroPlayBtn.onclick = () => playChapterAudio(lastChap.id);

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
        if (currentBook && currentBook.id === bookId) {
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
        const isCurrent = currentPlayingChapterId === chap.id;
        const isSpeaking = isCurrent && isPlaying && !isPaused;

        const div = document.createElement('div');
        div.className = `glass-panel rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${isSpeaking ? 'border-primary-container/60 bg-primary-container/10 shadow-[0_0_20px_rgba(0,240,255,0.15)]' : 'hover:bg-white/5'}`;

        div.innerHTML = `
            <div class="flex items-center gap-4 min-w-0 flex-grow">
                <div class="w-9 h-9 rounded-xl ${isSpeaking ? 'bg-primary-container text-on-primary-container' : 'bg-white/5 text-primary-fixed'} flex items-center justify-center font-bold text-sm font-mono flex-shrink-0">
                    ${idx + 1}
                </div>
                <div class="overflow-hidden">
                    <h4 class="font-semibold text-white text-sm sm:text-base truncate">${chap.title}</h4>
                    <p class="text-xs text-on-surface-variant mt-0.5">${chap.word_count} words • ~${formatTime(chap.estimated_duration_sec)}</p>
                </div>
            </div>

            <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
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

// --- Event Listeners Binding ---
function setupEventListeners() {
    // Nav Upload Button
    const btnNavUpload = document.getElementById('btnNavUpload');
    if (btnNavUpload) {
        btnNavUpload.addEventListener('click', () => openModal('uploadModal'));
    }

    // Drag & Drop
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

    // Search Filtering
    if (DOM.searchInput) {
        DOM.searchInput.addEventListener('input', (e) => {
            renderDigitalShelf(e.target.value);
        });
    }

    // Playback Controls
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

    // Progress Bar Scrubbing
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

    // Voice Modal Listeners
    if (DOM.voiceModalSelect) {
        DOM.voiceModalSelect.addEventListener('change', (e) => {
            selectedVoiceURI = e.target.value;
            localStorage.setItem('lumina_selected_voice_uri', selectedVoiceURI);
            updateTopVoiceBadge();
            if (isPlaying && !isPaused) speakCurrentSentence();
        });
    }

    if (DOM.modalSpeedSlider) {
        DOM.modalSpeedSlider.addEventListener('input', (e) => {
            currentGlobalSpeed = parseFloat(e.target.value);
            if (DOM.modalSpeedVal) DOM.modalSpeedVal.textContent = `${currentGlobalSpeed.toFixed(2)}x`;
            if (DOM.btnDockSpeed) DOM.btnDockSpeed.textContent = `${currentGlobalSpeed.toFixed(2).replace(/\.00$/, '')}x`;
        });
    }

    if (DOM.modalPitchSlider) {
        DOM.modalPitchSlider.addEventListener('input', (e) => {
            currentPitch = Math.max(0.5, Math.min(1.8, 1 + parseInt(e.target.value) / 20));
            if (DOM.modalPitchVal) DOM.modalPitchVal.textContent = e.target.value;
        });
    }

    // Auth Buttons
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
}

// Start App
document.addEventListener('DOMContentLoaded', init);
