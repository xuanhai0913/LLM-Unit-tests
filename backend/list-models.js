import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.log('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
}

console.log('🔍 Listing available Gemini models...');
console.log(`   API Key: ${apiKey.substring(0, 10)}...`);

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.log('❌ Error:', json.error.message);
                return;
            }
            if (json.models) {
                console.log('\n✅ Available models:\n');
                json.models.forEach(m => {
                    const methods = m.supportedGenerationMethods?.join(', ') || 'N/A';
                    console.log(`📌 ${m.name}`);
                    console.log(`   Methods: ${methods}\n`);
                });
            } else {
                console.log('Response:', data);
            }
        } catch (e) {
            console.log('Parse error:', e.message);
            console.log('Raw response:', data);
        }
    });
}).on('error', e => console.log('Request error:', e.message));
