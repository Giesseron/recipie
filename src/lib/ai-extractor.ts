import Anthropic from "@anthropic-ai/sdk";
import { ExtractedRecipe, Category } from "@/types/recipe";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXTRACTION_PROMPT = `אתה מומחה לחילוץ מתכונים. קיבלת תוכן מפוסט ברשת חברתית. חלץ את המתכון ממנו.

החזר JSON בפורמט הבא בלבד, בלי טקסט נוסף:
{
  "title": "שם המתכון בעברית",
  "ingredients": [
    {"name": "שם המצרך", "quantity": "כמות (מספר)", "unit": "יחידה (כוס/כף/גרם/יח׳ וכו׳)"}
  ],
  "steps": ["שלב 1", "שלב 2", "..."],
  "categories": ["קטגוריה1", "קטגוריה2"]
}

כללים:
- הפרד כמות ויחידה מהשם. אם אין כמות מדויקת, שים null.
- שלבי ההכנה צריכים להיות מסודרים לפי סדר הביצוע.
- קטגוריות אפשריות: "חלבי", "בשרי", "פרווה", "טבעוני", "בריאותי". בחר את כל הרלוונטיות.
- אם התוכן לא מכיל מתכון, החזר: {"error": "no_recipe"}
- כתוב הכל בעברית.`;

const MEDIA_EXTRACTION_PROMPT = `אתה מומחה לחילוץ מתכונים מתמונות. קיבלת תמונות שמכילות מתכון - ייתכן שזה צילום מסך של מתכון, תמונות מסרטון בישול, או תמונות של מנה עם הוראות.

קרא את כל הטקסט הנראה בתמונות וחלץ את המתכון.

החזר JSON בפורמט הבא בלבד, בלי טקסט נוסף:
{
  "title": "שם המתכון בעברית",
  "ingredients": [
    {"name": "שם המצרך", "quantity": "כמות (מספר)", "unit": "יחידה (כוס/כף/גרם/יח׳ וכו׳)"}
  ],
  "steps": ["שלב 1", "שלב 2", "..."],
  "categories": ["קטגוריה1", "קטגוריה2"]
}

כללים:
- הפרד כמות ויחידה מהשם. אם אין כמות מדויקת, שים null.
- אם אתה רואה מצרכים בתמונה (על שולחן, בסרטון בישול), רשום אותם גם אם אין טקסט מפורש.
- אם אתה רואה שלבי הכנה (תמונות מסרטון), תאר את מה שקורה בכל שלב.
- קטגוריות אפשריות: "חלבי", "בשרי", "פרווה", "טבעוני", "בריאותי". בחר את כל הרלוונטיות.
- אם התמונות לא מכילות מתכון, החזר: {"error": "no_recipe"}
- כתוב הכל בעברית.`;

const VALID_CATEGORIES: Category[] = [
  "חלבי",
  "בשרי",
  "פרווה",
  "טבעוני",
  "בריאותי",
];

function parseExtractedRecipe(text: string): ExtractedRecipe | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);
  if (parsed.error === "no_recipe") return null;

  const categories = (parsed.categories || []).filter((c: string) =>
    VALID_CATEGORIES.includes(c as Category)
  ) as Category[];

  return {
    title: parsed.title || "מתכון ללא שם",
    ingredients: (parsed.ingredients || []).map(
      (ing: { name: string; quantity?: string; unit?: string }) => ({
        name: ing.name,
        quantity: ing.quantity || null,
        unit: ing.unit || null,
      })
    ),
    steps: parsed.steps || [],
    videoUrl: null,
    categories: categories.length > 0 ? categories : ["פרווה"],
  };
}

export async function extractRecipe(
  content: string
): Promise<ExtractedRecipe | null> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nתוכן הפוסט:\n${content}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return parseExtractedRecipe(text);
}

export async function extractRecipeFromMedia(
  images: string[],
  textHint?: string
): Promise<ExtractedRecipe | null> {
  const content: Anthropic.Messages.ContentBlockParam[] = images.map(
    (base64Data) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/jpeg" as const,
        data: base64Data,
      },
    })
  );

  let promptText = MEDIA_EXTRACTION_PROMPT;
  if (textHint) {
    promptText += `\n\nמידע נוסף על המתכון:\n${textHint}`;
  }
  content.push({ type: "text" as const, text: promptText });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return parseExtractedRecipe(text);
}

// Normalize ingredient name to a canonical Hebrew form
export function normalizeIngredient(name: string): string {
  return (
    name
      .trim()
      // Remove common quantity prefixes that might leak into name
      .replace(/^\d+[\s/]*/, "")
      // Remove common units that might leak into name
      .replace(
        /^(כוס|כוסות|כף|כפות|כפית|כפיות|גרם|ק"ג|מ"ל|ליטר|יח'|יחידות?)\s*/,
        ""
      )
      .trim()
  );
}
