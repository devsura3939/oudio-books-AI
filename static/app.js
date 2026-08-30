// AudioRead Studio - Full Hybrid Frontend Application Logic (FastAPI Backend + GitHub Pages In-Browser Client)

let currentBook = null;
let voices = [];
let eventSource = null;
let currentPlayingChapterId = null;
let playbackSpeeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
let currentSpeedIndex = 1;
let activeModalChapterId = null;
let isBackendAvailable = false;
let currentUtterance = null;
let isSpeechPlaying = false;

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
const previewAudioPlayer = document.getElementById('previewAudioPlayer');

// Action Buttons
const btnConvertAll = document.getElementById('btnConvertAll');
const btnDownloadZip = document.getElementById('btnDownloadZip');

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
const globalAudioPlayer = document.getElementById('globalAudioPlayer');
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
const btnDownloadCurrent = document.getElementById('btnDownloadCurrent');

// 1. PREVENT DEFAULT ON WINDOW TO STOP BROWSER FROM OPENING DROPPED PDFS
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

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        lucide.createIcons();
    }
    setupEventListeners();
    checkBackendAndLoadVoices();
});

// Detect if running with Python FastAPI backend or as standalone GitHub Pages
async function checkBackendAndLoadVoices() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('/api/voices', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            isBackendAvailable = true;
            voices = await res.json();
            if (modeText) modeText.textContent = '🚀 Python Backend Active (Edge-TTS Studio Voices)';
            if (modeBadge) modeBadge.classList.remove('hidden');
            renderVoiceOptions();
            return;
        }
    } catch (e) {
        // Backend not available (Running as static GitHub Pages)
        isBackendAvailable = false;
    }

    if (modeText) modeText.textContent = '🌐 In-Browser Speech Engine (Live GitHub Pages)';
    if (modeBadge) modeBadge.classList.remove('hidden');
    loadBrowserSpeechVoices();
}

function loadBrowserSpeechVoices() {
    if (!('speechSynthesis' in window)) {
        if (voiceSelect) voiceSelect.innerHTML = '<option>Speech synthesis not supported in this browser</option>';
        return;
    }

    function populate() {
        const synthVoices = window.speechSynthesis.getVoices();
        if (synthVoices.length === 0) return;

        voices = synthVoices.map(v => ({
            short_name: v.name,
            name: v.name,
            gender: v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha') ? 'Female' : 'Male',
            locale: v.lang,
            language: v.lang.split('-')[0],
            friendly_name: `${v.name} (${v.lang}) ${v.default ? '★' : ''}`
        }));

        renderVoiceOptions();
    }

    populate();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populate;
    }
}

function renderVoiceOptions() {
    if (!voiceSelect) return;
    voiceSelect.innerHTML = '';
    voices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.short_name;
        opt.textContent = v.friendly_name;
        if (v.short_name.includes('Christopher') || v.short_name.includes('Natural') || v.short_name.includes('Google US English') || v.friendly_name.includes('★')) {
            opt.selected = true;
        }
        voiceSelect.appendChild(opt);
    });
}

// Setup Event Listeners
function setupEventListeners() {
    if (!dropZone || !pdfFileInput) return;

    // Dropzone Drag Events
    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('border-indigo-400', 'bg-indigo-950/40');
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('border-indigo-400', 'bg-indigo-950/40');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('border-indigo-400', 'bg-indigo-950/40');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('border-indigo-400', 'bg-indigo-950/40');
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
            if (confirm('Start over and upload a new book?')) {
                uploadSection.classList.remove('hidden');
                workspaceSection.classList.add('hidden');
                btnNewBook.classList.add('hidden');
                currentBook = null;
                if (eventSource) eventSource.close();
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                globalAudioPlayer.pause();
                audioPlayerBar.classList.add('hidden');
            }
        });
    }

    // Speed / Rate Slider
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

    // Preview Voice
    if (btnPreviewVoice) {
        btnPreviewVoice.addEventListener('click', async () => {
            const voiceName = voiceSelect.value;
            const testText = "Welcome to your high quality AI audiobook studio. Reading your favorite books with natural voice.";

            if (isBackendAvailable) {
                btnPreviewVoice.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Loading...`;
                if (window.lucide) lucide.createIcons();
                try {
                    const res = await fetch('/api/voices/preview', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ voice: voiceName, rate: getFormattedRate(), pitch: getFormattedPitch() })
                    });
                    const data = await res.json();
                    if (data.preview_url) {
                        previewAudioPlayer.src = data.preview_url;
                        previewAudioPlayer.play();
                    }
                } catch (err) {
                    alert('Voice preview error: ' + err.message);
                } finally {
                    btnPreviewVoice.innerHTML = `<i data-lucide="play-circle" class="w-3.5 h-3.5"></i> Test Voice`;
                    if (window.lucide) lucide.createIcons();
                }
            } else {
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const utter = new SpeechSynthesisUtterance(testText);
                    const matchVoice = window.speechSynthesis.getVoices().find(v => v.name === voiceName);
                    if (matchVoice) utter.voice = matchVoice;
                    utter.rate = 1 + parseInt(rateSlider.value) / 100;
                    utter.pitch = 1 + parseInt(pitchSlider.value) / 50;
                    window.speechSynthesis.speak(utter);
                }
            }
        });
    }

    // Convert All
    if (btnConvertAll) {
        btnConvertAll.addEventListener('click', () => {
            if (!currentBook) return;
            startTTSGeneration();
        });
    }

    // Download Full Zip
    if (btnDownloadZip) {
        btnDownloadZip.addEventListener('click', () => {
            if (!currentBook) return;
            if (isBackendAvailable) {
                window.location.href = `/api/download/zip/${currentBook.id}`;
            } else {
                alert('ZIP download is enabled when running with the Python backend. In browser mode, you can play chapters directly in your player!');
            }
        });
    }

    // Modal
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
    if (btnSaveModal) btnSaveModal.addEventListener('click', saveModalChapter);

    // Audio Player Controls
    if (btnPlayerPlayPause) btnPlayerPlayPause.addEventListener('click', togglePlayPause);
    if (btnPlayerRewind) {
        btnPlayerRewind.addEventListener('click', () => {
            if (isBackendAvailable) {
                globalAudioPlayer.currentTime = Math.max(0, globalAudioPlayer.currentTime - 15);
            }
        });
    }
    if (btnPlayerForward) {
        btnPlayerForward.addEventListener('click', () => {
            if (isBackendAvailable) {
                globalAudioPlayer.currentTime = Math.min(globalAudioPlayer.duration, globalAudioPlayer.currentTime + 15);
            }
        });
    }
    if (btnPlayerPrev) btnPlayerPrev.addEventListener('click', playPreviousChapter);
    if (btnPlayerNext) btnPlayerNext.addEventListener('click', playNextChapter);

    if (globalAudioPlayer) {
        globalAudioPlayer.addEventListener('timeupdate', updateAudioProgress);
        globalAudioPlayer.addEventListener('ended', playNextChapter);
        globalAudioPlayer.addEventListener('loadedmetadata', () => {
            if (playerTotalTime) playerTotalTime.textContent = formatTime(globalAudioPlayer.duration);
        });
    }

    if (playerProgress) {
        playerProgress.addEventListener('input', (e) => {
            if (isBackendAvailable && globalAudioPlayer.duration) {
                const seekTime = (e.target.value / 100) * globalAudioPlayer.duration;
                globalAudioPlayer.currentTime = seekTime;
            }
        });
    }

    // Playback speed
    if (btnPlaybackSpeed) {
        btnPlaybackSpeed.addEventListener('click', () => {
            currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
            const speed = playbackSpeeds[currentSpeedIndex];
            globalAudioPlayer.playbackRate = speed;
            btnPlaybackSpeed.textContent = `${speed}x`;
            if (!isBackendAvailable && isSpeechPlaying && currentPlayingChapterId) {
                playChapterAudio(currentPlayingChapterId);
            }
        });
    }

    // Volume
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            globalAudioPlayer.volume = e.target.value;
            updateVolumeIcon(e.target.value);
        });
    }

    if (btnMute) {
        btnMute.addEventListener('click', () => {
            globalAudioPlayer.muted = !globalAudioPlayer.muted;
            updateVolumeIcon(globalAudioPlayer.muted ? 0 : globalAudioPlayer.volume);
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

function getFormattedRate() {
    const val = parseInt(rateSlider.value);
    return `${val >= 0 ? '+' : ''}${val}%`;
}

function getFormattedPitch() {
    const val = parseInt(pitchSlider.value);
    return `${val >= 0 ? '+' : ''}${val}Hz`;
}

// Handle PDF Upload (Backend or In-Browser PDF.js)
async function handleFileUpload(file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Please select a valid PDF eBook file (.pdf).');
        return;
    }

    if (uploadingState) uploadingState.classList.remove('hidden');

    if (isBackendAvailable) {
        // Upload to Python backend
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to parse PDF');
            }
            currentBook = await res.json();
            renderWorkspace();
            initProgressSSE(currentBook.id);
        } catch (err) {
            console.warn('Backend parse failed, falling back to browser PDF.js:', err);
            await parsePdfInBrowser(file);
        } finally {
            if (uploadingState) uploadingState.classList.add('hidden');
            if (pdfFileInput) pdfFileInput.value = '';
        }
    } else {
        await parsePdfInBrowser(file);
        if (uploadingState) uploadingState.classList.add('hidden');
        if (pdfFileInput) pdfFileInput.value = '';
    }
}

// Client-side PDF Parser using PDF.js
async function parsePdfInBrowser(file) {
    try {
        const pdfjs = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
        if (!pdfjs) {
            throw new Error('PDF.js library is still loading, please try again in a moment.');
        }

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        
        const totalPages = pdfDoc.numPages;
        const pageTexts = [];
        
        for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageStr = textContent.items.map(item => item.str).join(' ');
            pageTexts.push(cleanText(pageStr));
        }

        // Detect Chapters using Regex
        const chapters = [];
        const chapterRegex = /^\s*(chapter\s+(?:[0-9]+|[ivxlcdm]+)|part\s+(?:[0-9]+|[ivxlcdm]+)|prologue|epilogue|introduction)\b/i;
        
        let currentChap = null;
        let chapId = 1;

        pageTexts.forEach((pText, idx) => {
            const pNum = idx + 1;
            const lines = pText.split('\n');
            let foundHeading = null;
            for (let line of lines) {
                if (chapterRegex.test(line.trim())) {
                    foundHeading = line.trim();
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
                    status: 'idle',
                    progress: 0
                };
            } else {
                if (currentChap) {
                    currentChap.end_page = pNum;
                    currentChap.text += '\n\n' + pText;
                } else if (idx === 0) {
                    currentChap = {
                        id: chapId++,
                        title: `Section 1 (Pages 1-${totalPages})`,
                        start_page: 1,
                        end_page: pNum,
                        text: pText,
                        word_count: 0,
                        estimated_duration_sec: 0,
                        status: 'idle',
                        progress: 0
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
    }
}

function cleanText(text) {
    if (!text) return '';
    // Rejoin hyphenated linebreaks: e.g. "con- tinue" -> "continue"
    text = text.replace(/(\b\w+)-\s+(\w+\b)/g, '$1$2');
    // Remove standalone page numbers
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
    checkZipAvailability();
    if (window.lucide) lucide.createIcons();
}

function renderChaptersList() {
    if (!chaptersContainer) return;
    chaptersContainer.innerHTML = '';

    currentBook.chapters.forEach(chap => {
        const card = document.createElement('div');
        card.id = `chapter-card-${chap.id}`;
        card.className = `chapter-card bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${currentPlayingChapterId === chap.id ? 'active-playing' : ''}`;

        const isCompleted = chap.status === 'completed';
        const isProcessing = chap.status === 'processing';
        const isError = chap.status === 'error';
        const estMins = Math.max(1, Math.round(chap.estimated_duration_sec / 60));

        let statusBadge = '';
        if (isCompleted) {
            statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Ready</span>`;
        } else if (isProcessing) {
            statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5"><i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Synthesizing ${chap.progress || 0}%</span>`;
        } else if (isError) {
            statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1.5"><i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> Error</span>`;
        } else {
            statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">Idle</span>`;
        }

        card.innerHTML = `
            <div class="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                <div class="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-indigo-400 flex-shrink-0">
                    ${chap.id}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
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
                    <!-- Live progress bar -->
                    <div id="progress-bar-wrap-${chap.id}" class="${isProcessing ? '' : 'hidden'} mt-2 w-full max-w-md bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div id="progress-bar-${chap.id}" class="bg-indigo-500 h-full transition-all duration-300" style="width: ${chap.progress || 0}%"></div>
                    </div>
                </div>
            </div>

            <!-- Chapter Action Buttons -->
            <div class="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <!-- Play Audio Button -->
                <button onclick="playChapterAudio(${chap.id})" id="btn-play-chap-${chap.id}" class="${(isCompleted || !isBackendAvailable) ? '' : 'hidden'} px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-indigo-600/20">
                    <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i> Listen
                </button>

                <!-- Generate Single Chapter Button -->
                <button onclick="synthesizeSingleChapter(${chap.id})" id="btn-gen-chap-${chap.id}" class="${(isCompleted || !isBackendAvailable) ? 'hidden' : ''} px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition">
                    <i data-lucide="zap" class="w-3.5 h-3.5 text-indigo-400"></i> ${isError ? 'Retry' : 'Generate MP3'}
                </button>

                <!-- Edit Text Button -->
                <button onclick="openTextModal(${chap.id})" class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition" title="Inspect & Edit Text">
                    <i data-lucide="file-edit" class="w-4 h-4"></i>
                </button>

                <!-- Download MP3 -->
                <a href="${chap.audio_url || '#'}" download id="link-download-${chap.id}" class="${isCompleted && chap.audio_url ? '' : 'hidden'} p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-indigo-400 border border-slate-700 text-xs transition" title="Download Chapter MP3">
                    <i data-lucide="download" class="w-4 h-4"></i>
                </a>
            </div>
        `;

        chaptersContainer.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
}

// TTS Generation
async function startTTSGeneration(chapterIds = null) {
    if (!currentBook) return;

    if (isBackendAvailable) {
        const voice = voiceSelect.value;
        const rate = getFormattedRate();
        const pitch = getFormattedPitch();

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    book_id: currentBook.id,
                    chapter_ids: chapterIds,
                    voice: voice,
                    rate: rate,
                    pitch: pitch
                })
            });

            if (!res.ok) throw new Error('Failed to queue generation');

            const targets = chapterIds ? currentBook.chapters.filter(c => chapterIds.includes(c.id)) : currentBook.chapters;
            targets.forEach(c => {
                if (c.status !== 'completed') {
                    c.status = 'processing';
                    c.progress = 0;
                }
            });
            renderChaptersList();
        } catch (err) {
            alert('Generation error: ' + err.message);
        }
    } else {
        alert('All chapters are ready to listen directly! Click "Listen" on any chapter.');
    }
}

function synthesizeSingleChapter(chapId) {
    startTTSGeneration([chapId]);
}

// Server-Sent Events (when connected to Python backend)
function initProgressSSE(bookId) {
    if (eventSource) eventSource.close();
    eventSource = new EventSource(`/api/progress/${bookId}`);

    eventSource.onmessage = (e) => {
        try {
            const payload = JSON.parse(e.data);
            handleProgressEvent(payload);
        } catch (err) {
            console.error('SSE parse error:', err);
        }
    };
}

function handleProgressEvent(data) {
    if (data.event === 'chapter_start' || data.event === 'chapter_progress') {
        const chap = currentBook.chapters.find(c => c.id === data.chapter_id);
        if (chap) {
            chap.status = 'processing';
            chap.progress = data.progress;
            
            const badge = document.getElementById(`badge-status-${chap.id}`);
            if (badge) {
                badge.innerHTML = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5"><i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Synthesizing ${Math.round(data.progress)}%</span>`;
                if (window.lucide) lucide.createIcons();
            }

            const wrap = document.getElementById(`progress-bar-wrap-${chap.id}`);
            const bar = document.getElementById(`progress-bar-${chap.id}`);
            if (wrap && bar) {
                wrap.classList.remove('hidden');
                bar.style.width = `${data.progress}%`;
            }
        }
    } else if (data.event === 'chapter_completed') {
        const chap = currentBook.chapters.find(c => c.id === data.chapter_id);
        if (chap) {
            chap.status = 'completed';
            chap.progress = 100.0;
            chap.audio_url = data.audio_url;
            chap.audio_filename = data.audio_filename;
            
            renderChaptersList();
            checkZipAvailability();
        }
    } else if (data.event === 'chapter_error') {
        const chap = currentBook.chapters.find(c => c.id === data.chapter_id);
        if (chap) {
            chap.status = 'error';
            chap.error = data.error;
            renderChaptersList();
        }
    }
}

function checkZipAvailability() {
    const hasCompleted = currentBook && currentBook.chapters.some(c => c.status === 'completed');
    if (btnDownloadZip) btnDownloadZip.disabled = !hasCompleted;
}

// Audio Player Functionality
function playChapterAudio(chapId) {
    const chap = currentBook.chapters.find(c => c.id === chapId);
    if (!chap) return;

    currentPlayingChapterId = chapId;
    if (audioPlayerBar) audioPlayerBar.classList.remove('hidden');

    if (playerTrackTitle) playerTrackTitle.textContent = `${chap.title}`;
    if (playerTrackSubtitle) playerTrackSubtitle.textContent = `${currentBook.title} • ${currentBook.author || 'AudioRead'}`;

    if (isBackendAvailable && chap.audio_url) {
        // Backend MP3 audio stream
        if (btnDownloadCurrent) {
            btnDownloadCurrent.href = chap.audio_url;
            btnDownloadCurrent.classList.remove('hidden');
        }
        globalAudioPlayer.src = chap.audio_url;
        globalAudioPlayer.play().catch(e => console.warn('Autoplay prevented:', e));
        updatePlayPauseIcon(true);
    } else {
        // In-Browser Web Speech Synthesis
        if (btnDownloadCurrent) btnDownloadCurrent.classList.add('hidden');
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            
            currentUtterance = new SpeechSynthesisUtterance(chap.text);
            const matchVoice = window.speechSynthesis.getVoices().find(v => v.name === voiceSelect.value);
            if (matchVoice) currentUtterance.voice = matchVoice;
            const speed = playbackSpeeds[currentSpeedIndex];
            currentUtterance.rate = speed * (1 + parseInt(rateSlider.value) / 100);
            currentUtterance.pitch = 1 + parseInt(pitchSlider.value) / 50;

            currentUtterance.onboundary = (e) => {
                if (chap.text.length > 0 && playerProgress) {
                    const pct = Math.min(100, Math.round((e.charIndex / chap.text.length) * 100));
                    playerProgress.value = pct;
                }
            };

            currentUtterance.onstart = () => {
                isSpeechPlaying = true;
                updatePlayPauseIcon(true);
            };

            currentUtterance.onend = () => {
                isSpeechPlaying = false;
                updatePlayPauseIcon(false);
                playNextChapter();
            };

            currentUtterance.onerror = () => {
                isSpeechPlaying = false;
                updatePlayPauseIcon(false);
            };

            window.speechSynthesis.speak(currentUtterance);
            isSpeechPlaying = true;
            updatePlayPauseIcon(true);
        }
    }

    renderChaptersList();
}

function togglePlayPause() {
    if (isBackendAvailable) {
        if (globalAudioPlayer.paused) {
            globalAudioPlayer.play();
            updatePlayPauseIcon(true);
        } else {
            globalAudioPlayer.pause();
            updatePlayPauseIcon(false);
        }
    } else {
        if ('speechSynthesis' in window) {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
                isSpeechPlaying = true;
                updatePlayPauseIcon(true);
            } else if (window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                isSpeechPlaying = false;
                updatePlayPauseIcon(false);
            } else if (currentPlayingChapterId) {
                playChapterAudio(currentPlayingChapterId);
            }
        }
    }
}

function updatePlayPauseIcon(isPlaying) {
    if (!btnPlayerPlayPause) return;
    if (isPlaying) {
        btnPlayerPlayPause.innerHTML = `<i data-lucide="pause" class="w-5 h-5 fill-current"></i>`;
    } else {
        btnPlayerPlayPause.innerHTML = `<i data-lucide="play" class="w-5 h-5 fill-current"></i>`;
    }
    if (window.lucide) lucide.createIcons();
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

function updateAudioProgress() {
    if (!globalAudioPlayer || !globalAudioPlayer.duration) return;
    const percent = (globalAudioPlayer.currentTime / globalAudioPlayer.duration) * 100;
    if (playerProgress) playerProgress.value = percent;
    if (playerCurrentTime) playerCurrentTime.textContent = formatTime(globalAudioPlayer.currentTime);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Modal Edit
function openTextModal(chapId) {
    const chap = currentBook.chapters.find(c => c.id === chapId);
    if (!chap) return;

    activeModalChapterId = chapId;
    if (modalChapterTitle) modalChapterTitle.textContent = `Edit Chapter ${chap.id}`;
    if (modalInputTitle) modalInputTitle.value = chap.title;
    if (modalInputText) modalInputText.value = chap.text;
    if (textModal) textModal.classList.remove('hidden');
}

function closeModal() {
    if (textModal) textModal.classList.add('hidden');
    activeModalChapterId = null;
}

async function saveModalChapter() {
    if (!currentBook || !activeModalChapterId) return;

    const newTitle = modalInputTitle.value.trim();
    const newText = modalInputText.value.trim();

    if (isBackendAvailable) {
        try {
            const res = await fetch(`/api/book/${currentBook.id}/chapter/${activeModalChapterId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle, text: newText })
            });

            if (!res.ok) throw new Error('Failed to update chapter');

            const updated = await res.json();
            const index = currentBook.chapters.findIndex(c => c.id === activeModalChapterId);
            if (index >= 0) currentBook.chapters[index] = updated;

            renderWorkspace();
            closeModal();
        } catch (err) {
            alert('Error saving chapter: ' + err.message);
        }
    } else {
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
}
