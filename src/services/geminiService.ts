import { GoogleGenAI } from "@google/genai";
import { Candle } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Reference image description based on the provided image
const PATTERN_REFERENCE_PROMPT = `
You are a professional technical analyst. I am providing you with 12 specific chart patterns to identify in the provided candlestick data. 

**Group 1: Smart Money Concepts (SMC) & Structural Patterns**
1. **HH/HL (Higher High / Higher Low)**: Peaks and troughs that are higher than previous ones, indicating an uptrend.
2. **BOS (Break of Structure)**: Price breaks through a previous HH or LL, confirming a trend continuation.
3. **CHoCH (Change of Character)**: Price breaks through a previous HL or LH, indicating a potential trend reversal.
4. **EQH/EQL (Equal Highs / Equal Lows)**: Price levels where multiple peaks or troughs align, often acting as liquidity zones.
5. **M Pattern (Double Top)**: Bearish reversal pattern resembling the letter M.
6. **H&S (Head & Shoulders)**: Classical reversal pattern with a head and two shoulders.

**Group 2: Japanese Candlestick Patterns**
7. **Martelo (Hammer)**: Bullish reversal candle with a small body and long lower wick.
8. **Engolfo (Engulfing)**: Reversal pattern where a candle completely covers the previous one (Bullish or Bearish).

**Group 3: Graphic Chart Patterns (Drawings)**
9. **Triângulo (Triangle)**: Price converging between two trendlines (Symmetrical, Ascending, or Descending).
10. **Cunha (Wedge)**: Price consolidating between two converging trendlines, both slanting in the same direction (Rising or Falling).
11. **Bandeira (Flag)**: A sharp price move followed by a small rectangular consolidation.
12. **Canal (Channel)**: Price moving between two parallel trendlines (Ascending, Descending, or Horizontal).

Analyze the last 50 candles provided. Look for price action that matches these structural descriptions.
Return ONLY a JSON object in this format:
{
  "patternFound": boolean,
  "patternName": "HH/HL" | "BOS" | "CHoCH" | "EQH/EQL" | "Martelo" | "Engolfo" | "M Pattern" | "H&S" | "Triângulo" | "Cunha" | "Bandeira" | "Canal" | null,
  "type": "bullish" | "bearish",
  "isCandlestickPattern": boolean,
  "description": "Short explanation of why this pattern was identified based on the data.",
  "prediction": "up" | "down",
  "confidence": number (0 to 1)
}
`;

export async function identifyPattern(candles: Candle[], asset: string, timeframe: string): Promise<any> {
  try {
    const candleDataString = candles.map(c => 
      `T:${new Date(c.time * 1000).toISOString()}, O:${c.open}, H:${c.high}, L:${c.low}, C:${c.close}, V:${c.volume}`
    ).join('\n');

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { text: PATTERN_REFERENCE_PROMPT },
        { text: `Current Asset: ${asset}\nTimeframe: ${timeframe}\n\nRecent chart data:\n${candleDataString}\n\nAnalyze the data and identify the pattern.` }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      patternFound: result.patternFound,
      patternName: result.patternName,
      type: result.type,
      isCandlestickPattern: result.isCandlestickPattern || false,
      description: result.description,
      prediction: result.prediction,
      confidence: result.confidence
    };
  } catch (error) {
    console.error("Error identifying pattern:", error);
    return { patternFound: false };
  }
}
