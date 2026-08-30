// ==========================================
// LUMINA AUDIO - CORE APPLICATION LOGIC
// ==========================================

// --- State Variables ---
let db = null;
let currentBook = null;
let currentPlayingChapterId = null;
let isPlaying = false;
let isPaused = false;
let currentGlobalSpeed = 1.0;
let currentLang = 'en';
let userSelectedVoiceName = '';

let sentenceQueue = [];
let currentSentenceIndex = 0;
let utteranceTimeout = null;

let secondsElapsed = 0;
let timerInterval = null;

let currentUser = null; // null if guest

// --- DOM Elements ---
const fileInput = document.getElementById('fileInput');
const uploadProgressContainer = document.getElementById('uploadProgressContainer');
const uploadProgressBar = document.getElementById('uploadProgressBar');
const uploadStatusText = document.getElementById('uploadStatusText');

const booksGrid = document.getElementById('booksGrid');
const heroSection = document.getElementById('heroSection');
const heroPlayBtn = document.getElementById('heroPlayBtn');
const heroCover = document.getElementById('heroCover');
const heroTitle = document.getElementById('heroTitle');
const heroSubtitle = document.getElementById('heroSubtitle');
const heroProgressText = document.getElementById('heroProgressText');
const heroProgressCircle = document.getElementById('heroProgressCircle');

const playerDock = document.getElementById('playerDock');
const dockCover = document.getElementById('dockCover');
const dockTitle = document.getElementById('dockTitle');
const dockSubtitle = document.getElementById('dockSubtitle');
const dockVisualizer = document.getElementById('dockVisualizer');

const btnPlayerPlayPause = document.getElementById('btnPlayerPlayPause');
const btnPlayerRewind = document.getElementById('btnPlayerRewind');
const btnPlayerForward = document.getElementById('btnPlayerForward');
const playerProgress = document.getElementById('playerProgress');

const chaptersContainer = document.getElementById('chaptersContainer');
const chaptersList = document.getElementById('chaptersList');
const activeBookTitle = document.getElementById('activeBookTitle');

const voiceSelect = document.getElementById('voiceSelect');
const langSelect = document.getElementById('langSelect');
const speedSlider = document.getElementById('speedSlider');
const speedVal = document.getElementById('speedVal');
const pitchSlider = document.getElementById('pitchSlider');
const pitchVal = document.getElementById('pitchVal');

const topProfileBtn = document.getElementById('topProfileBtn');
const topProfileName = document.getElementById('topProfileName');
const userNavSection = document.getElementById('userNavSection');

// --- Initialization ---
async function init() {
    await initDB();
    setupEventListeners();
    populateVoiceList();
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    checkAuthState();
    await renderDigitalShelf();
    lucide.createIcons();
}

// --- Navigation & Modals ---
function navigate(viewId) {
    document.getElementById('view-library').classList.add('hidden');
    document.getElementById('view-settings').classList.add('hidden');
    
    document.getElementById(`view-${viewId}`).classList.remove('hidden');

    document.getElementById('nav-library').classList.remove('text-primary-fixed-dim', 'border-primary-fixed-dim', 'bg-white/10');
    document.getElementById('nav-library').classList.add('text-on-surface-variant');
    
    document.getElementById('nav-settings').classList.remove('text-primary-fixed-dim', 'border-primary-fixed-dim', 'bg-white/10');
    document.getElementById('nav-settings').classList.add('text-on-surface-variant');

    document.getElementById(`nav-${viewId}`).classList.add('text-primary-fixed-dim', 'border-primary-fixed-dim', 'bg-white/10');
    document.getElementById(`nav-${viewId}`).classList.remove('text-on-surface-variant');
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// --- Authentication (Simulated / LocalStorage) ---
function checkAuthState() {
    const savedUser = localStorage.getItem('lumina_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
    }
}

function updateAuthUI() {
    if (currentUser) {
        topProfileName.textContent = currentUser.email.split('@')[0];
        userNavSection.innerHTML = `
            <button onclick="logout()" class="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-white/10 hover:text-error transition-all font-medium">
                <span class="material-symbols-outlined">logout</span>
                Sign Out
            </button>
        `;
        topProfileBtn.onclick = null;
    } else {
        topProfileName.textContent = "Guest";
        userNavSection.innerHTML = `
            <button onclick="openModal('authModal')" class="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-white/10 hover:text-primary-fixed-dim transition-all font-medium">
                <span class="material-symbols-outlined">login</span>
                Sign In / Register
            </button>
        `;
        topProfileBtn.onclick = () => openModal('authModal');
    }
}

function login(email, password) {
    // Simulated auth
    if (email.includes('@')) {
        currentUser = { email: email, uid: 'user_' + Date.now() };
        localStorage.setItem('lumina_user', JSON.stringify(currentUser));
        updateAuthUI();
        closeModal('authModal');
        document.getElementById('authErrorText').textContent = "";
    } else {
        document.getElementById('authErrorText').textContent = "Invalid email format.";
        document.getElementById('authErrorText').classList.add('text-error');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('lumina_user');
    updateAuthUI();
    // In a real app, we might clear books here if they are user-specific.
}

// --- Database (IndexedDB) ---
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('LuminaAudioDB', 2);
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains('books')) {
                db.createObjectStore('books', { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => { db = e.target.result; resolve(); };
        request.onerror = (e) => { console.error('IndexedDB Error:', e); reject(e); };
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

// --- Cover Art Generation ---
async function fetchBookCover(title) {
    try {
        const cleanTitle = title.replace(/\.pdf$/i, '');
        const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}&limit=1`);
        const data = await res.json();
        if (data.docs && data.docs.length > 0 && data.docs[0].cover_i) {
            return `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-L.jpg`;
        }
    } catch (e) { console.warn('Cover fetch failed', e); }
    
    // Fallback: Generate abstract gradient SVG
    const colors = ['#00f0ff', '#dcb8ff', '#7701d0', '#006970'];
    const c1 = colors[Math.floor(Math.random() * colors.length)];
    const c2 = colors[Math.floor(Math.random() * colors.length)];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
        <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>
        <rect width="400" height="600" fill="url(#g)"/>
        <text x="200" y="300" font-family="sans-serif" font-size="24" fill="white" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${title.substring(0, 20)}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// --- PDF Processing ---
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        alert('Please select a valid PDF file.');
        return;
    }

    uploadProgressContainer.classList.remove('hidden');
    uploadStatusText.textContent = "Extracting text from PDF...";
    uploadProgressBar.value = 10;

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
            uploadProgressBar.value = 10 + Math.round((i / totalPages) * 40);
        }

        uploadStatusText.textContent = "Finding Book Cover...";
        uploadProgressBar.value = 60;
        
        const coverUrl = await fetchBookCover(file.name);

        uploadStatusText.textContent = "AI Chapterizing content...";
        uploadProgressBar.value = 80;

        const chapters = splitIntoChapters(fullText);
        
        const newBook = {
            id: 'book_' + Date.now(),
            title: file.name.replace(/\.pdf$/i, ''),
            coverUrl: coverUrl,
            chapters: chapters,
            dateAdded: new Date().toISOString(),
            lastPlayedChapterId: chapters.length > 0 ? chapters[0].id : null,
            progressPct: 0
        };

        await saveBookToDB(newBook);
        uploadProgressBar.value = 100;
        uploadStatusText.textContent = "Complete!";
        
        setTimeout(() => {
            closeModal('uploadModal');
            uploadProgressContainer.classList.add('hidden');
            renderDigitalShelf();
        }, 1000);
        
    } catch (err) {
        console.error(err);
        uploadStatusText.textContent = "Error processing PDF.";
        uploadStatusText.classList.add('text-error');
    }
}

function splitIntoChapters(text) {
    const chapters = [];
    const MAX_WORDS = 800; // Small chunks for testing
    let words = text.split(/\s+/);
    
    let currentChapter = [];
    let chapIndex = 1;
    
    for (let i = 0; i < words.length; i++) {
        currentChapter.push(words[i]);
        if (currentChapter.length >= MAX_WORDS) {
            chapters.push({
                id: chapIndex,
                title: `Chapter ${chapIndex}`,
                text: currentChapter.join(' '),
                word_count: currentChapter.length,
                estimated_duration_sec: Math.round((currentChapter.length / 150) * 60)
            });
            chapIndex++;
            currentChapter = [];
        }
    }
    
    if (currentChapter.length > 0) {
        chapters.push({
            id: chapIndex,
            title: `Chapter ${chapIndex}`,
            text: currentChapter.join(' '),
            word_count: currentChapter.length,
            estimated_duration_sec: Math.round((currentChapter.length / 150) * 60)
        });
    }
    return chapters;
}

function splitIntoNaturalSentences(text) {
    const regex = /[^.!?]+[.!?]+["']?|[^.!?]+$/g;
    const matches = text.match(regex);
    return matches ? matches.map(s => s.trim()).filter(s => s.length > 0) : [text];
}

// --- UI Rendering ---
async function renderDigitalShelf() {
    const books = await getAllBooks();
    booksGrid.innerHTML = '';

    if (books.length === 0) {
        booksGrid.innerHTML = `<div class="col-span-full text-center py-12 text-on-surface-variant">No books yet. Upload a PDF to get started!</div>`;
        return;
    }

    books.forEach(book => {
        const div = document.createElement('div');
        div.className = 'group relative cursor-pointer';
        div.onclick = () => openBook(book.id);
        div.innerHTML = `
            <div class="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative glass-card p-1">
                <img src="${book.coverUrl}" class="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-500">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button class="w-12 h-12 bg-primary/20 backdrop-blur-md rounded-full flex items-center justify-center border border-primary-fixed/50 text-primary-fixed shadow-lg">
                        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                    </button>
                </div>
            </div>
            <h4 class="font-medium text-on-surface truncate group-hover:text-primary-fixed transition-colors">${book.title}</h4>
            <div class="flex justify-between items-center mt-1">
                <p class="text-xs text-on-surface-variant truncate">${new Date(book.dateAdded).toLocaleDateString()}</p>
                <button onclick="deleteBook(event, '${book.id}')" class="text-on-surface-variant hover:text-error transition-colors p-1"><span class="material-symbols-outlined text-[16px]">delete</span></button>
            </div>
        `;
        booksGrid.appendChild(div);
    });
}

async function openBook(bookId) {
    const books = await getAllBooks();
    currentBook = books.find(b => b.id === bookId);
    if (!currentBook) return;

    chaptersContainer.classList.remove('hidden');
    activeBookTitle.textContent = currentBook.title;
    
    // Update Hero
    heroSection.classList.remove('hidden');
    heroSection.classList.add('flex');
    heroCover.src = currentBook.coverUrl;
    heroTitle.textContent = currentBook.title;
    
    const lastChap = currentBook.chapters.find(c => c.id === currentBook.lastPlayedChapterId) || currentBook.chapters[0];
    heroSubtitle.textContent = lastChap.title;
    heroProgressText.textContent = `${currentBook.progressPct || 0}% Completed`;
    heroProgressCircle.style.strokeDashoffset = 283 - (283 * (currentBook.progressPct || 0) / 100);

    heroPlayBtn.onclick = () => playChapterAudio(lastChap.id);

    renderChaptersList();
}

async function deleteBook(e, bookId) {
    e.stopPropagation();
    if (confirm('Delete this book?')) {
        await deleteBookFromDB(bookId);
        if (currentBook && currentBook.id === bookId) {
            currentBook = null;
            chaptersContainer.classList.add('hidden');
            heroSection.classList.add('hidden');
            heroSection.classList.remove('flex');
            stopSpeech();
            playerDock.classList.remove('translate-y-0', 'opacity-100');
            playerDock.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
        }
        renderDigitalShelf();
    }
}

function renderChaptersList() {
    if (!currentBook) return;
    chaptersList.innerHTML = '';
    
    currentBook.chapters.forEach((chap, index) => {
        const isPlayingThis = (currentPlayingChapterId === chap.id && isPlaying && !isPaused);
        
        const div = document.createElement('div');
        div.className = `glass-panel rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors ${isPlayingThis ? 'border-primary-fixed/50 bg-primary-fixed/5' : 'hover:bg-white/5'}`;
        
        div.innerHTML = `
            <div class="flex-grow overflow-hidden w-full">
                <div class="flex items-center gap-3">
                    <span class="text-primary-fixed-dim font-bold text-lg w-6">${index + 1}</span>
                    <h4 class="font-medium text-on-surface truncate">${chap.title}</h4>
                </div>
                <p class="text-sm text-on-surface-variant mt-1 ml-9">
                    ${chap.word_count.toLocaleString()} words • ~${formatTime(chap.estimated_duration_sec)}
                </p>
            </div>
            
            <div class="flex items-center gap-2 w-full sm:w-auto ml-9 sm:ml-0">
                <button onclick="playChapterAudio(${chap.id})" class="flex-1 sm:flex-none flex items-center justify-center gap-2 ${isPlayingThis ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest text-on-surface'} hover:brightness-110 px-4 py-2 rounded-lg font-medium transition shadow-md">
                    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">${isPlayingThis ? 'pause' : 'play_arrow'}</span>
                    <span>${isPlayingThis ? 'Pause' : 'Listen'}</span>
                </button>
                <button onclick="downloadSingleChapterAudio(${chap.id})" class="p-2 bg-surface-container-highest text-on-surface hover:text-primary-fixed rounded-lg transition" title="Download MP3">
                    <span class="material-symbols-outlined">download</span>
                </button>
            </div>
        `;
        chaptersList.appendChild(div);
    });
    lucide.createIcons();
}

function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// --- Audio Player Logic ---
function playChapterAudio(chapId) {
    const chap = currentBook.chapters.find(c => c.id === chapId);
    if (!chap) return;

    if (currentPlayingChapterId === chapId) {
        togglePlayPause();
        return;
    }

    currentPlayingChapterId = chapId;
    sentenceQueue = splitIntoNaturalSentences(chap.text);
    currentSentenceIndex = 0;
    secondsElapsed = 0;
    isPlaying = true;
    isPaused = false;

    // Show Bottom Dock
    playerDock.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
    playerDock.classList.add('translate-y-0', 'opacity-100');
    
    dockCover.src = currentBook.coverUrl;
    dockTitle.textContent = chap.title;
    dockSubtitle.textContent = currentBook.title;
    playerProgress.value = 0;

    startTimer();
    speakCurrentSentence();
    renderChaptersList();
}

// High-Fidelity Edge TTS / Google TTS Audio Blobs
async function speakCurrentSentence() {
    if (!isPlaying || isPaused) return;

    if (currentSentenceIndex >= sentenceQueue.length) {
        stopSpeech();
        playerProgress.value = 100;
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

    if (playerProgress && sentenceQueue.length > 0) {
        const pct = Math.round((currentSentenceIndex / sentenceQueue.length) * 100);
        playerProgress.value = pct;
        
        // Update DB progress
        if (currentBook) {
            currentBook.progressPct = pct;
            currentBook.lastPlayedChapterId = currentPlayingChapterId;
            saveBookToDB(currentBook);
            // Update hero silently if active
            heroProgressText.textContent = `${pct}% Completed`;
            heroProgressCircle.style.strokeDashoffset = 283 - (283 * pct / 100);
        }
    }

    if (window._activeAudioElement) {
        window._activeAudioElement.pause();
        window._activeAudioElement = null;
    }

    try {
        const voiceName = userSelectedVoiceName || (voiceSelect ? voiceSelect.value : '');
        const edgeVoice = mapToEdgeVoice(voiceName);
        let mp3Blob;
        
        if (edgeVoice === 'fallback_ka' || currentLang === 'ka') {
            mp3Blob = await synthesizeGoogleTTSChunk(cleanSentence, 'ka');
        } else {
            mp3Blob = await synthesizeEdgeTTSChunk(cleanSentence, edgeVoice);
        }

        if (!isPlaying || isPaused) return;

        const audioUrl = URL.createObjectURL(mp3Blob);
        const audio = new Audio(audioUrl);
        window._activeAudioElement = audio;

        if (edgeVoice === 'fallback_ka' || currentLang === 'ka') {
            audio.playbackRate = currentGlobalSpeed;
        }

        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            if (!isPlaying || isPaused) return;
            currentSentenceIndex++;
            if (utteranceTimeout) clearTimeout(utteranceTimeout);
            utteranceTimeout = setTimeout(() => {
                if (isPlaying && !isPaused) speakCurrentSentence();
            }, 320);
        };

        audio.onerror = (e) => {
            console.error("Audio playback error", e);
            URL.revokeObjectURL(audioUrl);
            currentSentenceIndex++;
            speakCurrentSentence();
        };

        audio.play().catch(e => console.warn("Play interrupted:", e));
        updatePlayerUIState(true);

    } catch (err) {
        console.error("TTS Generator Error", err);
        currentSentenceIndex++;
        speakCurrentSentence();
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
        if (window._activeAudioElement) {
            window._activeAudioElement.pause();
        }
        stopTimer();
        updatePlayerUIState(false);
    } else if (isPlaying && isPaused) {
        isPaused = false;
        if (window._activeAudioElement) {
            window._activeAudioElement.play().catch(e => console.warn(e));
        } else {
            speakCurrentSentence();
        }
        startTimer();
        updatePlayerUIState(true);
    } else {
        playChapterAudio(currentPlayingChapterId);
    }
}

function updatePlayerUIState(isSpeaking) {
    if (btnPlayerPlayPause) {
        btnPlayerPlayPause.innerHTML = `<span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1;">${isSpeaking ? 'pause' : 'play_arrow'}</span>`;
    }
    if (dockVisualizer) {
        if (isSpeaking) {
            dockVisualizer.classList.remove('hidden');
        } else {
            dockVisualizer.classList.add('hidden');
        }
    }
    if (currentBook) renderChaptersList();
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
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// --- Edge TTS Network Layer ---
function generateUuid() {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function mapToEdgeVoice(browserVoiceName) {
    const name = browserVoiceName.toLowerCase();
    if (name.includes('georgian') || name.includes('ka-ge') || currentLang === 'ka') return 'fallback_ka';
    if (name.includes('uk english male') || name.includes('en-gb-male')) return 'en-GB-RyanNeural';
    if (name.includes('uk english female') || name.includes('en-gb-female')) return 'en-GB-SoniaNeural';
    if (name.includes('deutsch') || name.includes('de-de') || currentLang === 'de') return 'de-DE-KillianNeural';
    if (name.includes('español') || name.includes('es-es') || currentLang === 'es') return 'es-ES-AlvaroNeural';
    if (name.includes('français') || name.includes('fr-fr') || currentLang === 'fr') return 'fr-FR-HenriNeural';
    return 'en-US-ChristopherNeural';
}

async function synthesizeEdgeTTSChunk(text, edgeVoiceName) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4');
        let audioBuffers = [];
        
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
            const pitchVal = parseInt(pitchSlider ? pitchSlider.value : 0);
            const pitchStr = pitchVal >= 0 ? `+${pitchVal}Hz` : `${pitchVal}Hz`;
            
            const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${edgeVoiceName}'><prosody rate='${ratePct}' pitch='${pitchStr}'>${safeText}</prosody></voice></speak>`;
            
            ws.send(`X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
        };
        
        ws.onmessage = async (e) => {
            if (typeof e.data === 'string') {
                if (e.data.includes('Path:turn.end')) {
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
        
        ws.onerror = (e) => reject(e);
        setTimeout(() => reject(new Error("TTS Timeout")), 15000);
    });
}

async function synthesizeGoogleTTSChunk(text, langCode) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(text)}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("Google TTS Proxy failed");
    return await res.blob();
}

async function createChapterAudioBlob(chap) {
    const voiceName = userSelectedVoiceName || (voiceSelect ? voiceSelect.value : '');
    const edgeVoice = mapToEdgeVoice(voiceName);
    
    const sentences = splitIntoNaturalSentences(chap.text);
    let chunks = [];
    let currentChunk = '';
    sentences.forEach(s => {
        if (currentChunk.length + s.length > 300) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = s + ' ';
        } else {
            currentChunk += s + ' ';
        }
    });
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    
    const allMp3Blobs = [];
    
    for (let i = 0; i < chunks.length; i++) {
        try {
            let mp3Blob;
            if (edgeVoice === 'fallback_ka' || currentLang === 'ka') {
                mp3Blob = await synthesizeGoogleTTSChunk(chunks[i], 'ka');
            } else {
                mp3Blob = await synthesizeEdgeTTSChunk(chunks[i], edgeVoice);
            }
            if (mp3Blob) allMp3Blobs.push(mp3Blob);
        } catch (e) {
            console.warn(`TTS Chunk ${i} failed:`, e);
        }
        await new Promise(r => setTimeout(r, 200));
    }
    
    if (allMp3Blobs.length === 0) return new Blob([new ArrayBuffer(1024)], { type: 'audio/mp3' });
    return new Blob(allMp3Blobs, { type: 'audio/mp3' });
}

// --- Downloads ---
async function downloadSingleChapterAudio(chapId) {
    const chap = currentBook.chapters.find(c => c.id === chapId);
    if (!chap) return;

    const originalTitle = chap.title;
    chap.title = 'Generating MP3...';
    renderChaptersList();

    const btn = document.querySelector(`button[onclick="downloadSingleChapterAudio(${chapId})"]`);
    let originalHtml = '';
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span>`;
    }

    try {
        const blob = await createChapterAudioBlob(chap);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = originalTitle.replace(/[^a-zA-Z0-9_\u10A0-\u10FF-]/g, '_');
        a.download = `Chapter_${chap.id < 10 ? '0' + chap.id : chap.id}_${safeTitle}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Download error:', e);
        alert('Failed to generate MP3. Please try again.');
    } finally {
        chap.title = originalTitle;
        if (btn) btn.innerHTML = originalHtml;
        renderChaptersList();
    }
}

// --- Settings & Events ---
function populateVoiceList() {
    if (!('speechSynthesis' in window) || !voiceSelect) return;
    const voices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';
    
    const geOption = document.createElement('option');
    geOption.value = 'Georgian-Natural-ka-GE';
    geOption.textContent = 'Georgian Studio (Google Translate)';
    voiceSelect.appendChild(geOption);

    voices.forEach((voice) => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.name;
        voiceSelect.appendChild(option);
    });

    if (userSelectedVoiceName) {
        voiceSelect.value = userSelectedVoiceName;
    }
}

function setupEventListeners() {
    const btnNavUpload = document.getElementById('btnNavUpload');
    if (btnNavUpload) {
        btnNavUpload.addEventListener('click', () => openModal('uploadModal'));
    }

    if (fileInput) fileInput.addEventListener('change', handleFileUpload);
    
    const btnAuthSignIn = document.getElementById('btnAuthSignIn');
    if (btnAuthSignIn) {
        btnAuthSignIn.addEventListener('click', () => {
            const em = document.getElementById('authEmail').value;
            const pw = document.getElementById('authPassword').value;
            login(em, pw);
        });
    }

    const btnAuthRegister = document.getElementById('btnAuthRegister');
    if (btnAuthRegister) {
        btnAuthRegister.addEventListener('click', () => {
            const em = document.getElementById('authEmail').value;
            const pw = document.getElementById('authPassword').value;
            login(em, pw);
        });
    }

    if (btnPlayerPlayPause) btnPlayerPlayPause.addEventListener('click', togglePlayPause);
    
    if (btnPlayerRewind) {
        btnPlayerRewind.addEventListener('click', () => {
            if (sentenceQueue.length > 0) {
                currentSentenceIndex = Math.max(0, currentSentenceIndex - 2);
                if (isPlaying && !isPaused) speakCurrentSentence();
            }
        });
    }
    if (btnPlayerForward) {
        btnPlayerForward.addEventListener('click', () => {
            if (sentenceQueue.length > 0) {
                currentSentenceIndex = Math.min(sentenceQueue.length - 1, currentSentenceIndex + 2);
                if (isPlaying && !isPaused) speakCurrentSentence();
            }
        });
    }

    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            currentGlobalSpeed = parseFloat(e.target.value);
            speedVal.textContent = currentGlobalSpeed.toFixed(2) + 'x';
            if (window._activeAudioElement) window._activeAudioElement.playbackRate = currentGlobalSpeed;
        });
    }

    if (pitchSlider) {
        pitchSlider.addEventListener('input', (e) => {
            pitchVal.textContent = e.target.value;
        });
    }

    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            stopSpeech();
        });
    }

    if (voiceSelect) {
        voiceSelect.addEventListener('change', (e) => {
            userSelectedVoiceName = e.target.value;
            stopSpeech();
        });
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
