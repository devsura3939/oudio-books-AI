const crypto = require('crypto');
const WebSocket = require('ws');

function randomHex(length) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

const wssUrl = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const ws = new WebSocket(wssUrl);

ws.on('open', () => {
    console.log('Connected');
    const reqId = randomHex(32);
    const config = JSON.stringify({
        context: {
            synthesis: {
                audio: {
                    metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
                    outputFormat: 'audio-24khz-48kbitrate-mono-mp3' 
                }
            }
        }
    });
    ws.send('X-Timestamp:' + new Date().toISOString() + '\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n' + config);

    const ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='en-US-ChristopherNeural'>Hello world, this is a test of edge tts in javascript.</voice></speak>";
    ws.send('X-RequestId:' + reqId + '\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n' + ssml);
});

let audioData = [];
ws.on('message', (data, isBinary) => {
    if (isBinary) {
        const str = data.toString('utf8', 0, 256);
        const headerEnd = str.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
            const payload = data.slice(headerEnd + 4);
            audioData.push(payload);
            console.log('Received audio chunk, size:', payload.length);
        }
    } else {
        const text = data.toString('utf8');
        console.log('Received text:', text.substring(0, 50).replace(/\n/g, ''));
        if (text.includes('Path:turn.end')) {
            console.log('Turn ended. Total audio chunks:', audioData.length);
            ws.close();
        }
    }
});
