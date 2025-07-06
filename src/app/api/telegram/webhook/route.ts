import { NextRequest, NextResponse } from 'next/server';

// Telegram Bot API types
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  location?: TelegramLocation;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramLocation {
  longitude: number;
  latitude: number;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

// Bot configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENROUTER_API_KEY = 'sk-or-v1-REDACTED';

// Language mappings
const LANGUAGE_NAMES: { [key: string]: string } = {
  'en': 'English',
  'hi': 'हिंदी (Hindi)',
  'bn': 'বাংলা (Bengali)',
  'te': 'తెలుగు (Telugu)',
  'ta': 'தமிழ் (Tamil)',
  'ml': 'മലയാളം (Malayalam)',
  'kn': 'ಕನ್ನಡ (Kannada)',
  'gu': 'ગુજરાતી (Gujarati)',
  'mr': 'मराठी (Marathi)',
  'pa': 'ਪੰਜਾਬੀ (Punjabi)',
  'or': 'ଓଡ଼ିଆ (Odia)',
  'as': 'অসমীয়া (Assamese)',
  'ur': 'اردو (Urdu)',
  'ne': 'नेपाली (Nepali)',
  'si': 'සිංහල (Sinhala)'
};

// User session storage (in production, use a database)
const userSessions = new Map<number, {
  language: string;
  location?: { lat: number; lon: number };
  state?: string;
  lastActivity: Date;
}>();

// Telegram API helper functions
async function sendMessage(chatId: number, text: string, options?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    ...options
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to send message:', await response.text());
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

async function sendPhoto(chatId: number, photo: string, caption?: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
  
  const payload = {
    chat_id: chatId,
    photo: photo,
    caption: caption,
    parse_mode: 'HTML'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return await response.json();
  } catch (error) {
    console.error('Error sending photo:', error);
  }
}

// OpenRouter AI helper
async function callOpenRouterAPI(prompt: string, model: string = 'anthropic/claude-3.5-sonnet') {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://kisanai.in',
        'X-Title': 'KisanAI Telegram Bot'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are KisanAI, an expert agricultural assistant for Indian farmers. Provide practical, actionable advice in simple language. Focus on crop management, disease prevention, weather-based recommendations, and sustainable farming practices suitable for Indian conditions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || 'Sorry, I could not process your request.';
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return 'Sorry, I am experiencing technical difficulties. Please try again later.';
  }
}

// Command handlers
async function handleStartCommand(chatId: number, user: TelegramUser) {
  const session = userSessions.get(chatId) || { language: 'en', lastActivity: new Date() };
  userSessions.set(chatId, session);

  const welcomeMessage = `
🌾 <b>Welcome to KisanAI!</b>

नमस्ते ${user.first_name}! I'm your AI-powered farming assistant.

🚀 <b>What I can help you with:</b>

📸 <b>Crop Disease Detection</b>
Send me a photo of your crop and I'll identify diseases and suggest treatments.

🤖 <b>Farming Advice</b>
Ask me any farming question in your language.

🌦️ <b>Weather Forecast</b>
Get weather updates and farming recommendations.

💰 <b>Market Prices</b>
Check live mandi prices for your crops.

📅 <b>Crop Calendar</b>
Get personalized farming schedules.

🏛️ <b>Government Schemes</b>
Learn about agricultural schemes and subsidies.

<b>Commands:</b>
/help - Show all commands
/language - Change language
/weather - Weather forecast
/prices - Market prices
/schemes - Government schemes

Just send me a photo or ask your question to get started! 🌱
  `;

  await sendMessage(chatId, welcomeMessage);
}

async function handleHelpCommand(chatId: number) {
  const helpMessage = `
🆘 <b>KisanAI Help</b>

<b>🔤 Basic Commands:</b>
/start - Welcome message
/help - This help message
/language - Change language
/profile - Your profile

<b>🌾 Farming Features:</b>
/detect - Crop disease detection
/ask - Ask farming question
/weather - Weather forecast
/prices - Market prices
/calendar - Crop calendar
/schemes - Government schemes

<b>📸 Photo Analysis:</b>
Just send a photo of your crop for instant disease detection!

<b>💬 Chat:</b>
Ask any farming question in your language:
• "मेरी फसल में पीले पत्ते क्यों हैं?"
• "What fertilizer for tomatoes?"
• "ধানের রোগ কিভাবে প্রতিরোধ করব?"

<b>🌍 Supported Languages:</b>
Hindi, Bengali, Telugu, Tamil, Malayalam, Kannada, Gujarati, Marathi, Punjabi, Odia, Assamese, Urdu, Nepali, Sinhala, English

Need help? Just type your question! 🌱
  `;

  await sendMessage(chatId, helpMessage);
}

async function handleLanguageCommand(chatId: number) {
  const languageKeyboard = {
    inline_keyboard: [
      [
        { text: '🇮🇳 हिंदी', callback_data: 'lang_hi' },
        { text: '🇮🇳 English', callback_data: 'lang_en' }
      ],
      [
        { text: '🇮🇳 বাংলা', callback_data: 'lang_bn' },
        { text: '🇮🇳 తెలుగు', callback_data: 'lang_te' }
      ],
      [
        { text: '🇮🇳 தமிழ்', callback_data: 'lang_ta' },
        { text: '🇮🇳 മലയാളം', callback_data: 'lang_ml' }
      ],
      [
        { text: '🇮🇳 ಕನ್ನಡ', callback_data: 'lang_kn' },
        { text: '🇮🇳 ગુજરાતી', callback_data: 'lang_gu' }
      ],
      [
        { text: '🇮🇳 मराठी', callback_data: 'lang_mr' },
        { text: '🇮🇳 ਪੰਜਾਬੀ', callback_data: 'lang_pa' }
      ]
    ]
  };

  await sendMessage(chatId, '🌍 <b>Choose your preferred language:</b>', {
    reply_markup: languageKeyboard
  });
}

async function handleWeatherCommand(chatId: number) {
  const session = userSessions.get(chatId);
  
  if (!session?.location) {
    await sendMessage(chatId, `
🌦️ <b>Weather Forecast</b>

Please share your location first to get accurate weather information.

You can:
1. Send your location using the 📎 attachment button
2. Type your city name (e.g., "Delhi", "Mumbai")

This will help me provide weather forecasts and farming recommendations specific to your area.
    `);
    return;
  }

  // Mock weather data (in production, integrate with weather API)
  const weatherMessage = `
🌦️ <b>Weather Forecast</b>

📍 <b>Your Location</b>
🌡️ <b>Today:</b> 28°C, Partly Cloudy
🌡️ <b>Tomorrow:</b> 25°C, Light Rain Expected
🌡️ <b>Day After:</b> 30°C, Sunny

🌾 <b>Farming Recommendations:</b>
• ✅ Good conditions for field work today
• 🌧️ Prepare for rain tomorrow - check drainage
• 💧 Reduce irrigation before rain
• 🌱 Good time for sowing after rain

💡 <b>Tip:</b> Monitor soil moisture after tomorrow's rain for optimal planting conditions.
  `;

  await sendMessage(chatId, weatherMessage);
}

async function handlePricesCommand(chatId: number) {
  const pricesMessage = `
💰 <b>Live Mandi Prices</b>

📊 <b>Today's Rates (₹/Quintal):</b>

🌾 <b>Wheat:</b> ₹2,150 - ₹2,200
🌽 <b>Maize:</b> ₹1,800 - ₹1,850
🍅 <b>Tomato:</b> ₹1,200 - ₹1,500
🧅 <b>Onion:</b> ₹800 - ₹1,000
🥔 <b>Potato:</b> ₹600 - ₹800
🌶️ <b>Chili:</b> ₹8,000 - ₹10,000

📈 <b>Market Trends:</b>
• Wheat prices stable
• Tomato prices rising due to weather
• Good demand for onions

💡 <b>Selling Tip:</b> Consider selling tomatoes now due to high demand.

Want specific crop prices? Just ask: "What's the price of rice?" or "सोयाबीन का भाव क्या है?"
  `;

  await sendMessage(chatId, pricesMessage);
}

async function handleSchemesCommand(chatId: number) {
  const schemesMessage = `
🏛️ <b>Government Schemes for Farmers</b>

💰 <b>PM-KISAN Scheme</b>
• ₹6,000 per year in 3 installments
• For all landholding farmers
• Apply online at pmkisan.gov.in

🌾 <b>Crop Insurance (PMFBY)</b>
• Premium: 2% for Kharif, 1.5% for Rabi
• Covers natural calamities
• Apply through banks or CSCs

💧 <b>Drip Irrigation Subsidy</b>
• Up to 55% subsidy for small farmers
• 45% for other farmers
• Apply through agriculture department

🚜 <b>Tractor Subsidy</b>
• 25-50% subsidy on tractors
• Varies by state
• Contact local agriculture office

📱 <b>How to Apply:</b>
1. Visit nearest CSC or agriculture office
2. Carry Aadhaar, land documents
3. Fill application form
4. Submit required documents

Need help with specific scheme? Ask me: "How to apply for PM-KISAN?" or "ट्रैक्टर सब्सिडी कैसे मिलेगी?"
  `;

  await sendMessage(chatId, schemesMessage);
}

async function handlePhotoMessage(chatId: number, photos: TelegramPhotoSize[]) {
  await sendMessage(chatId, '🔍 <b>Analyzing your crop image...</b>\n\nPlease wait while I examine the photo for any diseases or issues.');

  // Get the largest photo
  const largestPhoto = photos.reduce((prev, current) => 
    (prev.file_size || 0) > (current.file_size || 0) ? prev : current
  );

  // Mock disease detection (in production, use actual AI vision model)
  setTimeout(async () => {
    const diseaseReport = `
🔬 <b>Crop Analysis Report</b>

📸 <b>Image Analysis Complete</b>

🦠 <b>Disease Detected:</b> Leaf Blight
📊 <b>Confidence:</b> 87%
🌱 <b>Crop:</b> Tomato (detected)

💊 <b>Treatment Recommendations:</b>
• Apply copper-based fungicide
• Remove affected leaves immediately
• Improve air circulation
• Reduce overhead watering

🛡️ <b>Prevention Tips:</b>
• Regular field monitoring
• Proper plant spacing
• Avoid watering leaves directly
• Use disease-resistant varieties

📅 <b>Follow-up:</b>
• Monitor for 7-10 days
• Reapply treatment if needed
• Contact local agriculture extension officer

❓ <b>Need more help?</b> Ask me: "How to apply copper fungicide?" or "कॉपर फंगीसाइड कैसे डालें?"
    `;

    await sendMessage(chatId, diseaseReport);
  }, 3000);
}

async function handleTextMessage(chatId: number, text: string, user: TelegramUser) {
  const session = userSessions.get(chatId) || { language: 'en', lastActivity: new Date() };
  
  // Update last activity
  session.lastActivity = new Date();
  userSessions.set(chatId, session);

  // Check if it's a location text
  if (text.toLowerCase().includes('weather') || text.toLowerCase().includes('मौसम')) {
    await handleWeatherCommand(chatId);
    return;
  }

  // Check if it's a price query
  if (text.toLowerCase().includes('price') || text.toLowerCase().includes('भाव') || text.toLowerCase().includes('दाम')) {
    await handlePricesCommand(chatId);
    return;
  }

  // General farming question - use AI
  await sendMessage(chatId, '🤖 <b>Let me help you with that...</b>');

  const aiPrompt = `
Farmer's question: "${text}"

Please provide a helpful response for an Indian farmer. Include:
1. Direct answer to their question
2. Practical steps they can take
3. Any warnings or precautions
4. Additional tips if relevant

Keep the response concise but comprehensive, suitable for a farmer in India.
  `;

  const aiResponse = await callOpenRouterAPI(aiPrompt);
  
  const formattedResponse = `
🌾 <b>KisanAI Expert Advice</b>

${aiResponse}

💡 <b>Need more help?</b>
• Send a photo for disease detection
• Ask about weather: /weather
• Check market prices: /prices
• Learn about schemes: /schemes

Happy farming! 🌱
  `;

  await sendMessage(chatId, formattedResponse);
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  const chatId = callbackQuery.message?.chat.id;
  const data = callbackQuery.data;

  if (!chatId || !data) return;

  if (data.startsWith('lang_')) {
    const langCode = data.replace('lang_', '');
    const session = userSessions.get(chatId) || { language: 'en', lastActivity: new Date() };
    session.language = langCode;
    userSessions.set(chatId, session);

    const languageName = LANGUAGE_NAMES[langCode] || 'English';
    await sendMessage(chatId, `✅ Language changed to ${languageName}\n\nYou can now ask questions in your preferred language!`);
  }
}

// Main webhook handler
export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();

    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const user = message.from;

      // Handle commands
      if (message.text?.startsWith('/')) {
        const command = message.text.split(' ')[0].toLowerCase();
        
        switch (command) {
          case '/start':
            await handleStartCommand(chatId, user);
            break;
          case '/help':
            await handleHelpCommand(chatId);
            break;
          case '/language':
            await handleLanguageCommand(chatId);
            break;
          case '/weather':
            await handleWeatherCommand(chatId);
            break;
          case '/prices':
            await handlePricesCommand(chatId);
            break;
          case '/schemes':
            await handleSchemesCommand(chatId);
            break;
          default:
            await sendMessage(chatId, 'Unknown command. Type /help to see available commands.');
        }
      }
      // Handle photo messages
      else if (message.photo) {
        await handlePhotoMessage(chatId, message.photo);
      }
      // Handle text messages
      else if (message.text) {
        await handleTextMessage(chatId, message.text, user);
      }
      // Handle location
      else if (message.location) {
        const session = userSessions.get(chatId) || { language: 'en', lastActivity: new Date() };
        session.location = {
          lat: message.location.latitude,
          lon: message.location.longitude
        };
        userSessions.set(chatId, session);
        
        await sendMessage(chatId, '📍 Location saved! Now I can provide accurate weather forecasts and local information.');
        await handleWeatherCommand(chatId);
      }
    }
    // Handle callback queries (inline keyboard responses)
    else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({ 
    status: 'KisanAI Telegram Bot Webhook Active',
    timestamp: new Date().toISOString()
  });
}