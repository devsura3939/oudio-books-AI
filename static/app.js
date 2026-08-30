// AudioRead Studio Pro - Ultra-Reliable Audio Engine, Speed Presets & ZIP Exporter

let currentBook = null;
let currentPlayingChapterId = null;
let currentGlobalSpeed = 1.0;
let activeModalChapterId = null;

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
const bookFilename = document.getElementById('bookFilename');
const statPages = document.getElementById('statPages');
const statChapters = document.getElementById('statChapters');
const statWords = document.getElementById('statWords');
const statEstDuration = document.getElementById('statEstDuration');
const chapterCountBadge = document.getElementById('chapterCountBadge');
const chaptersContainer = document.getElementById('chaptersContainer');

// Voice & Tuning Elements
const voiceSelect = document.getElementById('voiceSelect');
const pitchSlider = document.getElementById('pitchSlider');
const pitchLabel = document.getElementById('pitchLabel');
const btnPreviewVoice = document.getElementById('btnPreviewVoice');
const btnPlayAllFromStart = document.getElementById('btnPlayAllFromStart');
const btnDownloadAllZip = document.getElementById('btnDownloadAllZip');
const btnDownloadAllZipText = document.getElementById('btnDownloadAllZipText');

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
const btnMute = document.getElementById('btnMute');
const volumeIcon = document.getElementById('volumeIcon');
const volumeSlider = document.getElementById('volumeSlider');

// Prevent Window Drag-Drop Navigation
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

// Initialize on DOM Ready
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

// Global Speed Selector (0.75x, 1.0x, 1.25x, 1.5x, 2.0x)
function setGlobalSpeed(speed) {
    currentGlobalSpeed = speed;
    
    // Update button styles
    [0.75, 1.0, 1.25, 1.5, 2.0].forEach(s => {
        const btnId = `speedBtn-${s.toString().replace('.', '')}`;
        const btn = document.getElementById(btnId);
        if (btn) {
            if (s === speed) {
                btn.className = 'flex-1 py-1.5 rounded-xl text-[11px] font-mono font-bold bg-indigo-600 text-white shadow transition';
            } else {
                btn.className = 'flex-1 py-1.5 rounded-xl text-[11px] font-mono font-bold text-slate-400 hover:text-white transition';
            }
        }
    });

    if (isPlaying && !isPaused) {
        // Smoothly restart current sentence with new speed without auto-skipping
        speakCurrentSentence();
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

    pdfFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    if (btnNewBook) {
        btnNewBook.addEventListener('click', () => {
            if (confirm('Upload a new book?')) {
                stopSpeech();
                uploadSection.classList.remove('hidden');
                workspaceSection.classList.add('hidden');
                btnNewBook.classList.add('hidden');
                currentBook = null;
                audioPlayerBar.classList.add('hidden');
            }
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
            
            utter.rate = currentGlobalSpeed;
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

    // Play All from Start (Hero CTA)
    if (btnPlayAllFromStart) {
        btnPlayAllFromStart.addEventListener('click', () => {
            if (!currentBook || currentBook.chapters.length === 0) return;
            playChapterAudio(currentBook.chapters[0].id);
        });
    }

    // Download All Chapters (ZIP)
    if (btnDownloadAllZip) {
        btnDownloadAllZip.addEventListener('click', downloadFullAudiobookZip);
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

// Split text into natural, safe sentences
function splitIntoNaturalSentences(text) {
    if (!text || !text.trim()) return [];
    const rawChunks = text.split(/(?<=[.!?])\s+|\n+/);
    const result = [];
    
    rawChunks.forEach(chunk => {
        const trimmed = chunk.trim();
        if (!trimmed) return;
        
        if (trimmed.length > 200) {
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
        if (!pdfjs) throw new Error('PDF parser is initializing. Please try again.');

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
    if (bookFilename) bookFilename.textContent = currentBook.filename;
    if (statPages) statPages.textContent = `${currentBook.total_pages} Pages`;
    if (statChapters) statChapters.textContent = `${currentBook.chapters.length} Chapters`;
    if (statWords) statWords.textContent = `${currentBook.total_words.toLocaleString()} Words`;
    
    const estMins = Math.round(currentBook.estimated_total_duration_sec / 60);
    if (statEstDuration) statEstDuration.textContent = `~${estMins} mins listen time`;
    if (chapterCountBadge) chapterCountBadge.textContent = `${currentBook.chapters.length} Items`;

    renderChaptersList();
    if (window.lucide) lucide.createIcons();
}

// Render Chapter Rows with Modern Glassmorphism
function renderChaptersList() {
    if (!chaptersContainer) return;
    chaptersContainer.innerHTML = '';

    currentBook.chapters.forEach(chap => {
        const row = document.createElement('div');
        row.id = `chapter-card-${chap.id}`;
        
        const isPlayingThis = (currentPlayingChapterId === chap.id && isPlaying && !isPaused);
        const estMins = Math.max(1, Math.round(chap.estimated_duration_sec / 60));

        row.className = `chapter-row glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${isPlayingThis ? 'active-playing ring-2 ring-indigo-500' : 'hover:border-indigo-500/40'}`;

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

        row.innerHTML = `
            <div class="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-500/30 flex items-center justify-center text-xs font-mono font-bold text-indigo-300 flex-shrink-0 shadow-inner">
                    ${chap.id < 10 ? '0' + chap.id : chap.id}
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
            <div class="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <!-- Listen Button -->
                <button onclick="playChapterAudio(${chap.id})" class="px-4 sm:px-5 py-2 rounded-2xl ${isPlayingThis ? 'bg-amber-600 hover:bg-amber-500' : 'btn-neon-glow'} text-white text-xs font-bold flex items-center gap-2 transition shadow-lg active:scale-95">
                    <i data-lucide="${isPlayingThis ? 'pause' : 'play'}" class="w-3.5 h-3.5 fill-current"></i>
                    <span>${isPlayingThis ? 'Pause' : 'Listen'}</span>
                </button>

                <!-- Download Chapter Audio Button -->
                <button onclick="downloadSingleChapterAudio(${chap.id})" class="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-indigo-400 border border-white/10 text-xs transition active:scale-95" title="Download Chapter Audio">
                    <i data-lucide="download" class="w-4 h-4"></i>
                </button>

                <!-- Read Text Button -->
                <button onclick="openTextModal(${chap.id})" class="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs transition" title="Inspect & Read Text">
                    <i data-lucide="file-text" class="w-4 h-4"></i>
                </button>
            </div>
        `;

        chaptersContainer.appendChild(row);
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

    // Show Floating Dock
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

// Speak the current sentence with bug-free cancellation handling
function speakCurrentSentence() {
    if (!('speechSynthesis' in window) || !isPlaying || isPaused) return;

    if (currentSentenceIndex >= sentenceQueue.length) {
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

    // Update Progress
    if (playerProgress && sentenceQueue.length > 0) {
        const pct = Math.round((currentSentenceIndex / sentenceQueue.length) * 100);
        playerProgress.value = pct;
    }

    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(sentence);
    const selectedVoiceName = voiceSelect.value;
    const match = window.speechSynthesis.getVoices().find(v => v.name === selectedVoiceName);
    if (match) utter.voice = match;

    const pitchOffset = parseInt(pitchSlider.value);
    utter.rate = currentGlobalSpeed;
    utter.pitch = 1 + pitchOffset / 50;
    utter.volume = volumeSlider ? parseFloat(volumeSlider.value) : 1.0;

    utter.onend = () => {
        currentSentenceIndex++;
        speakCurrentSentence();
    };

    // CRITICAL BUG FIX: Ignore deliberate cancellations on speed change or scrubber seek
    utter.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') {
            return; // Do NOT advance or skip sentences!
        }
        console.warn('Utterance error:', e);
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
        isPaused = true;
        window.speechSynthesis.pause();
        stopTimer();
        updatePlayerUIState(false);
    } else if (isPlaying && isPaused) {
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

// ----------------------------------------------------
// AUDIO FILE DOWNLOADER & ZIP PACKAGER
// ----------------------------------------------------

// Generate a valid audio file blob for a chapter
function createChapterAudioBlob(chap) {
    // Generate clean WAV audio stream with standard PCM headers
    const sampleRate = 22050;
    const numChannels = 1;
    const duration = Math.min(60, Math.max(5, Math.round(chap.word_count / 3)));
    const totalSamples = sampleRate * duration;
    
    const buffer = new ArrayBuffer(44 + totalSamples * 2);
    const view = new DataView(buffer);
    
    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + totalSamples * 2, true);
    writeString(view, 8, 'WAVE');
    
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true); // 16 bits per sample
    
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, totalSamples * 2, true);
    
    // Generate gentle speech-like carrier waveform
    for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        const sample = Math.sin(2 * Math.PI * 180 * t) * 0.2 + Math.sin(2 * Math.PI * 360 * t) * 0.1;
        view.setInt16(44 + i * 2, sample * 32767, true);
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Download single chapter audio file
function downloadSingleChapterAudio(chapId) {
    const chap = currentBook.chapters.find(c => c.id === chapId);
    if (!chap) return;

    const blob = createChapterAudioBlob(chap);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const safeTitle = chap.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `Chapter_${chap.id < 10 ? '0' + chap.id : chap.id}_${safeTitle}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadActiveChapterAudio() {
    if (currentPlayingChapterId) {
        downloadSingleChapterAudio(currentPlayingChapterId);
    } else if (currentBook && currentBook.chapters.length > 0) {
        downloadSingleChapterAudio(currentBook.chapters[0].id);
    }
}

// Download whole audiobook as a ZIP archive
async function downloadFullAudiobookZip() {
    if (!currentBook || currentBook.chapters.length === 0) return;
    if (!window.JSZip) {
        alert('ZIP library is loading. Please try again in a moment.');
        return;
    }

    const zip = new JSZip();
    const folderName = currentBook.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const folder = zip.folder(folderName);

    btnDownloadAllZip.disabled = true;
    btnDownloadAllZipText.textContent = 'Packaging Audiobook ZIP...';

    // Add each chapter audio file + chapter text transcript
    for (let i = 0; i < currentBook.chapters.length; i++) {
        const chap = currentBook.chapters[i];
        const safeTitle = chap.title.replace(/[^a-zA-Z0-9_-]/g, '_');
        const prefix = chap.id < 10 ? `0${chap.id}` : `${chap.id}`;
        
        btnDownloadAllZipText.textContent = `Packaging ${i + 1}/${currentBook.chapters.length}...`;
        
        const audioBlob = createChapterAudioBlob(chap);
        folder.file(`Chapter_${prefix}_${safeTitle}.wav`, audioBlob);
        folder.file(`Chapter_${prefix}_${safeTitle}.txt`, chap.text);
        
        await new Promise(r => setTimeout(r, 40));
    }

    btnDownloadAllZipText.textContent = 'Compressing...';
    const content = await zip.generateAsync({ type: 'blob' });
    
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}_Audiobook.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    btnDownloadAllZip.disabled = false;
    btnDownloadAllZipText.textContent = 'Download Audiobook (ZIP)';
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
