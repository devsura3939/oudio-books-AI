# 🎧 AudioRead Studio: PDF eBook to Studio-Grade Audiobook

AudioRead Studio is a modern, high-performance web application that transforms any PDF eBook into a crystal-clear, studio-grade audiobook using ultra-realistic AI neural voice synthesis.

---

## 🌟 Key Features

- **100% Free & Unlimited**: Powered by Microsoft Edge Neural Speech engine (edge-tts). No subscriptions, no credit cards, no paid API keys required.
- **Ultra-Realistic Studio Voices**: Natural human intonation, pacing, and emotion. Includes over 40+ multilingual voices with US, UK, Australian, Canadian, Indian, and international accents (e.g. Christopher, Guy, Aria, Sonia, Ryan, etc.).
- **Smart PDF Extraction & Chapter Detection**:
  - Automatically identifies Bookmarks/TOC or heading patterns (Chapter X, Part I, Prologue, etc.).
  - Strips annoying artifacts: running headers, footers, line-break hyphenations, and standalone page numbers.
  - Interactive chapter manager: preview word counts, estimated duration, and edit extracted text prior to narration.
- **Live Voice Preview**: 1-click voice tester lets you preview any voice before generating full chapters.
- **Real-Time Progress**: Live progress bars and status updates using Server-Sent Events (SSE).
- **Embedded Audio Suite**:
  - In-browser player with chapter skip (±15s), track seeking, speed adjustment (0.75x – 2.0x), and volume control.
  - Auto-advance to subsequent chapters.
  - Download individual chapter MP3s or complete bundled ZIP audiobook.

---

## 🚀 Quick Start

### 1. Launch AudioRead Studio
Double-click 
un.bat or run:
`ash
python main.py
`
This starts the backend at http://127.0.0.1:8000 and automatically opens the studio interface in your default browser.

### 2. Convert Your First Book
1. **Upload**: Drag and drop any .pdf eBook onto the upload area.
2. **Select Voice**: Choose your preferred narrator (e.g. *Christopher - Authoritative Male* or *Aria - Expressive Female*) and test it.
3. **Generate**: Click **Generate All Chapters** or generate individual chapters one by one.
4. **Listen or Download**: Listen directly in the built-in player or download the full ZIP / individual MP3 files.
