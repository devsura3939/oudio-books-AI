// AudioRead Studio - Robust Hybrid Audio Engine (Google Cloud TTS Stream + HTML5 Audio + WebSpeech Fallback)

let currentBook = null;
let voices = [];
let eventSource = null;
let currentPlayingChapterId = null;
let playbackSpeeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
let currentSpeedIndex = 1;
let activeModalChapterId = null;
let isBackendAvailable = false;

// Audio Queue & State
let sentenceQueue = [];
let currentSentenceIndex = 0;
let isAudioPlaying = false;
let playbackMode = 'stream'; // 'stream' (Google MP3 Audio) or 'synth' (WebSpeech)
let audioTimer = null;
let audioSecondsElapsed = 0;

// Prevent Chrome Garbage Collection bug for speech synthesis
window._activeUtterance = null;

// Curated Studio Voices (Google Stream + System)
const CLOUD_STUDIO_VOICES = [
    { short_name: 'google:en-US', name: 'google:en-US', locale: 'en-US', friendly_name: '🌟 Studio Natural Narrator (US English)' },
    { short_name: 'google:en-GB', name: 'google:en-GB', locale: 'en-GB', friendly_name: '🌟 Studio British Narrator (UK English)' },
    { short_name: 'google:en-AU', name: 'google:en-AU', locale: 'en-AU', friendly_name: '🌟 Studio Australian Narrator' },
    { short_name: 'google:en-IN', name: 'google:en-IN', locale: 'en-IN', friendly_name: '🌟 Studio Indian English Narrator' },
    { short_name: 'google:en-CA', name: 'google:en-CA', locale: 'en-CA', friendly_name: '🌟 Studio Canadian Narrator' },
    { short_name: 'google:es-ES', name: 'google:es-ES', locale: 'es-ES', friendly_name: 'Spanish - España (Studio Voice)' },
    { short_name: 'google:es-MX', name: 'google:es-MX', locale: 'es-MX', friendly_name: 'Spanish - México (Studio Voice)' },
    { short_name: 'google:fr-FR', name: 'google:fr-FR', locale: 'fr-FR', friendly_name: 'French - Français (Studio Voice)' },
    { short_name: 'google:de-DE', name: 'google:de-DE', locale: 'de-DE', friendly_name: 'German - Deutsch (Studio Voice)' },
    { short_name: 'google:it-IT', name: 'google:it-IT', locale: 'it-IT', friendly_name: 'Italian - Italiano (Studio Voice)' },
    { short_name: 'google:pt-BR', name: 'google:pt-BR', locale: 'pt-BR', friendly_name: 'Portuguese - Brasil (Studio Voice)' },
    { short_name: 'google:ru-RU', name: 'google:ru-RU', locale: 'ru-RU', friendly_name: 'Russian - Русский (Studio Voice)' },
    { short_name: 'google:ja-JP', name: 'google:ja-JP', locale: 'ja-JP', friendly_name: 'Japanese - 日本語 (Studio Voice)' },
    { short_name: 'google:zh-CN', name: 'google:zh-CN', locale: 'zh-CN', friendly_name: 'Chinese - 中文 (Studio Voice)' },
    { short_name: 'google:ar-SA', name: 'google:ar-SA', locale: 'ar-SA', friendly_name: 'Arabic - العربية (Studio Voice)' },
    { short_name: 'google:hi-IN', name: 'google:hi-IN', locale: 'hi-IN', friendly_name: 'Hindi - हिन्दी (Studio Voice)' }
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

// 1. PREVENT WINDOW DRAG-DROP NAVIGATIONS
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

// Chrome SpeechSynthesis heartbeat
setInterval(() => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
    }
}, 8000);

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    setupEventListeners();
    initAudioEngines();
});

async function initAudioEngines() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);
        const res = await fetch('/api/voices', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            isBackendAvailable = true;
            voices = await res.json();
            if (modeText) modeText.textContent = '🚀 Python Backend Active (Edge-TTS Studio Voices)';
            if (modeBadge) modeBadge.classList.remove('hidden');
            renderVoiceOptions(voices);
            return;
        }
    } catch (e) {
        isBackendAvailable = false;
    }

    if (modeText) modeText.textContent = '🌐 High-Definition Studio Voice Stream (100% Free)';
    if (modeBadge) modeBadge.classList.remove('hidden');

    // Combine Studio Cloud Stream Voices + Local Browser Voices
    let allVoices = [...CLOUD_STUDIO_VOICES];

    if ('speechSynthesis' in window) {
        const browserVoices = window.speechSynthesis.getVoices();
        browserVoices.forEach(v => {
            allVoices.push({
                short_name: `synth:${v.name}`,
                name: v.name,
                locale: v.lang,
                friendly_name: `Device Voice: ${v.name} (${v.lang})`
            });
        });

        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => {
                const updated = window.speechSynthesis.getVoices();
                allVoices = [...CLOUD_STUDIO_VOICES];
                updated.forEach(v => {
                    allVoices.push({
                        short_name: `synth:${v.name}`,
                        name: v.name,
                        locale: v.lang,
                        friendly_name: `Device Voice: ${v.name} (${v.lang})`
                    });
                });
                renderVoiceOptions(allVoices);
            };
        }
    }

    voices = allVoices;
    renderVoiceOptions(allVoices);
}

function renderVoiceOptions(voiceList) {
    if (!voiceSelect) return;
    voiceSelect.innerHTML = '';
    voiceList.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.short_name;
        opt.textContent = v.friendly_name;
        if (v.short_name === 'google:en-US' || v.short_name === 'en-US-ChristopherNeural') {
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
                stopAllAudio();
                uploadSection.classList.remove('hidden');
                workspaceSection.classList.add('hidden');
                btnNewBook.classList.add('hidden');
                currentBook = null;
                if (eventSource) eventSource.close();
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
            if (globalAudioPlayer) {
                const speed = playbackSpeeds[currentSpeedIndex];
                globalAudioPlayer.playbackRate = speed * parseFloat(multiplier);
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

    // Voice Preview
    if (btnPreviewVoice) {
        btnPreviewVoice.addEventListener('click', async () => {
            const voiceVal = voiceSelect.value;
            const sampleText = "Welcome to AudioRead Studio. Converting your books into crystal clear audio.";
            
            btnPreviewVoice.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Playing...`;
            if (window.lucide) lucide.createIcons();

            try {
                if (voiceVal.startsWith('google:')) {
                    const lang = voiceVal.split(':')[1] || 'en';
                    const streamUrl = getGoogleTTSUrl(sampleText, lang);
                    previewAudioPlayer.src = streamUrl;
                    await previewAudioPlayer.play();
                } else if (isBackendAvailable) {
                    const res = await fetch('/api/voices/preview', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ voice: voiceVal, rate: getFormattedRate(), pitch: getFormattedPitch() })
                    });
                    const data = await res.json();
                    if (data.preview_url) {
                        previewAudioPlayer.src = data.preview_url;
                        await previewAudioPlayer.play();
                    }
                } else {
                    // SpeechSynthesis test
                    window.speechSynthesis.cancel();
                    const utter = new SpeechSynthesisUtterance(sampleText);
                    const cleanName = voiceVal.replace('synth:', '');
                    const matchVoice = window.speechSynthesis.getVoices().find(v => v.name === cleanName);
                    if (matchVoice) utter.voice = matchVoice;
                    utter.rate = 1 + parseInt(rateSlider.value) / 100;
                    window._activeUtterance = utter;
                    window.speechSynthesis.speak(utter);
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
            if (isBackendAvailable) {
                startTTSGeneration();
            } else {
                // Instantly start Chapter 1 in Browser Audio mode
                if (currentBook.chapters.length > 0) {
                    playChapterAudio(currentBook.chapters[0].id);
                }
            }
        });
    }

    // Download Full Zip
    if (btnDownloadZip) {
        btnDownloadZip.addEventListener('click', () => {
            if (!currentBook) return;
            if (isBackendAvailable) {
                window.location.href = `/api/download/zip/${currentBook.id}`;
            } else {
                alert('ZIP bundling is available with the Python backend server. In browser mode, click Listen to play chapters directly in high quality!');
            }
        });
    }

    // Modal
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
    if (btnSaveModal) btnSaveModal.addEventListener('click', saveModalChapter);

    // Audio Player Controls
    if (btnPlayerPlayPause) btnPlayerPlayPause.addEventListener('click', togglePlayPause);
    
    // Rewind -15s
    if (btnPlayerRewind) {
        btnPlayerRewind.addEventListener('click', () => {
            if (playbackMode === 'stream') {
                currentSentenceIndex = Math.max(0, currentSentenceIndex - 2);
                playNextSentenceStream();
            } else if (isBackendAvailable) {
                globalAudioPlayer.currentTime = Math.max(0, globalAudioPlayer.currentTime - 15);
            }
        });
    }

    // Forward +15s
    if (btnPlayerForward) {
        btnPlayerForward.addEventListener('click', () => {
            if (playbackMode === 'stream') {
                currentSentenceIndex = Math.min(sentenceQueue.length - 1, currentSentenceIndex + 2);
                playNextSentenceStream();
            } else if (isBackendAvailable) {
                globalAudioPlayer.currentTime = Math.min(globalAudioPlayer.duration, globalAudioPlayer.currentTime + 15);
            }
        });
    }

    if (btnPlayerPrev) btnPlayerPrev.addEventListener('click', playPreviousChapter);
    if (btnPlayerNext) btnPlayerNext.addEventListener('click', playNextChapter);

    // Scrubber seeking
    if (playerProgress) {
        playerProgress.addEventListener('input', (e) => {
            const pct = parseFloat(e.target.value);
            if (sentenceQueue.length > 0) {
                currentSentenceIndex = Math.min(sentenceQueue.length - 1, Math.max(0, Math.floor((pct / 100) * sentenceQueue.length)));
                playNextSentenceStream();
            } else if (isBackendAvailable && globalAudioPlayer.duration) {
                globalAudioPlayer.currentTime = (pct / 100) * globalAudioPlayer.duration;
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
        });
    }

    // Volume
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            globalAudioPlayer.volume = vol;
            updateVolumeIcon(vol);
        });
    }

    if (btnMute) {
        btnMute.addEventListener('click', () => {
            globalAudioPlayer.muted = !globalAudioPlayer.muted;
            updateVolumeIcon(globalAudioPlayer.muted ? 0 : globalAudioPlayer.volume);
        });
    }

    // HTML5 Audio events
    globalAudioPlayer.addEventListener('ended', onSentenceAudioEnded);
    globalAudioPlayer.addEventListener('error', onSentenceAudioError);
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

// Google TTS URL generator (Free, crystal-clear MP3 stream)
function getGoogleTTSUrl(text, lang = 'en') {
    const cleanLang = lang.split('-')[0] || 'en';
    const encoded = encodeURIComponent(text.trim());
    return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${cleanLang}&client=tw-ob&q=${encoded}`;
}

// Split text into safe, punchy sentences (under 180 chars for ultra-crisp audio streaming)
function splitTextIntoSentences(text) {
    if (!text || !text.trim()) return [];
    
    // Split by punctuation or newlines
    const rawChunks = text.split(/(?<=[.!?])\s+|\n+/);
    const result = [];
    
    rawChunks.forEach(chunk => {
        const trimmed = chunk.trim();
        if (!trimmed) return;
        
        if (trimmed.length > 180) {
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

// Handle PDF Upload (Backend or In-Browser PDF.js)
async function handleFileUpload(file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Please select a valid PDF eBook file (.pdf).');
        return;
    }

    if (uploadingState) uploadingState.classList.remove('hidden');

    if (isBackendAvailable) {
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
            console.warn('Backend upload failed, falling back to browser PDF.js:', err);
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

// Clean text
function cleanText(text) {
    if (!text) return '';
    // Rejoin hyphenated linebreaks: e.g. "con- tinue" -> "continue"
    text = text.replace(/(\b\w+)-\s+(\w+\b)/g, '$1$2');
    // Remove standalone page numbers
    text = text.replace(/^\s*(?:page\s+)?\d+\s*$/gim, '');
    return text.replace(/[ \t]+/g, ' ').trim();
}

// In-Browser PDF.js parsing with smart Chapter detection
async function parsePdfInBrowser(file) {
    try {
        const pdfjs = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
        if (!pdfjs) {
            throw new Error('PDF.js library is still loading, please try again.');
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
    }
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
        if (isCompleted || !isBackendAvailable) {
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
                <button onclick="playChapterAudio(${chap.id})" id="btn-play-chap-${chap.id}" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-indigo-600/30 active:scale-95">
                    <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i> Listen
                </button>

                <!-- Generate Single Chapter Button (Backend mode) -->
                <button onclick="synthesizeSingleChapter(${chap.id})" id="btn-gen-chap-${chap.id}" class="${(isBackendAvailable && !isCompleted) ? '' : 'hidden'} px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition">
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

function checkZipAvailability() {
    const hasCompleted = currentBook && currentBook.chapters.some(c => c.status === 'completed');
    if (btnDownloadZip) btnDownloadZip.disabled = !hasCompleted;
}

// Stop all audio playback safely
function stopAllAudio() {
    if (globalAudioPlayer) {
        globalAudioPlayer.pause();
        globalAudioPlayer.src = '';
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    isAudioPlaying = false;
    sentenceQueue = [];
    currentSentenceIndex = 0;
    if (audioTimer) {
        clearInterval(audioTimer);
        audioTimer = null;
    }
    updatePlayPauseIcon(false);
}

// Master Audio Player function for a chapter
function playChapterAudio(chapId) {
    const chap = currentBook.chapters.find(c => c.id === chapId);
    if (!chap) return;

    currentPlayingChapterId = chapId;
    if (audioPlayerBar) audioPlayerBar.classList.remove('hidden');

    if (playerTrackTitle) playerTrackTitle.textContent = `${chap.title}`;
    if (playerTrackSubtitle) playerTrackSubtitle.textContent = `${currentBook.title} • ${currentBook.author || 'AudioRead'}`;

    stopAllAudio();

    if (isBackendAvailable && chap.audio_url) {
        // Backend MP3 audio file
        playbackMode = 'backend';
        if (btnDownloadCurrent) {
            btnDownloadCurrent.href = chap.audio_url;
            btnDownloadCurrent.classList.remove('hidden');
        }
        globalAudioPlayer.src = chap.audio_url;
        globalAudioPlayer.play().then(() => {
            isAudioPlaying = true;
            updatePlayPauseIcon(true);
        }).catch(e => console.warn('Autoplay prevented:', e));
    } else {
        // High-Quality Google Stream / In-Browser Audio Engine
        if (btnDownloadCurrent) btnDownloadCurrent.classList.add('hidden');
        
        sentenceQueue = splitTextIntoSentences(chap.text);
        currentSentenceIndex = 0;
        isAudioPlaying = true;
        audioSecondsElapsed = 0;

        if (playerTotalTime) {
            playerTotalTime.textContent = formatTime(chap.estimated_duration_sec);
        }
        if (playerCurrentTime) {
            playerCurrentTime.textContent = '00:00';
        }

        // Live seconds timer for the UI
        audioTimer = setInterval(() => {
            if (isAudioPlaying) {
                audioSecondsElapsed += 1;
                if (playerCurrentTime) playerCurrentTime.textContent = formatTime(audioSecondsElapsed);
            }
        }, 1000);

        playNextSentenceStream();
    }

    renderChaptersList();
}

// Plays the current sentence via Google Audio Stream or WebSpeech fallback
function playNextSentenceStream() {
    if (!isAudioPlaying) return;

    if (currentSentenceIndex >= sentenceQueue.length) {
        // Chapter complete -> auto advance to next chapter
        stopAllAudio();
        if (playerProgress) playerProgress.value = 100;
        playNextChapter();
        return;
    }

    const sentence = sentenceQueue[currentSentenceIndex];
    if (!sentence || !sentence.trim()) {
        currentSentenceIndex++;
        playNextSentenceStream();
        return;
    }

    // Update Progress Scrubber
    if (sentenceQueue.length > 0 && playerProgress) {
        const pct = Math.round((currentSentenceIndex / sentenceQueue.length) * 100);
        playerProgress.value = pct;
    }

    const voiceVal = voiceSelect.value;

    if (voiceVal.startsWith('synth:')) {
        // Device SpeechSynthesis mode
        playbackMode = 'synth';
        window.speechSynthesis.cancel();
        
        const utter = new SpeechSynthesisUtterance(sentence);
        const cleanName = voiceVal.replace('synth:', '');
        const matchVoice = window.speechSynthesis.getVoices().find(v => v.name === cleanName);
        if (matchVoice) utter.voice = matchVoice;
        
        const speed = playbackSpeeds[currentSpeedIndex];
        utter.rate = speed * (1 + parseInt(rateSlider.value) / 100);
        utter.pitch = 1 + parseInt(pitchSlider.value) / 50;
        utter.volume = volumeSlider ? parseFloat(volumeSlider.value) : 1.0;

        utter.onend = () => {
            currentSentenceIndex++;
            playNextSentenceStream();
        };

        utter.onerror = (e) => {
            console.warn('Synth error, next sentence:', e);
            currentSentenceIndex++;
            playNextSentenceStream();
        };

        window._activeUtterance = utter; // PREVENT GC BUG
        window.speechSynthesis.speak(utter);
        updatePlayPauseIcon(true);

    } else {
        // Real Google Neural Stream MP3 Audio mode (100% Reliable Sound)
        playbackMode = 'stream';
        const lang = voiceVal.startsWith('google:') ? voiceVal.split(':')[1] : 'en';
        const streamUrl = getGoogleTTSUrl(sentence, lang);

        globalAudioPlayer.src = streamUrl;
        
        const speed = playbackSpeeds[currentSpeedIndex];
        const rateMult = 1 + parseInt(rateSlider.value) / 100;
        globalAudioPlayer.playbackRate = speed * rateMult;
        globalAudioPlayer.volume = volumeSlider ? parseFloat(volumeSlider.value) : 1.0;

        globalAudioPlayer.play().then(() => {
            updatePlayPauseIcon(true);
        }).catch(err => {
            console.warn('Stream play error, falling back to WebSpeech:', err);
            // Seamless fallback to SpeechSynthesis
            fallbackToWebSpeech(sentence);
        });
    }
}

function onSentenceAudioEnded() {
    if (playbackMode === 'stream') {
        currentSentenceIndex++;
        playNextSentenceStream();
    } else if (playbackMode === 'backend') {
        playNextChapter();
    }
}

function onSentenceAudioError(e) {
    if (playbackMode === 'stream' && sentenceQueue.length > 0) {
        console.warn('Audio stream decode error, advancing:', e);
        currentSentenceIndex++;
        playNextSentenceStream();
    }
}

function fallbackToWebSpeech(sentence) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(sentence);
    utter.rate = playbackSpeeds[currentSpeedIndex] * (1 + parseInt(rateSlider.value) / 100);
    utter.onend = () => {
        currentSentenceIndex++;
        playNextSentenceStream();
    };
    window._activeUtterance = utter;
    window.speechSynthesis.speak(utter);
}

function togglePlayPause() {
    if (isAudioPlaying) {
        // Pause
        isAudioPlaying = false;
        if (globalAudioPlayer) globalAudioPlayer.pause();
        if ('speechSynthesis' in window) window.speechSynthesis.pause();
        updatePlayPauseIcon(false);
    } else {
        // Resume / Play
        isAudioPlaying = true;
        if (playbackMode === 'stream') {
            if (globalAudioPlayer.src) {
                globalAudioPlayer.play().catch(() => playNextSentenceStream());
            } else {
                playNextSentenceStream();
            }
        } else if (playbackMode === 'synth') {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            } else {
                playNextSentenceStream();
            }
        } else if (currentPlayingChapterId) {
            playChapterAudio(currentPlayingChapterId);
        }
        updatePlayPauseIcon(true);
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
