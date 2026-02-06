
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

const DEFAULT_SYSTEM_INSTRUCTION = `
Ты — Командир элитного отряда продаж "300 Спартанцев".
Твоя задача: сделать из новобранца (пользователя) настоящую машину продаж.
Твой стиль: Жесткий, но справедливый. Военная риторика.
`;

// Helper to clean JSON string from Markdown wrappers
const cleanJsonString = (str: string): string => {
  if (!str) return '{}';
  // Remove ```json and ``` wrappers
  let cleaned = str.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
  // Remove generic code blocks if json tag wasn't used
  cleaned = cleaned.replace(/```\s*/g, '');
  return cleaned.trim();
};

export const createChatSession = (customInstruction?: string): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: customInstruction || DEFAULT_SYSTEM_INSTRUCTION,
    },
  });
};

export const sendMessageToGemini = async (chat: Chat, message: string): Promise<string> => {
  try {
    const result: GenerateContentResponse = await chat.sendMessage({ message });
    return result.text || 'Связь с штабом потеряна.';
  } catch (error) {
    console.error('Gemini API Error:', error);
    return 'Ошибка канала связи.';
  }
};

export const createArenaSession = (clientRole: string, objective: string): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = `
Ты — клиент в симуляции продаж. 
Твоя роль: ${clientRole}
Цель игрока: ${objective}
Веди себя реалистично, реагируй на аргументы продавца. Будь сложным, но справедливым оппонентом. 
Не выходи из роли клиента до конца симуляции.
`;
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction,
    },
  });
};

export const getArenaHint = async (
  clientRole: string, 
  objective: string, 
  lastClientMessage: string, 
  userDraft: string
): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Context: Sales Roleplay.
      Client Role: ${clientRole}
      User Goal: ${objective}
      Last Client Message: "${lastClientMessage}"
      User is typing: "${userDraft}"
      
      Task: Act as a sales coach whispering a hint.
      Analyze the user's draft. Is it aggressive? Weak? Good? 
      Provide a VERY SHORT (max 8 words) tactical hint or correction. 
      If it's good, say "Good tactic".
      Lang: Russian.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
          maxOutputTokens: 30,
          thinkingConfig: { thinkingBudget: 0 } // Disable thinking for low latency/short hints
      } 
    });

    return response.text || null;
  } catch (error) {
    console.error('Hint Error', error);
    return null;
  }
};

export const evaluateArenaBattle = async (history: { role: string; text: string }[], objective: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
Проанализируй диалог тренировочного боя между продавцом (user) и клиентом (model).
Цель продавца была: ${objective}

Диалог:
${history.map(m => `${m.role === 'user' ? 'Продавец' : 'Клиент'}: ${m.text}`).join('\n')}

Дай оценку действиям продавца в стиле Командира 300 Спартанцев (жестко, лаконично, по делу).
Укажи:
1. Удалось ли достичь цели?
2. 2 сильных тактических приема.
3. 2 критические ошибки или зоны роста.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: prompt,
    });

    return response.text || 'Командир не смог расшифровать отчет о бое.';
  } catch (error) {
    console.error('Evaluation Error:', error);
    return 'Ошибка при анализе стратегии.';
  }
};

export const checkHomeworkWithAI = async (
    content: string, // Text or Base64
    type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'FILE',
    instruction: string
  ): Promise<{ passed: boolean; feedback: string }> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const parts: any[] = [];
      
      if (type === 'PHOTO' || type === 'VIDEO' || type === 'FILE') {
         // Assuming content is base64 string without data prefix for API, or handle it here
         const base64Clean = content.includes('base64,') ? content.split('base64,')[1] : content;
         
         let mimeType = 'image/jpeg';
         if (type === 'VIDEO') mimeType = 'video/mp4';
         if (type === 'FILE') mimeType = 'application/pdf';

         parts.push({
            inlineData: {
                data: base64Clean,
                mimeType: mimeType
            }
         });
      }
  
      parts.push({
          text: `
          Ты - Командир "300 Спартанцев". Твоя задача проверить домашнее задание новобранца.
          
          ИНСТРУКЦИЯ ДЛЯ ПРОВЕРКИ (Критерии):
          ${instruction}
          
          ${type === 'TEXT' ? `ОТВЕТ НОВОБРАНЦА: "${content}"` : 'Ответ новобранца находится во вложении (фото/видео/файл).'}
          
          Верни ответ СТРОГО в формате JSON:
          {
            "passed": boolean, (true если задание выполнено по критериям, false если нет)
            "feedback": string (Твой комментарий в стиле спартанского командира. Если не сдал - объясни почему жестко. Если сдал - похвали кратко.)
          }
          `
      });
  
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: { parts },
        config: {
            responseMimeType: "application/json"
        }
      });
  
      const resultText = response.text;
      if (!resultText) throw new Error('Empty AI response');
      
      try {
        const parsed = JSON.parse(cleanJsonString(resultText));
        return {
            passed: !!parsed.passed,
            feedback: parsed.feedback || 'Нет комментария.'
        };
      } catch (jsonError) {
        console.error('JSON Parse Error:', jsonError, resultText);
        return {
            passed: false,
            feedback: 'Ошибка обработки данных от Командира. Попробуйте позже.'
        };
      }
  
    } catch (error) {
      console.error('Homework Grading Error:', error);
      return {
          passed: true, // Fallback to pass if AI fails to prevent blocking user, but log it.
          feedback: 'Штаб перегружен. Задание принято условно. (Ошибка AI)'
      };
    }
  };

// --- AVATAR GENERATION LOGIC ---

// Rich descriptions mapping
const ARMOR_DESCRIPTIONS: Record<string, string> = {
    'Classic Bronze': 'Traditional Spartan bronze cuirass with defined muscle sculpting, deep red cape draped over shoulders, leather straps, and Corinthian helmet details on the pauldrons. Battle-worn texture with scratches.',
    'Midnight Stealth': 'Sleek, matte black obsidian tactical armor, dark grey cowl/hood casting shadows over the forehead, faint purple energy accents in armor crevices, lightweight stealth aesthetic.',
    'Golden God': 'Highly polished, ceremonial gold plate armor with intricate divine engravings, radiating a faint warm glow, white and gold silk cape, angelic warrior aesthetic.',
    'Futuristic Chrome': 'High-tech silver chrome plating with segmented plates, neon blue light strips integrated into the chest and shoulders, cybernetic aesthetic, futuristic visor attachment on chest.',
};

const BACKGROUND_DESCRIPTIONS: Record<string, string> = {
    'Ancient Battlefield': 'A dusty, epic battlefield at sunset (golden hour), scattered shields and spears in the background, haze and smoke, dramatic cinematic lighting.',
    'Temple of Olympus': 'Ethereal mountaintop temple, white marble columns in background, bright blue sky with soft clouds, divine bright lighting, bloom effect.',
    'Stormy Peak': 'Dark, moody mountain peak, rain pouring down, lightning striking in the distance, cold blue and grey color palette, dramatic contrast.',
    'Volcanic Gates': 'Underground cavern, flowing lava rivers in background, dark rock, ambient orange and red lighting, embers floating in the air.',
};

export const generateSpartanAvatar = async (
  imageBase64: string, 
  level: number, 
  armorStyle: string = 'Classic Bronze', 
  backgroundStyle: string = 'Ancient Battlefield'
): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Resolve rich descriptions (Fallback to default if key missing)
    const armorPrompt = ARMOR_DESCRIPTIONS[armorStyle] || ARMOR_DESCRIPTIONS['Classic Bronze'];
    const bgPrompt = BACKGROUND_DESCRIPTIONS[backgroundStyle] || BACKGROUND_DESCRIPTIONS['Ancient Battlefield'];

    // Determine visual progression based on level
    const armorQuality = level < 3 ? 'Basic Recruit condition (clean, simple)' : level < 7 ? 'Battle-Hardened Veteran condition (scratches, dents, mud splatter)' : 'Legendary Commander condition (Ornate details, glowing energy)';
    const auraPrompt = level > 5 ? 'Subtle supernatural power aura surrounding the character.' : 'No supernatural aura.';

    const prompt = `
      Task: Generate a high-fidelity 3D avatar portrait (Unreal Engine 5 Metahuman style mixed with Pixar quality).
      
      INPUT IMAGE: Use the facial features (eyes, nose, mouth shape, skin tone) from the provided image. The goal is to make the user look like a Spartan warrior version of themselves.

      SUBJECT APPEARANCE:
      - The character is wearing: ${armorPrompt}
      - Armor Condition: ${armorQuality}
      - Special Effect: ${auraPrompt}
      
      ENVIRONMENT / BACKGROUND:
      - ${bgPrompt}
      - Camera: Close-up portrait (Head and Upper Torso), shallow depth of field (bokeh background).
      - Lighting: Cinematic, Volumetric lighting matching the background environment.

      STYLE:
      - 8k resolution, Octane Render.
      - Heroic, confident expression.
      - Detailed textures (metal, skin pores, fabric cloth).
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: 'image/jpeg',
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
          imageConfig: {
              aspectRatio: "1:1" // Changed to 1:1 as it's an avatar
          }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error('Avatar Generation Error:', error);
    return null;
  }
};
