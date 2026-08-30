import sys
import os
import uvicorn
import webbrowser
import threading
import time

def open_browser():
    time.sleep(1.5)
    print("Opening AudioRead Studio in your web browser...")
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    print("=" * 65)
    print("  🎧 AudioRead Studio - High-Definition AI Audiobook Creator")
    print("  🌐 Server running at: http://127.0.0.1:8000")
    print("  ✨ 100% Free • Unlimited Neural Voices • Zero API Keys Required")
    print("=" * 65)
    
    # Launch browser automatically
    threading.Thread(target=open_browser, daemon=True).start()
    
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="info")
