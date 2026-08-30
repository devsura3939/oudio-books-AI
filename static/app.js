// AudioRead Studio - Frontend Application Logic

let currentBook = null;
let voices = [];
let eventSource = null;
let currentPlayingChapterId = null;
let playbackSpeeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
let currentSpeedIndex = 1;
let activeModalChapterId = null;

// DOM Elements
const dropZone = document.getElementById('dropZone');
const pdfFileInput = document.getElementById('pdfFileInput');
const uploadingState = document.getElementById('uploadingState');
const uploadSection = document.getElementById('uploadSection');
const workspaceSection = document.getElementById('workspaceSection');
const btnNewBook = document.getElementById('btnNewBook');

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    fetchVoices();
    setupEventListeners();
});

// Setup All Event Listeners
function setupEventListeners() {
    // Dropzone
    dropZone.addEventListener('click', () => pdfFileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-indigo-400', 'bg-indigo-950/40');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-indigo-400', 'bg-indigo-950/40');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-400', 'bg-indigo-950/40');
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    pdfFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    btnNewBook.addEventListener('click', () => {
        if (confirm('Start over and upload a new book?')) {
            uploadSection.classList.remove('hidden');
            workspaceSection.classList.add('hidden');
            btnNewBook.classList.add('hidden');
            currentBook = null;
            if (eventSource) eventSource.close();
            globalAudioPlayer.pause();
            audioPlayerBar.classList.add('hidden');
        }
    });

    // Speed / Rate Slider
    rateSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        const multiplier = (1 + val / 100).toFixed(2);
        rateLabel.textContent = ${multiplier}x;
    });

    // Pitch Slider
    pitchSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        pitchLabel.textContent = ${val > 0 ? '+' : ''} Hz;
    });

    // Preview Voice
    btnPreviewVoice.addEventListener('click', async () => {
        const voice = voiceSelect.value;
        const rate = getFormattedRate();
        const pitch = getFormattedPitch();
        btnPreviewVoice.innerHTML = <i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Loading...;
        lucide.createIcons();
        try {
            const res = await fetch('/api/voices/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voice, rate, pitch })
            });
            const data = await res.json();
            if (data.preview_url) {
                previewAudioPlayer.src = data.preview_url;
                previewAudioPlayer.play();
            }
        } catch (err) {
            alert('Voice preview failed: ' + err.message);
        } finally {
            btnPreviewVoice.innerHTML = <i data-lucide="play-circle" class="w-3.5 h-3.5"></i> Test Voice;
            lucide.createIcons();
        }
    });

    // Convert All
    btnConvertAll.addEventListener('click', () => {
        if (!currentBook) return;
        startTTSGeneration();
    });

    // Download Full Zip
    btnDownloadZip.addEventListener('click', () => {
        if (!currentBook) return;
        window.location.href = /api/download/zip/;
    });

    // Modal
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);
    btnSaveModal.addEventListener('click', saveModalChapter);

    // Audio Player Controls
    btnPlayerPlayPause.addEventListener('click', togglePlayPause);
    btnPlayerRewind.addEventListener('click', () => {
        globalAudioPlayer.currentTime = Math.max(0, globalAudioPlayer.currentTime - 15);
    });
    btnPlayerForward.addEventListener('click', () => {
        globalAudioPlayer.currentTime = Math.min(globalAudioPlayer.duration, globalAudioPlayer.currentTime + 15);
    });
    btnPlayerPrev.addEventListener('click', playPreviousChapter);
    btnPlayerNext.addEventListener('click', playNextChapter);

    globalAudioPlayer.addEventListener('timeupdate', updateAudioProgress);
    globalAudioPlayer.addEventListener('ended', playNextChapter);
    globalAudioPlayer.addEventListener('loadedmetadata', () => {
        playerTotalTime.textContent = formatTime(globalAudioPlayer.duration);
    });

    playerProgress.addEventListener('input', (e) => {
        if (globalAudioPlayer.duration) {
            const seekTime = (e.target.value / 100) * globalAudioPlayer.duration;
            globalAudioPlayer.currentTime = seekTime;
        }
    });

    // Playback speed
    btnPlaybackSpeed.addEventListener('click', () => {
        currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
        const speed = playbackSpeeds[currentSpeedIndex];
        globalAudioPlayer.playbackRate = speed;
        btnPlaybackSpeed.textContent = ${speed}x;
    });

    // Volume
    volumeSlider.addEventListener('input', (e) => {
        globalAudioPlayer.volume = e.target.value;
        updateVolumeIcon(e.target.value);
    });

    btnMute.addEventListener('click', () => {
        globalAudioPlayer.muted = !globalAudioPlayer.muted;
        updateVolumeIcon(globalAudioPlayer.muted ? 0 : globalAudioPlayer.volume);
    });
}

function updateVolumeIcon(vol) {
    if (vol == 0) {
        btnMute.innerHTML = <i data-lucide="volume-x" class="w-4 h-4 text-red-400"></i>;
    } else if (vol < 0.5) {
        btnMute.innerHTML = <i data-lucide="volume-1" class="w-4 h-4"></i>;
    } else {
        btnMute.innerHTML = <i data-lucide="volume-2" class="w-4 h-4"></i>;
    }
    lucide.createIcons();
}

function getFormattedRate() {
    const val = parseInt(rateSlider.value);
    return ${val >= 0 ? '+' : ''}%;
}

function getFormattedPitch() {
    const val = parseInt(pitchSlider.value);
    return ${val >= 0 ? '+' : ''}Hz;
}

// Fetch Voices
async function fetchVoices() {
    try {
        const res = await fetch('/api/voices');
        voices = await res.json();
        renderVoiceOptions();
    } catch (err) {
        console.error('Failed to load voices:', err);
    }
}

function renderVoiceOptions() {
    voiceSelect.innerHTML = '';
    
    // Group featured vs others
    const featured = voices.filter(v => v.friendly_name.includes('🌟') || v.short_name.includes('Neural'));
    
    voices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.short_name;
        opt.textContent = v.friendly_name;
        if (v.short_name === 'en-US-ChristopherNeural') {
            opt.selected = true;
        }
        voiceSelect.appendChild(opt);
    });
}

// Handle PDF Upload
async function handleFileUpload(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert('Please select a valid PDF file.');
        return;
    }

    uploadingState.classList.remove('hidden');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to parse PDF');
        }

        currentBook = await res.json();
        renderWorkspace();
        initProgressSSE(currentBook.id);

    } catch (err) {
        alert('Error parsing PDF: ' + err.message);
    } finally {
        uploadingState.classList.add('hidden');
        pdfFileInput.value = '';
    }
}

// Render Workspace
function renderWorkspace() {
    uploadSection.classList.add('hidden');
    workspaceSection.classList.remove('hidden');
    btnNewBook.classList.remove('hidden');

    bookTitle.textContent = currentBook.title || 'Untitled Book';
    bookAuthor.textContent = currentBook.author || 'Unknown Author';
    statPages.textContent = ${currentBook.total_pages} Pages;
    statChapters.textContent = ${currentBook.chapters.length} Chapters;
    statWords.textContent = ${currentBook.total_words.toLocaleString()} Words;
    
    const estMins = Math.round(currentBook.estimated_total_duration_sec / 60);
    statEstDuration.textContent = ~ mins listen time;
    chapterCountBadge.textContent = ${currentBook.chapters.length} Items;

    renderChaptersList();
    checkZipAvailability();
    lucide.createIcons();
}

function renderChaptersList() {
    chaptersContainer.innerHTML = '';

    currentBook.chapters.forEach(chap => {
        const card = document.createElement('div');
        card.id = chapter-card-;
        card.className = chapter-card bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ;

        const isCompleted = chap.status === 'completed';
        const isProcessing = chap.status === 'processing';
        const isError = chap.status === 'error';
        const estMins = Math.max(1, Math.round(chap.estimated_duration_sec / 60));

        let statusBadge = '';
        if (isCompleted) {
            statusBadge = <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Ready</span>;
        } else if (isProcessing) {
            statusBadge = <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5"><i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Generating %</span>;
        } else if (isError) {
            statusBadge = <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1.5"><i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> Error</span>;
        } else {
            statusBadge = <span class="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">Idle</span>;
        }

        card.innerHTML = 
            <div class="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                <div class="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-indigo-400 flex-shrink-0">
                    
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h4 class="text-sm sm:text-base font-bold text-white truncate max-w-md"></h4>
                        <span id="badge-status-"></span>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-slate-400 pt-1 font-medium">
                        <span>Pages -</span>
                        <span>•</span>
                        <span> words</span>
                        <span>•</span>
                        <span>~ min listen</span>
                    </div>
                    <!-- Live progress bar (visible when processing) -->
                    <div id="progress-bar-wrap-" class=" mt-2 w-full max-w-md bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div id="progress-bar-" class="bg-indigo-500 h-full transition-all duration-300" style="width: %"></div>
                    </div>
                </div>
            </div>

            <!-- Chapter Action Buttons -->
            <div class="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <!-- Play Audio Button -->
                <button onclick="playChapterAudio()" id="btn-play-chap-" class=" px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-indigo-600/20">
                    <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i> Listen
                </button>

                <!-- Generate Single Chapter Button -->
                <button onclick="synthesizeSingleChapter()" id="btn-gen-chap-" class=" px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition">
                    <i data-lucide="zap" class="w-3.5 h-3.5 text-indigo-400"></i> 
                </button>

                <!-- Edit Text Button -->
                <button onclick="openTextModal()" class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition" title="Inspect & Edit Text">
                    <i data-lucide="file-edit" class="w-4 h-4"></i>
                </button>

                <!-- Download MP3 -->
                <a href="" download id="link-download-" class=" p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-indigo-400 border border-slate-700 text-xs transition" title="Download Chapter MP3">
                    <i data-lucide="download" class="w-4 h-4"></i>
                </a>
            </div>
        ;

        chaptersContainer.appendChild(card);
    });

    lucide.createIcons();
}

// Start TTS Generation
async function startTTSGeneration(chapterIds = null) {
    if (!currentBook) return;

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

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to queue generation');
        }

        // Set UI to processing
        const targets = chapterIds ? currentBook.chapters.filter(c => chapterIds.includes(c.id)) : currentBook.chapters;
        targets.forEach(c => {
            if (c.status !== 'completed') {
                c.status = 'processing';
                c.progress = 0;
            }
        });
        renderChaptersList();

    } catch (err) {
        alert('Generation failed: ' + err.message);
    }
}

function synthesizeSingleChapter(chapId) {
    startTTSGeneration([chapId]);
}

// Server-Sent Events for Real-Time Progress
function initProgressSSE(bookId) {
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource(/api/progress/);

    eventSource.onmessage = (e) => {
        try {
            const payload = JSON.parse(e.data);
            handleProgressEvent(payload);
        } catch (err) {
            console.error('SSE parse error:', err);
        }
    };

    eventSource.onerror = (err) => {
        console.warn('SSE connection closed or re-connecting...');
    };
}

function handleProgressEvent(data) {
    if (data.event === 'chapter_start' || data.event === 'chapter_progress') {
        const chap = currentBook.chapters.find(c => c.id === data.chapter_id);
        if (chap) {
            chap.status = 'processing';
            chap.progress = data.progress;
            
            const badge = document.getElementById(adge-status-);
            if (badge) {
                badge.innerHTML = <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5"><i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Generating %</span>;
                lucide.createIcons();
            }

            const wrap = document.getElementById(progress-bar-wrap-);
            const bar = document.getElementById(progress-bar-);
            if (wrap && bar) {
                wrap.classList.remove('hidden');
                bar.style.width = ${data.progress}%;
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
    btnDownloadZip.disabled = !hasCompleted;
}

// Audio Player Functionality
function playChapterAudio(chapId) {
    const chap = currentBook.chapters.find(c => c.id === chapId);
    if (!chap || !chap.audio_url) return;

    currentPlayingChapterId = chapId;
    audioPlayerBar.classList.remove('hidden');

    playerTrackTitle.textContent = ${chap.title};
    playerTrackSubtitle.textContent = ${currentBook.title} • ;
    btnDownloadCurrent.href = chap.audio_url;

    globalAudioPlayer.src = chap.audio_url;
    globalAudioPlayer.play().catch(e => console.warn('Autoplay blocked:', e));

    updatePlayPauseIcon(true);
    renderChaptersList();
}

function togglePlayPause() {
    if (globalAudioPlayer.paused) {
        globalAudioPlayer.play();
        updatePlayPauseIcon(true);
    } else {
        globalAudioPlayer.pause();
        updatePlayPauseIcon(false);
    }
}

function updatePlayPauseIcon(isPlaying) {
    if (isPlaying) {
        btnPlayerPlayPause.innerHTML = <i data-lucide="pause" class="w-5 h-5 fill-current"></i>;
    } else {
        btnPlayerPlayPause.innerHTML = <i data-lucide="play" class="w-5 h-5 fill-current"></i>;
    }
    lucide.createIcons();
}

function playNextChapter() {
    if (!currentBook || !currentPlayingChapterId) return;
    const completedChapters = currentBook.chapters.filter(c => c.status === 'completed');
    const currentIndex = completedChapters.findIndex(c => c.id === currentPlayingChapterId);
    if (currentIndex >= 0 && currentIndex + 1 < completedChapters.length) {
        playChapterAudio(completedChapters[currentIndex + 1].id);
    }
}

function playPreviousChapter() {
    if (!currentBook || !currentPlayingChapterId) return;
    const completedChapters = currentBook.chapters.filter(c => c.status === 'completed');
    const currentIndex = completedChapters.findIndex(c => c.id === currentPlayingChapterId);
    if (currentIndex > 0) {
        playChapterAudio(completedChapters[currentIndex - 1].id);
    }
}

function updateAudioProgress() {
    if (!globalAudioPlayer.duration) return;
    const percent = (globalAudioPlayer.currentTime / globalAudioPlayer.duration) * 100;
    playerProgress.value = percent;
    playerCurrentTime.textContent = formatTime(globalAudioPlayer.currentTime);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return ${mins.toString().padStart(2, '0')}:;
}

// Modal Edit
function openTextModal(chapId) {
    const chap = currentBook.chapters.find(c => c.id === chapId);
    if (!chap) return;

    activeModalChapterId = chapId;
    modalChapterTitle.textContent = Edit Chapter ;
    modalInputTitle.value = chap.title;
    modalInputText.value = chap.text;
    textModal.classList.remove('hidden');
}

function closeModal() {
    textModal.classList.add('hidden');
    activeModalChapterId = null;
}

async function saveModalChapter() {
    if (!currentBook || !activeModalChapterId) return;

    const newTitle = modalInputTitle.value.trim();
    const newText = modalInputText.value.trim();

    try {
        const res = await fetch(/api/book//chapter/, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle, text: newText })
        });

        if (!res.ok) throw new Error('Failed to update chapter');

        const updated = await res.json();
        const index = currentBook.chapters.findIndex(c => c.id === activeModalChapterId);
        if (index >= 0) {
            currentBook.chapters[index] = updated;
        }

        renderWorkspace();
        closeModal();
    } catch (err) {
        alert('Error saving chapter: ' + err.message);
    }
}
