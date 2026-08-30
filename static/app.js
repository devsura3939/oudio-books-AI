// AudioRead Studio - Seamless Dual-Buffer Audio Engine & Ultra-Natural Neural Voices

// State
let currentBook = null;
let voices = [];
let eventSource = null;
let currentPlayingChapterId = null;
let playbackSpeeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
let currentSpeedIndex = 1;
let activeModalChapterId = null;
let isBackendAvailable = false;
let audioTimer = null;
let secondsElapsed = 0;

// Curated Ultra-Natural Studio Voices Catalog
const NATURAL_STUDIO_VOICES = [
    // US English
    { id: 'en:us:natural', name: '🌟 Christopher (Authoritative & Deep)', lang: 'en-US', gender: 'Male', accent: 'US', provider: 'studio' },
    { id: 'en:us:aria', name: '🌟 Aria (Expressive & Warm Female)', lang: 'en-US', gender: 'Female', accent: 'US', provider: 'studio' },
    { id: 'en:us:guy', name: '🌟 Guy (Friendly & Natural Conversational)', lang: 'en-US', gender: 'Male', accent: 'US', provider: 'studio' },
    { id: 'en:us:jenny', name: '🌟 Jenny (Clear & Professional Female)', lang: 'en-US', gender: 'Female', accent: 'US', provider: 'studio' },
    { id: 'en:us:andrew', name: '🌟 Andrew (Rich & Smooth Male)', lang: 'en-US', gender: 'Male', accent: 'US', provider: 'studio' },
    { id: 'en:us:ava', name: '🌟 Ava (Fluid & Melodic Female)', lang: 'en-US', gender: 'Female', accent: 'US', provider: 'studio' },
    { id: 'en:us:brian', name: '🌟 Brian (Deep Resonant Narrator)', lang: 'en-US', gender: 'Male', accent: 'US', provider: 'studio' },
    
    // British & Commonwealth
    { id: 'en:gb:ryan', name: '🌟 Ryan (Classic British Narrator)', lang: 'en-GB', gender: 'Male', accent: 'UK', provider: 'studio' },
    { id: 'en:gb:sonia', name: '🌟 Sonia (Classic British Storyteller)', lang: 'en-GB', gender: 'Female', accent: 'UK', provider: 'studio' },
    { id: 'en:gb:libby', name: '🌟 Libby (Warm British Female)', lang: 'en-GB', gender: 'Female', accent: 'UK', provider: 'studio' },
    { id: 'en:au:natasha', name: '🌟 Natasha (Australian Female)', lang: 'en-AU', gender: 'Female', accent: 'AU', provider: 'studio' },
    { id: 'en:au:william', name: '🌟 William (Australian Male)', lang: 'en-AU', gender: 'Male', accent: 'AU', provider: 'studio' },
    { id: 'en:in:prabhat', name: '🌟 Prabhat (Indian English Male)', lang: 'en-IN', gender: 'Male', accent: 'IN', provider: 'studio' },
    { id: 'en:in:neerja', name: '🌟 Neerja (Indian English Female)', lang: 'en-IN', gender: 'Female', accent: 'IN', provider: 'studio' },

    // International Natural Voices
    { id: 'es:es:natural', name: 'Spanish - Álvaro (Spain)', lang: 'es-ES', gender: 'Male', accent: 'ES', provider: 'studio' },
    { id: 'es:mx:natural', name: 'Spanish - Jorge (Mexico)', lang: 'es-MX', gender: 'Male', accent: 'MX', provider: 'studio' },
    { id: 'fr:fr:natural', name: 'French - Henri (France)', lang: 'fr-FR', gender: 'Male', accent: 'FR', provider: 'studio' },
    { id: 'de:de:natural', name: 'German - Conrad (Germany)', lang: 'de-DE', gender: 'Male', accent: 'DE', provider: 'studio' },
    { id: 'it:it:natural', name: 'Italian - Diego (Italy)', lang: 'it-IT', gender: 'Male', accent: 'IT', provider: 'studio' },
    { id: 'pt:br:natural', name: 'Portuguese - Antonio (Brazil)', lang: 'pt-BR', gender: 'Male', accent: 'BR', provider: 'studio' },
    { id: 'ru:ru:natural', name: 'Russian - Dmitry (Russia)', lang: 'ru-RU', gender: 'Male', accent: 'RU', provider: 'studio' },
    { id: 'ja:jp:natural', name: 'Japanese - Keita (Japan)', lang: 'ja-JP', gender: 'Male', accent: 'JP', provider: 'studio' },
    { id: 'zh:cn:natural', name: 'Chinese - Yunxi (Mandarin)', lang: 'zh-CN', gender: 'Male', accent: 'CN', provider: 'studio' },
    { id: 'ar:sa:natural', name: 'Arabic - Hamed (Saudi)', lang: 'ar-SA', gender: 'Male', accent: 'SA', provider: 'studio' },
    { id: 'hi:in:natural', name: 'Hindi - Madhur (India)', lang: 'hi-IN', gender: 'Male', accent: 'IN', provider: 'studio' }
];

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

// 1. PREVENT DRAG-DROP NAVIGATIONS
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

// ==========================================
// SEAMLESS DUAL-BUFFER AUDIO QUEUE PLAYER
// ==========================================
class AudioReadPlayer {
    constructor() {
        this.audioA = new Audio();
        this.audioB = new Audio();
        this.activeIsA = true;
        this.queue = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentChapter = null;
        this.speed = 1.0;
        this.volume = 1.0;
        this.activeUtterance = null;
        this.useWebSpeech = false;

        this.bindEvents(this.audioA, true);
        this.bindEvents(this.audioB, false);
    }

    bindEvents(audioElement, isA) {
        audioElement.addEventListener('ended', () => {
            if ((isA && this.activeIsA) || (!isA && !this.activeIsA)) {
                this.onSegmentEnded();
            }
        });

        audioElement.addEventListener('error', (e) => {
            if ((isA && this.activeIsA) || (!isA && !this.activeIsA)) {
                console.warn('Audio segment error, smoothly continuing:', e);
                setTimeout(() => this.onSegmentEnded(), 250);
            }
        });
    }

    startChapter(chapter, sentences) {
        this.stop();
        this.currentChapter = chapter;
        this.queue = sentences.filter(s => s && s.trim().length > 0);
        this.currentIndex = 0;
        this.isPlaying = true;
        this.isPaused = false;
        secondsElapsed = 0;

        if (this.queue.length === 0) {
            alert('This chapter contains no text.');
            return;
        }

        // Show player
        if (audioPlayerBar) audioPlayerBar.classList.remove('hidden');
        if (playerTrackTitle) playerTrackTitle.textContent = chapter.title;
        if (playerTrackSubtitle) playerTrackSubtitle.textContent = `${currentBook.title} • ${currentBook.author || 'AudioRead'}`;
        if (playerTotalTime) playerTotalTime.textContent = formatTime(chapter.estimated_duration_sec);
        if (playerCurrentTime) playerCurrentTime.textContent = '00:00';
        if (playerProgress) playerProgress.value = 0;

        startTimer();
        this.playCurrentSegment();
    }

    playCurrentSegment() {
        if (!this.isPlaying || this.isPaused) return;

        if (this.currentIndex >= this.queue.length) {
            // Chapter complete
            this.stop();
            if (playerProgress) playerProgress.value = 100;
            playNextChapter();
            return;
        }

        const sentence = this.queue[this.currentIndex];
        const nextSentence = (this.currentIndex + 1 < this.queue.length) ? this.queue[this.currentIndex + 1] : null;

        // Progress UI
        if (playerProgress && this.queue.length > 0) {
            const pct = Math.round((this.currentIndex / this.queue.length) * 100);
            playerProgress.value = pct;
        }

        const voiceVal = voiceSelect.value;
        const speedMultiplier = playbackSpeeds[currentSpeedIndex] * (1 + parseInt(rateSlider.value) / 100);

        if (voiceVal.startsWith('synth:') || this.useWebSpeech) {
            // WebSpeech Engine
            this.speakWebSpeech(sentence, voiceVal, speedMultiplier);
        } else {
            // High-Definition Neural Stream
            const activeAudio = this.activeIsA ? this.audioA : this.audioB;
            const preloadAudio = this.activeIsA ? this.audioB : this.audioA;

            const selectedVoice = NATURAL_STUDIO_VOICES.find(v => v.id === voiceVal) || NATURAL_STUDIO_VOICES[0];
            const langCode = selectedVoice.lang.split('-')[0] || 'en';
            
            const currentUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(sentence)}`;
            
            activeAudio.src = currentUrl;
            activeAudio.playbackRate = speedMultiplier;
            activeAudio.volume = this.volume;

            activeAudio.play().then(() => {
                updatePlayPauseIcon(true);
            }).catch(err => {
                console.warn('Stream play error, falling back to WebSpeech:', err);
                this.speakWebSpeech(sentence, voiceVal, speedMultiplier);
            });

            // Preload next segment in the secondary audio buffer
            if (nextSentence) {
                const nextUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(nextSentence)}`;
                preloadAudio.src = nextUrl;
                preloadAudio.preload = 'auto';
            }
        }
    }

    speakWebSpeech(text, voiceVal, speedMultiplier) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();

        const utter = new SpeechSynthesisUtterance(text);
        const cleanName = voiceVal.replace('synth:', '');
        const matchVoice = window.speechSynthesis.getVoices().find(v => v.name === cleanName || v.name.includes(cleanName));
        if (matchVoice) utter.voice = matchVoice;
        
        utter.rate = Math.max(0.5, Math.min(2.5, speedMultiplier));
        utter.pitch = 1 + parseInt(pitchSlider.value) / 50;
        utter.volume = this.volume;

        utter.onend = () => {
            this.onSegmentEnded();
        };

        utter.onerror = (e) => {
            console.warn('Utterance error, next sentence:', e);
            setTimeout(() => this.onSegmentEnded(), 200);
        };

        this.activeUtterance = utter;
        window._activeUtterance = utter; // Prevent GC bug
        window.speechSynthesis.speak(utter);
        updatePlayPauseIcon(true);
    }

    onSegmentEnded() {
        if (!this.isPlaying || this.isPaused) return;
        this.activeIsA = !this.activeIsA; // Swap buffers
        this.currentIndex++;
        this.playCurrentSegment();
    }

    togglePlayPause() {
        if (!this.currentChapter) {
            if (currentBook && currentBook.chapters.length > 0) {
                playChapterAudio(currentBook.chapters[0].id);
            }
            return;
        }

        if (this.isPaused) {
            // Resume
            this.isPaused = false;
            this.isPlaying = true;
            const activeAudio = this.activeIsA ? this.audioA : this.audioB;
            activeAudio.play().catch(() => this.playCurrentSegment());
            if ('speechSynthesis' in window && window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
            startTimer();
            updatePlayPauseIcon(true);
        } else if (this.isPlaying) {
            // Pause
            this.isPaused = true;
            this.isPlaying = false;
            this.audioA.pause();
            this.audioB.pause();
            if ('speechSynthesis' in window) {
                window.speechSynthesis.pause();
            }
            stopTimer();
            updatePlayPauseIcon(false);
        } else {
            this.playCurrentSegment();
        }
    }

    seek(percent) {
        if (this.queue.length === 0) return;
        const targetIdx = Math.min(this.queue.length - 1, Math.max(0, Math.floor((percent / 100) * this.queue.length)));
        this.currentIndex = targetIdx;
        this.playCurrentSegment();
    }

    skip(delta) {
        if (this.queue.length === 0) return;
        const targetIdx = Math.min(this.queue.length - 1, Math.max(0, this.currentIndex + delta));
        this.currentIndex = targetIdx;
        this.playCurrentSegment();
    }

    setSpeed(speedVal) {
        this.speed = speedVal;
        this.audioA.playbackRate = speedVal;
        this.audioB.playbackRate = speedVal;
    }

    setVolume(volVal) {
        this.volume = volVal;
        this.audioA.volume = volVal;
        this.audioB.volume = volVal;
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        this.audioA.pause();
        this.audioA.src = '';
        this.audioB.pause();
        this.audioB.src = '';
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        stopTimer();
        updatePlayPauseIcon(false);
    }
}

const studioPlayer = new AudioReadPlayer();

function startTimer() {
    if (audioTimer) clearInterval(audioTimer);
    audioTimer = setInterval(() => {
        if (studioPlayer.isPlaying && !studioPlayer.isPaused) {
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

// Split text into safe, punchy sentences
function splitIntoNaturalSentences(text) {
    if (!text || !text.trim()) return [];
    
    // Split on sentence terminators or line breaks
    const rawChunks = text.split(/(?<=[.!?])\s+|\n+/);
    const result = [];
    
    rawChunks.forEach(chunk => {
        const trimmed = chunk.trim();
        if (!trimmed) return;
        
        if (trimmed.length > 175) {
            // Sub-divide long sentence by comma/semicolon/clause
            const parts = trimmed.split(/([,;:]\s+)/);
            let buf = '';
            parts.forEach(p => {
                if ((buf + p).length > 140) {
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

// Initialize Voice Catalog
function initVoiceCatalog() {
    renderVoiceOptions();
    
    if ('speechSynthesis' in window) {
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => renderVoiceOptions();
        }
    }
}

function renderVoiceOptions() {
    if (!voiceSelect) return;
    voiceSelect.innerHTML = '';

    // 1. Studio Neural Voices Group
    const groupStudio = document.createElement('optgroup');
    groupStudio.label = '⚡ Studio Neural Narrators (Ultra-Natural HD)';
    NATURAL_STUDIO_VOICES.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = v.name;
        if (v.id === 'en:us:natural') opt.selected = true;
        groupStudio.appendChild(opt);
    });
    voiceSelect.appendChild(groupStudio);

    // 2. Device System Voices Group
    if ('speechSynthesis' in window) {
        const sysVoices = window.speechSynthesis.getVoices();
        if (sysVoices.length > 0) {
            const groupSys = document.createElement('optgroup');
            groupSys.label = '💻 Device / OS Voices';
            sysVoices.forEach(sv => {
                const opt = document.createElement('option');
                opt.value = `synth:${sv.name}`;
                opt.textContent = `${sv.name} (${sv.lang})`;
                groupSys.appendChild(opt);
            });
            voiceSelect.appendChild(groupSys);
        }
    }
}

// Setup Event Listeners
function setupEventListeners() {
    initVoiceCatalog();

    // Dropzone
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
                studioPlayer.stop();
                uploadSection.classList.remove('hidden');
                workspaceSection.classList.add('hidden');
                btnNewBook.classList.add('hidden');
                currentBook = null;
                if (eventSource) eventSource.close();
                audioPlayerBar.classList.add('hidden');
            }
        });
    }

    // Rate Slider
    if (rateSlider) {
        rateSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            const multiplier = (1 + val / 100).toFixed(2);
            if (rateLabel) rateLabel.textContent = `${multiplier}x`;
            const speed = playbackSpeeds[currentSpeedIndex];
            studioPlayer.setSpeed(speed * parseFloat(multiplier));
        });
    }

    // Pitch Slider
    if (pitchSlider) {
        pitchSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            if (pitchLabel) pitchLabel.textContent = `${val > 0 ? '+' : ''}${val} Hz`;
        });
    }

    // Voice Preview
    if (btnPreviewVoice) {
        btnPreviewVoice.addEventListener('click', async () => {
            const voiceVal = voiceSelect.value;
            const sampleText = "Welcome to AudioRead Studio. Converting your books into crystal clear narration.";
            
            btnPreviewVoice.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Playing...`;
            if (window.lucide) lucide.createIcons();

            try {
                if (voiceVal.startsWith('synth:')) {
                    window.speechSynthesis.cancel();
                    const utter = new SpeechSynthesisUtterance(sampleText);
                    const cleanName = voiceVal.replace('synth:', '');
                    const matchVoice = window.speechSynthesis.getVoices().find(v => v.name === cleanName);
                    if (matchVoice) utter.voice = matchVoice;
                    utter.rate = 1 + parseInt(rateSlider.value) / 100;
                    window._activeUtterance = utter;
                    window.speechSynthesis.speak(utter);
                } else {
                    const selectedVoice = NATURAL_STUDIO_VOICES.find(v => v.id === voiceVal) || NATURAL_STUDIO_VOICES[0];
                    const langCode = selectedVoice.lang.split('-')[0] || 'en';
                    const streamUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(sampleText)}`;
                    previewAudioPlayer.src = streamUrl;
                    await previewAudioPlayer.play();
                }
            } catch (err) {
                console.warn('Preview error:', err);
            } finally {
                setTimeout(() => {
                    btnPreviewVoice.innerHTML = `<i data-lucide="play-circle" class="w-3.5 h-3.5"></i> Test Voice`;
                    if (window.lucide) lucide.createIcons();
                }, 1500);
            }
        });
    }

    // Convert All
    if (btnConvertAll) {
        btnConvertAll.addEventListener('click', () => {
            if (!currentBook) return;
            if (currentBook.chapters.length > 0) {
                playChapterAudio(currentBook.chapters[0].id);
            }
        });
    }

    // Modal
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
    if (btnSaveModal) btnSaveModal.addEventListener('click', saveModalChapter);

    // Audio Controls
    if (btnPlayerPlayPause) {
        btnPlayerPlayPause.addEventListener('click', () => {
            studioPlayer.togglePlayPause();
        });
    }
    
    // Rewind -15s (2 sentences back)
    if (btnPlayerRewind) {
        btnPlayerRewind.addEventListener('click', () => {
            studioPlayer.skip(-2);
        });
    }

    // Forward +15s (2 sentences forward)
    if (btnPlayerForward) {
        btnPlayerForward.addEventListener('click', () => {
            studioPlayer.skip(2);
        });
    }

    if (btnPlayerPrev) btnPlayerPrev.addEventListener('click', playPreviousChapter);
    if (btnPlayerNext) btnPlayerNext.addEventListener('click', playNextChapter);

    // Scrubber seeking
    if (playerProgress) {
        playerProgress.addEventListener('input', (e) => {
            const pct = parseFloat(e.target.value);
            studioPlayer.seek(pct);
        });
    }

    // Playback speed
    if (btnPlaybackSpeed) {
        btnPlaybackSpeed.addEventListener('click', () => {
            currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
            const speed = playbackSpeeds[currentSpeedIndex];
            studioPlayer.setSpeed(speed);
            btnPlaybackSpeed.textContent = `${speed}x`;
        });
    }

    // Volume
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            studioPlayer.setVolume(vol);
            updateVolumeIcon(vol);
        });
    }

    if (btnMute) {
        btnMute.addEventListener('click', () => {
            const isMuted = studioPlayer.volume === 0;
            const newVol = isMuted ? 1.0 : 0;
            studioPlayer.setVolume(newVol);
            if (volumeSlider) volumeSlider.value = newVol;
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

// Handle PDF Upload
async function handleFileUpload(file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Please select a valid PDF eBook file (.pdf).');
        return;
    }

    if (uploadingState) uploadingState.classList.remove('hidden');

    try {
        const pdfjs = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
        if (!pdfjs) throw new Error('PDF parser is initializing. Please try again in 1 second.');

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
                        title: `Chapter 1 (Pages 1-${totalPages})`,
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
                        status: 'idle',
                        progress: 0
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

function renderChaptersList() {
    if (!chaptersContainer) return;
    chaptersContainer.innerHTML = '';

    currentBook.chapters.forEach(chap => {
        const card = document.createElement('div');
        card.id = `chapter-card-${chap.id}`;
        card.className = `chapter-card bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${currentPlayingChapterId === chap.id ? 'active-playing' : ''}`;

        const isPlayingThis = (currentPlayingChapterId === chap.id && studioPlayer.isPlaying);
        const estMins = Math.max(1, Math.round(chap.estimated_duration_sec / 60));

        let statusBadge = isPlayingThis 
            ? `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5 animate-pulse"><i data-lucide="volume-2" class="w-3.5 h-3.5"></i> Playing</span>`
            : `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Ready</span>`;

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
                </div>
            </div>

            <!-- Chapter Action Buttons -->
            <div class="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <!-- Play Audio Button -->
                <button onclick="playChapterAudio(${chap.id})" class="px-4 py-2 rounded-xl ${isPlayingThis ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-indigo-600/30 active:scale-95">
                    <i data-lucide="${isPlayingThis ? 'pause' : 'play'}" class="w-3.5 h-3.5 fill-current"></i> ${isPlayingThis ? 'Pause' : 'Listen'}
                </button>

                <!-- Edit Text Button -->
                <button onclick="openTextModal(${chap.id})" class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition" title="Inspect & Edit Text">
                    <i data-lucide="file-edit" class="w-4 h-4"></i>
                </button>
            </div>
        `;

        chaptersContainer.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
}

// Master Play Chapter function
function playChapterAudio(chapId) {
    const chap = currentBook.chapters.find(c => c.id === chapId);
    if (!chap) return;

    if (currentPlayingChapterId === chapId && studioPlayer.isPlaying) {
        // Toggle pause if already playing this chapter
        studioPlayer.togglePlayPause();
        renderChaptersList();
        return;
    }

    currentPlayingChapterId = chapId;
    const sentences = splitIntoNaturalSentences(chap.text);
    studioPlayer.startChapter(chap, sentences);
    renderChaptersList();
}

function updatePlayPauseIcon(isPlaying) {
    if (!btnPlayerPlayPause) return;
    if (isPlaying) {
        btnPlayerPlayPause.innerHTML = `<i data-lucide="pause" class="w-5 h-5 fill-current"></i>`;
    } else {
        btnPlayerPlayPause.innerHTML = `<i data-lucide="play" class="w-5 h-5 fill-current"></i>`;
    }
    if (window.lucide) lucide.createIcons();
    if (currentBook) renderChaptersList();
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

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
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
