// AudioRead Studio Pro - Ultra-Reliable In-Browser Speech Engine & Background Generator

let currentBook = null;
let currentPlayingChapterId = null;
let playbackSpeeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
let currentSpeedIndex = 1;
let activeModalChapterId = null;
let isPreparingAll = false;

// Player State
let isPlaying = false;
let isPaused = false;
let sentenceQueue = [];
let currentSentenceIndex = 0;
let secondsElapsed = 0;
let audioTimer = null;

// Global Utterance reference to prevent Chromium garbage collection bug
window._activeUtterance = null;

// DOM Elements
const dropZone = document.getElementById('dropZone');
const pdfFileInput = document.getElementById('pdfFileInput');
const uploadingState = document.getElementById('uploadingState');
const uploadSection = document.getElementById('uploadSection');
const workspaceSection = document.getElementById('workspaceSection');
const btnNewBook = document.getElementById('btnNewBook');
const modeBadge = document.getElementById('modeBadge');
const modeText = document.getElementById('modeText');

// Book Stats Elements
const bookTitle = document.getElementById('bookTitle');
const bookAuthor = document.getElementById('bookAuthor');
const statPages = document.getElementById('statPages');
const statChapters = document.getElementById('statChapters');
const statWords = document.getElementById('statWords');
const statEstDuration = document.getElementById('statEstDuration');
const chapterCountBadge = document.getElementById('chapterCountBadge');
const chaptersContainer = document.getElementById('chaptersContainer');

// Voice & Tuning Elements
const voiceSelect = document.getElementById('voiceSelect');
const rateSlider = document.getElementById('rateSlider');
const rateLabel = document.getElementById('rateLabel');
const pitchSlider = document.getElementById('pitchSlider');
const pitchLabel = document.getElementById('pitchLabel');
const btnPreviewVoice = document.getElementById('btnPreviewVoice');
const btnConvertAll = document.getElementById('btnConvertAll');
const btnConvertAllText = document.getElementById('btnConvertAllText');

// Modal Elements
const textModal = document.getElementById('textModal');
const modalChapterTitle = document.getElementById('modalChapterTitle');
const modalInputTitle = document.getElementById('modalInputTitle');
const modalInputText = document.getElementById('modalInputText');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelModal = document.getElementById('btnCancelModal');
const btnSaveModal = document.getElementById('btnSaveModal');

// Audio Player Elements
const audioPlayerBar = document.getElementById('audioPlayerBar');
const playerEqualizer = document.getElementById('playerEqualizer');
const playerTrackTitle = document.getElementById('playerTrackTitle');
const playerTrackSubtitle = document.getElementById('playerTrackSubtitle');
const btnPlayerPlayPause = document.getElementById('btnPlayerPlayPause');
const playIcon = document.getElementById('playIcon');
const btnPlayerPrev = document.getElementById('btnPlayerPrev');
const btnPlayerNext = document.getElementById('btnPlayerNext');
const btnPlayerRewind = document.getElementById('btnPlayerRewind');
const btnPlayerForward = document.getElementById('btnPlayerForward');
const playerProgress = document.getElementById('playerProgress');
const playerCurrentTime = document.getElementById('playerCurrentTime');
const playerTotalTime = document.getElementById('playerTotalTime');
const btnPlaybackSpeed = document.getElementById('btnPlaybackSpeed');
const btnMute = document.getElementById('btnMute');
const volumeIcon = document.getElementById('volumeIcon');
const volumeSlider = document.getElementById('volumeSlider');

// Prevent Window Drag-Drop Default Navigation
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
});

// Chrome Speech Keep-Alive Heartbeat
setInterval(() => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
    }
}, 7000);

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    setupEventListeners();
    populateVoiceList();
});

// Voice Loading & Prioritization
function populateVoiceList() {
    if (!('speechSynthesis' in window) || !voiceSelect) return;

    let availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
            populateVoiceList();
        };
        return;
    }

    voiceSelect.innerHTML = '';

    // Group voices: Natural Online vs Standard
    const naturalVoices = [];
    const englishVoices = [];
    const otherVoices = [];

    availableVoices.forEach(v => {
        const lower = v.name.toLowerCase();
        if (lower.includes('natural') || lower.includes('online') || lower.includes('google') || lower.includes('neural') || lower.includes('enhanced')) {
            naturalVoices.push(v);
        } else if (v.lang.startsWith('en')) {
            englishVoices.push(v);
        } else {
            otherVoices.push(v);
        }
    });

    // 1. Natural AI Voices
    if (naturalVoices.length > 0) {
        const groupNatural = document.createElement('optgroup');
        groupNatural.label = '⭐ Ultra-Natural HD Voices (Recommended)';
        naturalVoices.forEach((v, idx) => {
            const opt = document.createElement('option');
            opt.value = v.name;
            opt.textContent = `🌟 ${v.name} (${v.lang})`;
            if (idx === 0) opt.selected = true;
            groupNatural.appendChild(opt);
        });
        voiceSelect.appendChild(groupNatural);
    }

    // 2. English Voices
    if (englishVoices.length > 0) {
        const groupEn = document.createElement('optgroup');
        groupEn.label = '🎙️ Standard English Narrators';
        englishVoices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.name;
            opt.textContent = `${v.name} (${v.lang})`;
            if (!naturalVoices.length && v.lang === 'en-US') opt.selected = true;
            groupEn.appendChild(opt);
        });
        voiceSelect.appendChild(groupEn);
    }

    // 3. International Voices
    if (otherVoices.length > 0) {
        const groupOther = document.createElement('optgroup');
        groupOther.label = '🌐 International Languages';
        otherVoices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.name;
            opt.textContent = `${v.name} (${v.lang})`;
            groupOther.appendChild(opt);
        });
        voiceSelect.appendChild(groupOther);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    if (!dropZone || !pdfFileInput) return;

    // Dropzone Drag Events
    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('border-indigo-400', 'bg-indigo-950/30');
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('border-indigo-400', 'bg-indigo-950/30');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('border-indigo-400', 'bg-indigo-950/30');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('border-indigo-400', 'bg-indigo-950/30');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    // File Input change
    pdfFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    if (btnNewBook) {
        btnNewBook.addEventListener('click', () => {
            if (confirm('Upload a new book? Current progress will be saved in your session.')) {
                stopSpeech();
                uploadSection.classList.remove('hidden');
                workspaceSection.classList.add('hidden');
                btnNewBook.classList.add('hidden');
                currentBook = null;
                audioPlayerBar.classList.add('hidden');
            }
        });
    }

    // Rate / Speed Slider
    if (rateSlider) {
        rateSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            const multiplier = (1 + val / 100).toFixed(2);
            if (rateLabel) rateLabel.textContent = `${multiplier}x`;
        });
    }

    // Pitch Slider
    if (pitchSlider) {
        pitchSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            if (pitchLabel) pitchLabel.textContent = `${val > 0 ? '+' : ''}${val} Hz`;
        });
    }

    // Test Voice
    if (btnPreviewVoice) {
        btnPreviewVoice.addEventListener('click', () => {
            const selectedVoiceName = voiceSelect.value;
            const sample = "Welcome to AudioRead Studio. Converting your PDF books into high quality audio.";
            
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(sample);
            
            const match = window.speechSynthesis.getVoices().find(v => v.name === selectedVoiceName);
            if (match) utter.voice = match;
            
            utter.rate = 1 + parseInt(rateSlider.value) / 100;
            utter.pitch = 1 + parseInt(pitchSlider.value) / 50;
            utter.volume = volumeSlider ? parseFloat(volumeSlider.value) : 1.0;

            btnPreviewVoice.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Testing...`;
            if (window.lucide) lucide.createIcons();

            utter.onend = () => {
                btnPreviewVoice.innerHTML = `<i data-lucide="play-circle" class="w-3.5 h-3.5"></i> Test Voice`;
                if (window.lucide) lucide.createIcons();
            };

            window._activeUtterance = utter;
            window.speechSynthesis.speak(utter);
        });
    }

    // Prepare All Chapters (Background Generation)
    if (btnConvertAll) {
        btnConvertAll.addEventListener('click', async () => {
            if (!currentBook || isPreparingAll) return;
            isPreparingAll = true;

            btnConvertAll.disabled = true;
            btnConvertAllText.textContent = 'Preparing Chapters...';
            
            for (let i = 0; i < currentBook.chapters.length; i++) {
                const chap = currentBook.chapters[i];
                chap.sentences = splitIntoNaturalSentences(chap.text);
                chap.status = 'ready';
                
                // Update button progress
                btnConvertAllText.textContent = `Preparing ${i + 1}/${currentBook.chapters.length}...`;
                renderChaptersList();
                await new Promise(r => setTimeout(r, 60));
            }

            isPreparingAll = false;
            btnConvertAll.disabled = false;
            btnConvertAllText.textContent = '✓ All Chapters Ready';
            btnConvertAll.classList.remove('btn-neon-glow');
            btnConvertAll.classList.add('bg-emerald-600', 'text-white');
            
            renderChaptersList();
        });
    }

    // Modal Events
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
    if (btnSaveModal) btnSaveModal.addEventListener('click', saveModalChapter);

    // Player Controls
    if (btnPlayerPlayPause) btnPlayerPlayPause.addEventListener('click', togglePlayPause);

    // Rewind -15s
    if (btnPlayerRewind) {
        btnPlayerRewind.addEventListener('click', () => {
            if (sentenceQueue.length > 0) {
                currentSentenceIndex = Math.max(0, currentSentenceIndex - 2);
                speakCurrentSentence();
            }
        });
    }

    // Forward +15s
    if (btnPlayerForward) {
        btnPlayerForward.addEventListener('click', () => {
            if (sentenceQueue.length > 0) {
                currentSentenceIndex = Math.min(sentenceQueue.length - 1, currentSentenceIndex + 2);
                speakCurrentSentence();
            }
        });
    }

    if (btnPlayerPrev) btnPlayerPrev.addEventListener('click', playPreviousChapter);
    if (btnPlayerNext) btnPlayerNext.addEventListener('click', playNextChapter);

    // Scrubber
    if (playerProgress) {
        playerProgress.addEventListener('input', (e) => {
            if (sentenceQueue.length > 0) {
                const pct = parseFloat(e.target.value);
                currentSentenceIndex = Math.min(sentenceQueue.length - 1, Math.max(0, Math.floor((pct / 100) * sentenceQueue.length)));
                speakCurrentSentence();
            }
        });
    }

    // Playback speed
    if (btnPlaybackSpeed) {
        btnPlaybackSpeed.addEventListener('click', () => {
            currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
            const speed = playbackSpeeds[currentSpeedIndex];
            btnPlaybackSpeed.textContent = `${speed}x`;
            if (isPlaying && !isPaused) {
                speakCurrentSentence();
            }
        });
    }

    // Volume
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            updateVolumeIcon(vol);
        });
    }

    if (btnMute) {
        btnMute.addEventListener('click', () => {
            const currentVol = parseFloat(volumeSlider.value);
            const newVol = currentVol > 0 ? 0 : 1.0;
            volumeSlider.value = newVol;
            updateVolumeIcon(newVol);
        });
    }
}

function updateVolumeIcon(vol) {
    if (!btnMute) return;
    if (vol == 0) {
        btnMute.innerHTML = `<i data-lucide="volume-x" class="w-4 h-4 text-red-400"></i>`;
    } else if (vol < 0.5) {
        btnMute.innerHTML = `<i data-lucide="volume-1" class="w-4 h-4"></i>`;
    } else {
        btnMute.innerHTML = `<i data-lucide="volume-2" class="w-4 h-4"></i>`;
    }
    if (window.lucide) lucide.createIcons();
}

// Split text into natural, digestible sentences for speech synthesis
function splitIntoNaturalSentences(text) {
    if (!text || !text.trim()) return [];
    
    // Split on sentence terminators
    const rawChunks = text.split(/(?<=[.!?])\s+|\n+/);
    const result = [];
    
    rawChunks.forEach(chunk => {
        const trimmed = chunk.trim();
        if (!trimmed) return;
        
        if (trimmed.length > 200) {
            // Sub-divide long sentence by comma/semicolon/clause
            const parts = trimmed.split(/([,;:]\s+)/);
            let buf = '';
            parts.forEach(p => {
                if ((buf + p).length > 150) {
                    if (buf.trim()) result.push(buf.trim());
                    buf = p;
                } else {
                    buf += p;
                }
            });
            if (buf.trim()) result.push(buf.trim());
        } else {
            result.push(trimmed);
        }
    });
    
    return result;
}

// Handle PDF Upload & Parsing
async function handleFileUpload(file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Please upload a valid PDF eBook file (.pdf).');
        return;
    }

    if (uploadingState) uploadingState.classList.remove('hidden');

    try {
        const pdfjs = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
        if (!pdfjs) throw new Error('PDF library is initializing. Please try again.');

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/cmaps/',
            cMapPacked: true
        });
        const pdfDoc = await loadingTask.promise;
        
        const totalPages = pdfDoc.numPages;
        const pageTexts = [];
        
        for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageStr = textContent.items.map(item => item.str).join(' ');
            pageTexts.push(cleanText(pageStr));
        }

        const chapterRegex = /^\s*(chapter\s+(?:[0-9]+|[ivxlcdm]+)|part\s+(?:[0-9]+|[ivxlcdm]+)|book\s+(?:[0-9]+|[ivxlcdm]+)|act\s+(?:[0-9]+|[ivxlcdm]+)|prologue|epilogue|introduction|foreword|preface)\b/i;
        
        let chapters = [];
        let currentChap = null;
        let chapId = 1;

        pageTexts.forEach((pText, idx) => {
            const pNum = idx + 1;
            if (!pText) return;

            const lines = pText.split('\n');
            let foundHeading = null;
            for (let line of lines.slice(0, 8)) {
                const s = line.trim();
                if (chapterRegex.test(s) || (s.length >= 4 && s.length <= 40 && s === s.toUpperCase() && !s.match(/^\d+$/))) {
                    foundHeading = s.replace(/[:\-–—]+$/, '').trim();
                    break;
                }
            }

            if (foundHeading) {
                if (currentChap && currentChap.text.trim()) {
                    currentChap.text = currentChap.text.trim();
                    currentChap.word_count = currentChap.text.split(/\s+/).filter(Boolean).length;
                    currentChap.estimated_duration_sec = Math.round((currentChap.word_count / 150) * 60);
                    chapters.push(currentChap);
                }
                currentChap = {
                    id: chapId++,
                    title: foundHeading,
                    start_page: pNum,
                    end_page: pNum,
                    text: pText,
                    word_count: 0,
                    estimated_duration_sec: 0,
                    status: 'ready'
                };
            } else {
                if (currentChap) {
                    currentChap.end_page = pNum;
                    currentChap.text += '\n\n' + pText;
                } else if (idx === 0) {
                    currentChap = {
                        id: chapId++,
                        title: `Chapter 1 (Pages 1-${totalPages})`,
                        start_page: 1,
                        end_page: pNum,
                        text: pText,
                        word_count: 0,
                        estimated_duration_sec: 0,
                        status: 'ready'
                    };
                }
            }
        });

        if (currentChap && currentChap.text.trim()) {
            currentChap.text = currentChap.text.trim();
            currentChap.word_count = currentChap.text.split(/\s+/).filter(Boolean).length;
            currentChap.estimated_duration_sec = Math.round((currentChap.word_count / 150) * 60);
            chapters.push(currentChap);
        }

        // Subdivide oversized chapters into digestible ~1,500 word parts
        const refined = [];
        let newId = 1;

        chapters.forEach(c => {
            const words = c.text.split(/\s+/).filter(Boolean);
            if (words.length > 2000) {
                const chunkSize = 1500;
                let partNum = 1;
                for (let wIdx = 0; wIdx < words.length; wIdx += chunkSize) {
                    const chunkWords = words.slice(wIdx, wIdx + chunkSize);
                    const chunkText = chunkWords.join(' ');
                    const dur = Math.round((chunkWords.length / 150) * 60);
                    refined.push({
                        id: newId++,
                        title: `${c.title} - Part ${partNum}`,
                        start_page: c.start_page,
                        end_page: c.end_page,
                        text: chunkText,
                        word_count: chunkWords.length,
                        estimated_duration_sec: dur,
                        status: 'ready'
                    });
                    partNum++;
                }
            } else {
                c.id = newId++;
                refined.push(c);
            }
        });

        chapters = refined;

        const totalWords = chapters.reduce((acc, c) => acc + c.word_count, 0);
        const totalDuration = chapters.reduce((acc, c) => acc + c.estimated_duration_sec, 0);

        currentBook = {
            id: 'local_' + Date.now().toString(36),
            filename: file.name,
            title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            author: 'Local Document',
            total_pages: totalPages,
            total_words: totalWords,
            estimated_total_duration_sec: totalDuration,
            chapters: chapters
        };

        renderWorkspace();
    } catch (err) {
        alert('Failed to parse PDF: ' + err.message);
    } finally {
        if (uploadingState) uploadingState.classList.add('hidden');
        if (pdfFileInput) pdfFileInput.value = '';
    }
}

function cleanText(text) {
    if (!text) return '';
    text = text.replace(/(\b\w+)-\s+(\w+\b)/g, '$1$2');
    text = text.replace(/^\s*(?:page\s+)?\d+\s*$/gim, '');
    return text.replace(/[ \t]+/g, ' ').trim();
}

// Render Workspace
function renderWorkspace() {
    if (uploadSection) uploadSection.classList.add('hidden');
    if (workspaceSection) workspaceSection.classList.remove('hidden');
    if (btnNewBook) btnNewBook.classList.remove('hidden');

    if (bookTitle) bookTitle.textContent = currentBook.title || 'Untitled Book';
    if (bookAuthor) bookAuthor.textContent = currentBook.author || 'Unknown Author';
    if (statPages) statPages.textContent = `${currentBook.total_pages} Pages`;
    if (statChapters) statChapters.textContent = `${currentBook.chapters.length} Chapters`;
    if (statWords) statWords.textContent = `${currentBook.total_words.toLocaleString()} Words`;
    
    const estMins = Math.round(currentBook.estimated_total_duration_sec / 60);
    if (statEstDuration) statEstDuration.textContent = `~${estMins} mins listen time`;
    if (chapterCountBadge) chapterCountBadge.textContent = `${currentBook.chapters.length} Items`;

    renderChaptersList();
    if (window.lucide) lucide.createIcons();
}

// Render Chapter Cards with Glassmorphism
function renderChaptersList() {
    if (!chaptersContainer) return;
    chaptersContainer.innerHTML = '';

    currentBook.chapters.forEach(chap => {
        const card = document.createElement('div');
        card.id = `chapter-card-${chap.id}`;
        
        const isPlayingThis = (currentPlayingChapterId === chap.id && isPlaying && !isPaused);
        const estMins = Math.max(1, Math.round(chap.estimated_duration_sec / 60));

        card.className = `chapter-card glass-panel rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${isPlayingThis ? 'active-playing ring-2 ring-indigo-500/80' : 'hover:border-indigo-500/40'}`;

        let statusBadge = '';
        if (isPlayingThis) {
            statusBadge = `
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-2 animate-pulse">
                    <span class="w-2 h-2 rounded-full bg-indigo-400"></span> Playing
                </span>`;
        } else {
            statusBadge = `
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Ready
                </span>`;
        }

        card.innerHTML = `
            <div class="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-500/30 flex items-center justify-center text-xs font-mono font-bold text-indigo-300 flex-shrink-0 shadow-inner">
                    ${chap.id}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2.5 flex-wrap">
                        <h4 class="text-sm sm:text-base font-bold text-white truncate max-w-md">${chap.title}</h4>
                        <span id="badge-status-${chap.id}">${statusBadge}</span>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-slate-400 pt-1 font-medium">
                        <span>Pages ${chap.start_page}-${chap.end_page}</span>
                        <span>•</span>
                        <span>${chap.word_count.toLocaleString()} words</span>
                        <span>•</span>
                        <span>~${estMins} min listen</span>
                    </div>
                </div>
            </div>

            <!-- Chapter Action Buttons -->
            <div class="flex items-center gap-2.5 flex-shrink-0 self-end sm:self-center">
                <!-- Listen Button -->
                <button onclick="playChapterAudio(${chap.id})" class="px-5 py-2 rounded-2xl ${isPlayingThis ? 'bg-amber-600 hover:bg-amber-500' : 'btn-neon-glow'} text-white text-xs font-bold flex items-center gap-2 transition shadow-lg active:scale-95">
                    <i data-lucide="${isPlayingThis ? 'pause' : 'play'}" class="w-3.5 h-3.5 fill-current"></i>
                    <span>${isPlayingThis ? 'Pause' : 'Listen'}</span>
                </button>

                <!-- Edit / Read Text Button -->
                <button onclick="openTextModal(${chap.id})" class="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs transition" title="Inspect & Edit Text">
                    <i data-lucide="file-text" class="w-4 h-4"></i>
                </button>
            </div>
        `;

        chaptersContainer.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
}

// Master Play Chapter Function
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

    // Show Audio Dock
    if (audioPlayerBar) audioPlayerBar.classList.remove('hidden');
    if (playerTrackTitle) playerTrackTitle.textContent = chap.title;
    if (playerTrackSubtitle) playerTrackSubtitle.textContent = `${currentBook.title} • ${chap.word_count.toLocaleString()} words`;
    if (playerTotalTime) playerTotalTime.textContent = formatTime(chap.estimated_duration_sec);
    if (playerCurrentTime) playerCurrentTime.textContent = '00:00';
    if (playerProgress) playerProgress.value = 0;

    startTimer();
    speakCurrentSentence();
    renderChaptersList();
}

// Speak the current sentence in the queue
function speakCurrentSentence() {
    if (!('speechSynthesis' in window) || !isPlaying || isPaused) return;

    if (currentSentenceIndex >= sentenceQueue.length) {
        // Chapter finished
        stopSpeech();
        if (playerProgress) playerProgress.value = 100;
        playNextChapter();
        return;
    }

    const sentence = sentenceQueue[currentSentenceIndex];
    if (!sentence || !sentence.trim()) {
        currentSentenceIndex++;
        speakCurrentSentence();
        return;
    }

    // Update Scrubber
    if (playerProgress && sentenceQueue.length > 0) {
        const pct = Math.round((currentSentenceIndex / sentenceQueue.length) * 100);
        playerProgress.value = pct;
    }

    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(sentence);
    const selectedVoiceName = voiceSelect.value;
    const match = window.speechSynthesis.getVoices().find(v => v.name === selectedVoiceName);
    if (match) utter.voice = match;

    const baseSpeed = playbackSpeeds[currentSpeedIndex];
    const pitchOffset = parseInt(pitchSlider.value);
    
    utter.rate = baseSpeed * (1 + parseInt(rateSlider.value) / 100);
    utter.pitch = 1 + pitchOffset / 50;
    utter.volume = volumeSlider ? parseFloat(volumeSlider.value) : 1.0;

    utter.onend = () => {
        currentSentenceIndex++;
        speakCurrentSentence();
    };

    utter.onerror = (e) => {
        console.warn('Speech synthesis error:', e);
        currentSentenceIndex++;
        setTimeout(() => speakCurrentSentence(), 100);
    };

    window._activeUtterance = utter; // Prevent GC
    window.speechSynthesis.speak(utter);
    updatePlayerUIState(true);
}

function togglePlayPause() {
    if (!currentPlayingChapterId) {
        if (currentBook && currentBook.chapters.length > 0) {
            playChapterAudio(currentBook.chapters[0].id);
        }
        return;
    }

    if (isPlaying && !isPaused) {
        // Pause
        isPaused = true;
        window.speechSynthesis.pause();
        stopTimer();
        updatePlayerUIState(false);
    } else if (isPlaying && isPaused) {
        // Resume
        isPaused = false;
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
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
    if (playIcon) {
        playIcon.setAttribute('data-lucide', isSpeaking ? 'pause' : 'play');
    }
    if (btnPlayerPlayPause) {
        btnPlayerPlayPause.innerHTML = `<i data-lucide="${isSpeaking ? 'pause' : 'play'}" class="w-5 h-5 fill-current"></i>`;
    }
    if (playerEqualizer) {
        playerEqualizer.classList.toggle('hidden', !isSpeaking);
    }
    if (window.lucide) lucide.createIcons();
    if (currentBook) renderChaptersList();
}

function stopSpeech() {
    isPlaying = false;
    isPaused = false;
    sentenceQueue = [];
    currentSentenceIndex = 0;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    stopTimer();
    updatePlayerUIState(false);
}

function playNextChapter() {
    if (!currentBook || !currentPlayingChapterId) return;
    const currentIndex = currentBook.chapters.findIndex(c => c.id === currentPlayingChapterId);
    if (currentIndex >= 0 && currentIndex + 1 < currentBook.chapters.length) {
        playChapterAudio(currentBook.chapters[currentIndex + 1].id);
    }
}

function playPreviousChapter() {
    if (!currentBook || !currentPlayingChapterId) return;
    const currentIndex = currentBook.chapters.findIndex(c => c.id === currentPlayingChapterId);
    if (currentIndex > 0) {
        playChapterAudio(currentBook.chapters[currentIndex - 1].id);
    }
}

function startTimer() {
    if (audioTimer) clearInterval(audioTimer);
    audioTimer = setInterval(() => {
        if (isPlaying && !isPaused) {
            secondsElapsed++;
            if (playerCurrentTime) playerCurrentTime.textContent = formatTime(secondsElapsed);
        }
    }, 1000);
}

function stopTimer() {
    if (audioTimer) {
        clearInterval(audioTimer);
        audioTimer = null;
    }
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Modal View / Edit Text
function openTextModal(chapId) {
    const chap = currentBook.chapters.find(c => c.id === chapId);
    if (!chap) return;

    activeModalChapterId = chapId;
    if (modalChapterTitle) modalChapterTitle.textContent = `Inspect Chapter ${chap.id}`;
    if (modalInputTitle) modalInputTitle.value = chap.title;
    if (modalInputText) modalInputText.value = chap.text;
    if (textModal) textModal.classList.remove('hidden');
}

function closeModal() {
    if (textModal) textModal.classList.add('hidden');
    activeModalChapterId = null;
}

function saveModalChapter() {
    if (!currentBook || !activeModalChapterId) return;

    const newTitle = modalInputTitle.value.trim();
    const newText = modalInputText.value.trim();

    const chap = currentBook.chapters.find(c => c.id === activeModalChapterId);
    if (chap) {
        chap.title = newTitle;
        chap.text = newText;
        chap.word_count = newText.split(/\s+/).filter(Boolean).length;
        chap.estimated_duration_sec = Math.round((chap.word_count / 150) * 60);
    }
    renderWorkspace();
    closeModal();
}
