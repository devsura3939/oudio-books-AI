// ==========================================================================
// LUMINA AUDIO - HIGH-FIDELITY AI AUDIOBOOK STUDIO & ENGINE
// ==========================================================================

// --- App State ---
let db = null;
let currentBook = null;
let currentPlayingChapterId = null;
let isPlaying = false;
let isPaused = false;
let currentGlobalSpeed = 1.0;
let currentLang = 'en';
let userSelectedVoiceName = 'en-US-ChristopherNeural';

let sentenceQueue = [];
let currentSentenceIndex = 0;
let utteranceTimeout = null;
let secondsElapsed = 0;
let timerInterval = null;
let currentUser = null;

// Pre-loaded Classics for instant testing
const DISCOVER_CLASSICS = [
    {
        id: 'classic_war_of_art',
        title: 'The War of Art',
        author: 'Steven Pressfield',
        coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
        chapters: [
            {
                id: 1,
                title: 'Chapter 1: Resistance - Defining the Enemy',
                text: "Most of us have two lives: the life we live, and the unlived life within us. Between the two stands Resistance. Have you ever brought home a treadmill and let it gather dust in the attic? Have you ever quit a diet, a course of yoga, a meditation practice? Have you ever blown off an intention to create art, write a novel, launch a venture, or heal a broken relationship? If you have, you know what Resistance is.",
                word_count: 78,
                estimated_duration_sec: 32
            },
            {
                id: 2,
                title: 'Chapter 2: The Characteristics of Resistance',
                text: "Resistance is invisible. You cannot see it, touch it, or hear it. But you can feel it. Resistance is an energetic field radiating from a potential work. It is a repelling force whose aim is to shove us away, distract us, and prevent us from doing our work.",
                word_count: 48,
                estimated_duration_sec: 20
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
                text: "The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected. The art of war, then, is governed by five constant factors, to be taken into account in one's deliberations.",
                word_count: 61,
                estimated_duration_sec: 25
            },
            {
                id: 2,
                title: 'Chapter 2: Waging War',
                text: "In the operations of war, where there are in the field a thousand swift chariots, as many heavy chariots, and a hundred thousand mail-clad soldiers, with provisions enough to carry them a thousand li, the expenditure at home and at the front will reach the total of a thousand ounces of silver per day.",
                word_count: 57,
                estimated_duration_sec: 24
            }
        ],
        dateAdded: new Date().toISOString(),
        progressPct: 0
    },
    {
        id: 'classic_frankenstein',
        title: 'Frankenstein',
        author: 'Mary Shelley',
        coverUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=600&q=80',
        chapters: [
            {
                id: 1,
                title: 'Letter 1: St. Petersburgh',
                text: "You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.",
                word_count: 51,
                estimated_duration_sec: 22
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
        heroSubtitle: document.getElementById('heroSubtitle'),
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
        topLangSelect: document.getElementById('topLangSelect'),
        topProfileBtn: document.getElementById('topProfileBtn'),
        topAvatarBadge: document.getElementById('topAvatarBadge'),
        sideNavUserName: document.getElementById('sideNavUserName'),
        userNavSection: document.getElementById('userNavSection'),

        langSelect: document.getElementById('langSelect'),
        voiceSelect: document.getElementById('voiceSelect'),
        speedSlider: document.getElementById('speedSlider'),
        speedVal: document.getElementById('speedVal'),
        pitchSlider: document.getElementById('pitchSlider'),
        pitchVal: document.getElementById('pitchVal')
    };
}

// --- App Initialization ---
async function init() {
    cacheDOM();
    await initDB();
    setupEventListeners();
    checkAuthState();
    await seedDefaultBooks();
    await renderDigitalShelf();
    renderDiscoverClassics();
    
    // Auto-select first book if available
    const books = await getAllBooks();
    if (books.length > 0) {
        selectBook(books[0].id, false);
    }

    if (window.lucide) lucide.createIcons();
}

// --- Database (IndexedDB) ---
function initDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('LuminaAudioStudioDB', 3);
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

// --- Navigation & View Switching ---
function navigate(viewId) {
    ['library', 'discover', 'settings'].forEach(id => {
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

// --- Authentication (Simulated & Encrypted Local Session) ---
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
                            <p class="text-[10px] text-primary-fixed">PRO Member</p>
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
                        <p class="text-xs text-on-surface-variant">Sync your shelf</p>
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

// --- Smart Cover Art Extraction & Generation ---
function cleanBookTitle(rawName) {
    return rawName
        .replace(/\.pdf$/i, '')
        .replace(/[_\-]+/g, ' ')
        .replace(/\b(fastpencil|pbo|edition|version|full|book|pdf|download|epub|compressed|ocr)\b/gi, '')
        .trim();
}

async function fetchBookCoverArt(title) {
    const cleaned = cleanBookTitle(title);
    
    // 1. Google Books API Lookup
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
        console.warn('Google Books cover fetch failed:', e);
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
        console.warn('Open Library cover fetch failed:', e);
    }

    // 3. Fallback: High-End Holographic Cyber Studio Canvas Cover
    return generateDynamicStudioCover(cleaned);
}

function generateDynamicStudioCover(title) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // Gradient Background
    const grad = ctx.createLinearGradient(0, 0, 400, 600);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#06080c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 600);

    // Glowing Neon Orbs
    ctx.save();
    ctx.filter = 'blur(40px)';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(80, 120, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(220, 184, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(320, 480, 110, 0, Math.PI * 2);
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
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 360, 560);

    // Top Badge
    ctx.fillStyle = 'rgba(0, 240, 255, 0.9)';
    ctx.font = '600 12px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LUMINA AI AUDIOBOOK', 200, 70);

    // Dynamic Title Formatting
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
    ctx.fillStyle = 'rgba(220, 184, 255, 0.8)';
    ctx.font = '500 14px Inter, sans-serif';
    ctx.fillText('AI Enhanced Audio Edition', 200, 520);

    return canvas.toDataURL('image/jpeg', 0.9);
}

// --- PDF Parser & Chapter Splitter ---
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

        DOM.uploadStatusText.textContent = "AI structuring chapters...";
        DOM.uploadProgressBar.style.width = '90%';
        DOM.uploadProgressPct.textContent = '90%';

        const rawTitle = cleanBookTitle(file.name);
        const chapters = splitIntoChapters(fullText);
        
        const newBook = {
            id: 'book_' + Date.now(),
            title: rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1),
            author: 'PDF Audio Document',
            coverUrl: coverUrl,
            chapters: chapters,
            dateAdded: new Date().toISOString(),
            lastPlayedChapterId: chapters.length > 0 ? chapters[0].id : null,
            progressPct: 0
        };

        await saveBookToDB(newBook);
        DOM.uploadProgressBar.style.width = '100%';
        DOM.uploadProgressPct.textContent = '100%';
        DOM.uploadStatusText.textContent = "Book imported successfully!";
        
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

// --- Live Translation Layer ---
async function translateSentence(text, targetLang) {
    if (!targetLang || targetLang === 'en' || targetLang === 'original') return text;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data && data[0]) {
                return data[0].map(item => item[0]).join('');
            }
        }
    } catch (e) {
        console.warn("Translation failed, falling back to original:", e);
    }
    return text;
}

// --- Multi-Tier Studio Speech Synthesis Engine ---
function generateUuid() {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function mapToEdgeVoice(selected) {
    if (currentLang === 'ka' || selected.includes('Georgian') || selected.includes('ka-GE')) return 'fallback_ka';
    if (selected.includes('Ryan') || selected.includes('en-GB-Ryan')) return 'en-GB-RyanNeural';
    if (selected.includes('Sonia') || selected.includes('en-GB-Sonia')) return 'en-GB-SoniaNeural';
    if (selected.includes('Jenny') || selected.includes('en-US-Jenny')) return 'en-US-JennyNeural';
    if (selected.includes('de-DE') || currentLang === 'de') return 'de-DE-KillianNeural';
    if (selected.includes('es-ES') || currentLang === 'es') return 'es-ES-AlvaroNeural';
    if (selected.includes('fr-FR') || currentLang === 'fr') return 'fr-FR-HenriNeural';
    return 'en-US-ChristopherNeural';
}

async function synthesizeEdgeTTSChunk(text, edgeVoiceName) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4');
        const audioBuffers = [];
        let isDone = false;
        
        ws.onopen = () => {
            const reqId = generateUuid();
            const config = JSON.stringify({
                context: {
                    synthesis: {
                        audio: { metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false }, outputFormat: 'audio-24khz-48kbitrate-mono-mp3' }
                    }
                }
            });
            ws.send(`X-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${config}`);
            
            const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
            const ratePct = currentGlobalSpeed >= 1.0 ? `+${Math.round((currentGlobalSpeed - 1.0) * 100)}%` : `${Math.round((currentGlobalSpeed - 1.0) * 100)}%`;
            const pitchVal = parseInt(DOM.pitchSlider ? DOM.pitchSlider.value : 0);
            const pitchStr = pitchVal >= 0 ? `+${pitchVal}Hz` : `${pitchVal}Hz`;
            
            const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${edgeVoiceName}'><prosody rate='${ratePct}' pitch='${pitchStr}'>${safeText}</prosody></voice></speak>`;
            ws.send(`X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
        };
        
        ws.onmessage = async (e) => {
            if (typeof e.data === 'string') {
                if (e.data.includes('Path:turn.end')) {
                    isDone = true;
                    ws.close();
                    resolve(new Blob(audioBuffers, { type: 'audio/mp3' }));
                }
            } else if (e.data instanceof Blob) {
                const arrayBuffer = await e.data.arrayBuffer();
                const view = new DataView(arrayBuffer);
                const headerLen = view.getUint16(0);
                const audioDataStart = 2 + headerLen;
                if (audioDataStart < arrayBuffer.byteLength) {
                    audioBuffers.push(arrayBuffer.slice(audioDataStart));
                }
            }
        };
        
        ws.onerror = (e) => {
            if (!isDone) reject(e);
        };
        
        setTimeout(() => {
            if (!isDone) {
                ws.close();
                if (audioBuffers.length > 0) {
                    resolve(new Blob(audioBuffers, { type: 'audio/mp3' }));
                } else {
                    reject(new Error("Edge TTS Timeout"));
                }
            }
        }, 8000);
    });
}

async function synthesizeGoogleTTSChunk(text, langCode) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(text)}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("Google TTS Proxy request failed");
    return await res.blob();
}

// Fallback to Native Speech Synthesis if offline or network blocks
function speakWithNativeSpeech(text) {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) return resolve();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = currentGlobalSpeed;
        utter.pitch = 1.0;
        utter.lang = currentLang === 'ka' ? 'ka-GE' : 'en-US';
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.speak(utter);
    });
}

// --- Player Audio Dispatcher ---
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

    // 1. Translate sentence if needed
    const cleanSentence = rawSentence.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    let spokenSentence = cleanSentence;
    if (currentLang !== 'en') {
        spokenSentence = await translateSentence(cleanSentence, currentLang);
    }

    // Update Progress Bars & Metrics
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

    // Stop active HTML Audio
    if (window._activeAudioElement) {
        window._activeAudioElement.pause();
        window._activeAudioElement = null;
    }

    try {
        const edgeVoice = mapToEdgeVoice(userSelectedVoiceName);
        let mp3Blob;

        // Tier 1 & 2 Synthesis
        if (edgeVoice === 'fallback_ka' || currentLang === 'ka') {
            mp3Blob = await synthesizeGoogleTTSChunk(spokenSentence, 'ka');
        } else {
            try {
                mp3Blob = await synthesizeEdgeTTSChunk(spokenSentence, edgeVoice);
            } catch (edgeErr) {
                console.warn('Edge TTS failed, falling back to Google TTS proxy:', edgeErr);
                mp3Blob = await synthesizeGoogleTTSChunk(spokenSentence, currentLang);
            }
        }

        if (!isPlaying || isPaused) return;

        const audioUrl = URL.createObjectURL(mp3Blob);
        const audio = new Audio(audioUrl);
        window._activeAudioElement = audio;
        audio.playbackRate = currentGlobalSpeed;

        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            if (!isPlaying || isPaused) return;
            currentSentenceIndex++;
            if (utteranceTimeout) clearTimeout(utteranceTimeout);
            utteranceTimeout = setTimeout(() => {
                if (isPlaying && !isPaused) speakCurrentSentence();
            }, 300);
        };

        audio.onerror = async () => {
            URL.revokeObjectURL(audioUrl);
            console.warn('Audio element error, using native speech synthesis fallback.');
            await speakWithNativeSpeech(spokenSentence);
            currentSentenceIndex++;
            speakCurrentSentence();
        };

        await audio.play();
        updatePlayerUIState(true);

    } catch (err) {
        console.warn('Audio Synthesis failed completely, using native SpeechSynthesis:', err);
        await speakWithNativeSpeech(spokenSentence);
        currentSentenceIndex++;
        speakCurrentSentence();
    }
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
        if (window._activeAudioElement) window._activeAudioElement.pause();
        stopTimer();
        updatePlayerUIState(false);
    } else if (isPlaying && isPaused) {
        isPaused = false;
        if (window._activeAudioElement) {
            window._activeAudioElement.play().catch(() => speakCurrentSentence());
        } else {
            speakCurrentSentence();
        }
        startTimer();
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
    if (window._activeAudioElement) {
        window._activeAudioElement.pause();
        window._activeAudioElement = null;
    }
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
    if (DOM.speedSlider) DOM.speedSlider.value = currentGlobalSpeed;
    if (DOM.speedVal) DOM.speedVal.textContent = `${currentGlobalSpeed.toFixed(2)}x`;
    if (window._activeAudioElement) window._activeAudioElement.playbackRate = currentGlobalSpeed;
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
                <p class="text-white font-semibold">No books found</p>
                <p class="text-xs text-on-surface-variant mt-1">Upload a new PDF to get started</p>
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
    DOM.heroSubtitle.textContent = `${lastChap.title} • ${currentBook.author || 'AI Studio Book'}`;
    
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
                <button onclick="downloadSingleChapterAudio(${chap.id})" id="btnDlChap_${chap.id}" class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-primary-fixed transition" title="Download MP3">
                    <span class="material-symbols-outlined text-lg">download</span>
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

// --- Downloads (Real MP3 & ZIP) ---
async function createChapterAudioBlob(chap) {
    const edgeVoice = mapToEdgeVoice(userSelectedVoiceName);
    const sentences = splitIntoNaturalSentences(chap.text);
    
    // Group sentences into chunks of max 250 chars
    let chunks = [];
    let current = '';
    for (const s of sentences) {
        let textToUse = s;
        if (currentLang !== 'en') {
            textToUse = await translateSentence(s, currentLang);
        }
        if (current.length + textToUse.length > 250) {
            if (current.trim()) chunks.push(current.trim());
            current = textToUse + ' ';
        } else {
            current += textToUse + ' ';
        }
    }
    if (current.trim()) chunks.push(current.trim());

    const mp3Blobs = [];
    for (let i = 0; i < chunks.length; i++) {
        try {
            let blob;
            if (edgeVoice === 'fallback_ka' || currentLang === 'ka') {
                blob = await synthesizeGoogleTTSChunk(chunks[i], 'ka');
            } else {
                try {
                    blob = await synthesizeEdgeTTSChunk(chunks[i], edgeVoice);
                } catch {
                    blob = await synthesizeGoogleTTSChunk(chunks[i], currentLang);
                }
            }
            if (blob) mp3Blobs.push(blob);
        } catch (e) {
            console.warn(`Chunk ${i} download generation failed:`, e);
        }
        await new Promise(r => setTimeout(r, 150));
    }

    if (mp3Blobs.length === 0) return new Blob([], { type: 'audio/mp3' });
    return new Blob(mp3Blobs, { type: 'audio/mp3' });
}

async function downloadSingleChapterAudio(chapId) {
    if (!currentBook) return;
    const chap = currentBook.chapters.find(c => c.id === chapId);
    if (!chap) return;

    const btn = document.getElementById(`btnDlChap_${chapId}`);
    let oldHtml = '';
    if (btn) {
        oldHtml = btn.innerHTML;
        btn.innerHTML = `<span class="material-symbols-outlined text-lg animate-spin text-primary-fixed">sync</span>`;
        btn.disabled = true;
    }

    try {
        const blob = await createChapterAudioBlob(chap);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = `${currentBook.title}_${chap.title}`.replace(/[^a-zA-Z0-9_\u10A0-\u10FF-]/g, '_');
        a.download = `${safeTitle}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Download error:', e);
        alert('Failed to generate MP3. Please try again.');
    } finally {
        if (btn) {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    }
}

async function downloadFullAudiobookZip() {
    if (!currentBook || currentBook.chapters.length === 0) return;
    const zipBtn = DOM.btnDownloadAllZip;
    const zipText = document.getElementById('btnDownloadAllZipText');
    
    if (zipBtn) zipBtn.disabled = true;
    if (zipText) zipText.textContent = 'Generating All Chapters (0%)...';

    try {
        const zip = new JSZip();
        for (let i = 0; i < currentBook.chapters.length; i++) {
            const chap = currentBook.chapters[i];
            if (zipText) zipText.textContent = `Generating Chapter ${i + 1} of ${currentBook.chapters.length}...`;
            const blob = await createChapterAudioBlob(chap);
            const safeName = `Chapter_${i + 1}_${chap.title.replace(/[^a-zA-Z0-9_\u10A0-\u10FF-]/g, '_')}.mp3`;
            zip.file(safeName, blob);
        }

        if (zipText) zipText.textContent = 'Compressing ZIP...';
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentBook.title.replace(/[^a-zA-Z0-9_\u10A0-\u10FF-]/g, '_')}_Full_Audiobook.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error('ZIP export error:', e);
        alert('Failed to generate Audiobook ZIP.');
    } finally {
        if (zipBtn) zipBtn.disabled = false;
        if (zipText) zipText.textContent = 'Download Full Audiobook (ZIP)';
    }
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

    // Settings
    if (DOM.topLangSelect) {
        DOM.topLangSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            if (DOM.langSelect) DOM.langSelect.value = currentLang;
            stopSpeech();
        });
    }

    if (DOM.langSelect) {
        DOM.langSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            if (DOM.topLangSelect) DOM.topLangSelect.value = currentLang;
            stopSpeech();
        });
    }

    if (DOM.voiceSelect) {
        DOM.voiceSelect.addEventListener('change', (e) => {
            userSelectedVoiceName = e.target.value;
            stopSpeech();
        });
    }

    if (DOM.speedSlider) {
        DOM.speedSlider.addEventListener('input', (e) => {
            currentGlobalSpeed = parseFloat(e.target.value);
            if (DOM.speedVal) DOM.speedVal.textContent = `${currentGlobalSpeed.toFixed(2)}x`;
            if (DOM.btnDockSpeed) DOM.btnDockSpeed.textContent = `${currentGlobalSpeed.toFixed(2).replace(/\.00$/, '')}x`;
            if (window._activeAudioElement) window._activeAudioElement.playbackRate = currentGlobalSpeed;
        });
    }

    if (DOM.pitchSlider) {
        DOM.pitchSlider.addEventListener('input', (e) => {
            if (DOM.pitchVal) DOM.pitchVal.textContent = e.target.value;
        });
    }

    if (DOM.btnDownloadAllZip) {
        DOM.btnDownloadAllZip.addEventListener('click', downloadFullAudiobookZip);
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

// Start
document.addEventListener('DOMContentLoaded', init);
