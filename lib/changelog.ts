export interface ChangelogHighlight {
  text: string;
  textHe: string;
  tag: 'new' | 'improved' | 'fix';
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  titleHe: string;
  highlights: ChangelogHighlight[];
}

export const LAST_SEEN_VERSION_KEY = 'winejourney_last_seen_version';

export function getLatestVersion(): string {
  return changelog[0]?.version ?? '0.0.0';
}

export function hasUnseenUpdates(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const seen = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    return seen !== getLatestVersion();
  } catch {
    return false;
  }
}

export function markUpdatesSeen(): void {
  try {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, getLatestVersion());
  } catch { /* silent */ }
}

export const changelog: ChangelogEntry[] = [
  {
    version: '1.4.0',
    date: '2026-02-19',
    title: 'Sommelier v2 — Smarter & Easier',
    titleHe: 'סומלייה v2 — חכם וקל יותר',
    highlights: [
      { text: 'Full wine cards everywhere — search, surprise-me, and recommendations now show complete details', textHe: 'כרטיסי יין מלאים בכל מקום — חיפוש, הפתעות והמלצות מציגים פרטים מלאים', tag: 'improved' },
      { text: 'Merged "Wine for Tonight" and "Pair Dinner" into a single smarter flow', textHe: 'איחוד "יין להערב" ו"התאם לארוחה" לזרימה אחת חכמה יותר', tag: 'improved' },
      { text: 'Journey widget on home screen now tracks your real progress', textHe: 'ווידג\'ט המסע במסך הבית עוקב אחרי ההתקדמות האמיתית שלך', tag: 'fix' },
      { text: 'Action button hints explain "I like this wine" vs "Add to wishlist"', textHe: 'טקסט הסבר מבהיר את ההבדל בין "אני אוהב את היין" ל"הוסף לרשימת משאלות"', tag: 'new' },
      { text: 'Wines added to profile now appear instantly without page refresh', textHe: 'יינות שנוספו לפרופיל מופיעים מיד ללא רענון דף', tag: 'fix' },
      { text: 'Search for wines in any sommelier phase', textHe: 'חיפוש יינות בכל שלב של הסומלייה', tag: 'improved' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-02-18',
    title: 'Premium Cellar Experience',
    titleHe: 'חוויית מרתף פרימיום',
    highlights: [
      { text: 'Customizable 3D wine rack — build your own rack with shelves, zones, and stacking styles', textHe: 'מקרר יין תלת-ממדי מותאם אישית — בנה מקרר עם מדפים, אזורים וסגנונות ערימה', tag: 'new' },
      { text: 'Readiness heatmap shows which bottles to drink now, hold, or are past peak', textHe: 'מפת חום מוכנות מציגה אילו בקבוקים לשתות עכשיו, לשמור, או עברו שיא', tag: 'new' },
      { text: 'Location picker — assign bottles to specific rack slots when adding to cellar', textHe: 'בוחר מיקום — שייך בקבוקים למשבצות ספציפיות במקרר', tag: 'new' },
      { text: 'Cellar Insights tab with collection stats, drinking windows, and gap analysis', textHe: 'לשונית תובנות מרתף עם סטטיסטיקות אוסף, חלונות שתייה וניתוח פערים', tag: 'new' },
      { text: 'Sommelier integration — ask for food pairings, tonight\'s pick, or rack-filling suggestions', textHe: 'שילוב סומלייה — בקש המלצות לאוכל, בחירה להערב, או הצעות למילוי המקרר', tag: 'improved' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-02-10',
    title: 'My Personal Sommelier',
    titleHe: 'הסומלייה האישי שלי',
    highlights: [
      { text: 'AI-powered sommelier that learns your taste and gives personalized recommendations', textHe: 'סומלייה מונע AI שלומד את הטעם שלך ונותן המלצות מותאמות אישית', tag: 'new' },
      { text: 'Food pairing suggestions for any wine in your collection', textHe: 'הצעות שילוב אוכל לכל יין באוסף שלך', tag: 'new' },
      { text: 'Wine discovery flow to explore new bottles based on your profile', textHe: 'זרימת גילוי יין לחקירת בקבוקים חדשים על בסיס הפרופיל שלך', tag: 'new' },
      { text: 'Taste evolution tracking as your palate develops', textHe: 'מעקב התפתחות טעם ככל שהחך שלך מתפתח', tag: 'new' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-01-28',
    title: 'Wine Scanning and Search',
    titleHe: 'סריקה וחיפוש יין',
    highlights: [
      { text: 'Scan wine labels with your camera for instant identification', textHe: 'סרוק תוויות יין עם המצלמה לזיהוי מיידי', tag: 'new' },
      { text: 'Search wines by name with detailed tasting notes and ratings', textHe: 'חפש יינות לפי שם עם פרטי טעימה ודירוגים', tag: 'new' },
      { text: 'Personal match score shows how well a wine fits your taste', textHe: 'ציון התאמה אישי מראה כמה יין מתאים לטעם שלך', tag: 'new' },
      { text: 'Wishlist to save wines you want to try', textHe: 'רשימת משאלות לשמירת יינות שרוצים לנסות', tag: 'new' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-01-15',
    title: 'Welcome to WineJourney',
    titleHe: 'ברוכים הבאים ל-WineJourney',
    highlights: [
      { text: 'Build your taste profile through guided onboarding', textHe: 'בנה את פרופיל הטעם שלך דרך הדרכה מונחית', tag: 'new' },
      { text: 'Track wines in your personal cellar', textHe: 'עקוב אחר יינות במרתף האישי שלך', tag: 'new' },
      { text: 'Dark mode and Hebrew/English support', textHe: 'מצב כהה ותמיכה בעברית/אנגלית', tag: 'new' },
    ],
  },
];
