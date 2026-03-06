export type SommelierPhase = 'discovery' | 'learning' | 'personalization';

export interface SommelierProfile {
  id: string;
  user_id: string;
  phase: SommelierPhase;
  discovery_data: DiscoveryData;
  occasions: string[];
  taste_precision: number;
  engagement_events: EngagementEvent[];
  tonight_mode_history: TonightSession[];
  conversation_history: ConversationItem[];
  last_interaction: string;
  created_at: string;
}

export interface DiscoveryData {
  energy?: 'bold_structured' | 'fresh_vibrant' | 'both';
  flavor_sliders?: {
    fruity_savory: number;
    smooth_structured: number;
    light_fullbodied: number;
  };
  occasions?: string[];
  recognized_styles?: string[];
  preliminary_profile?: PreliminaryProfile;
  feedback_loop?: 'yes' | 'close' | 'not_really';
}

export interface PreliminaryProfile {
  traits: string[];
  regions: string[];
  styles: string[];
  radar: { body: number; tannin: number; sweetness: number; acidity: number };
  wine_suggestion: WineSuggestion;
  alternatives: WineSuggestion[];
}

export interface WineSuggestion {
  name: string;
  winery: string;
  region: string;
  grape: string;
  description: string;
  why_match: string;
}

export type ConversationItemType = 'response' | 'insight';
export type ConfidenceLevel = 'high' | 'medium' | 'early_learning';

export interface ActionChip {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface ConversationItem {
  id: string;
  type: ConversationItemType;
  title: string;
  content: string;
  reasons?: string[];
  confidence?: ConfidenceLevel;
  actions?: ActionChip[];
  wine?: WineSuggestion;
  radar?: { body: number; tannin: number; sweetness: number; acidity: number };
  created_at: string;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatWineCard {
  name: string;
  winery: string;
  region?: string;
  grape?: string;
  wine_type?: string;
  country?: string;
  match?: number;
  reason?: string;
  tasting_note?: string;
  image_url?: string;
  food_pairings?: string[];
  alcohol?: string;
  vivino_rating?: number;
  vivino_reviews?: number;
  tasting_notes?: { nose?: string[]; palate?: string[]; finish?: string };
  serving?: { drink_from?: number; drink_until?: number; decant_minutes?: number; temperature_celsius?: number };
  positive_matches?: string[];
  mismatches?: string[];
  wine_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number };
  profile_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number };
  why_drink_it?: string;
  similar_wines_note?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  wines?: ChatWineCard[];
  actions?: ActionChip[];
  created_at: string;
  isStreaming?: boolean;
}

export interface ChatToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatApiResponse {
  message: string;
  wines?: ChatWineCard[];
  actions?: ActionChip[];
}

export interface EngagementEvent {
  type: 'search' | 'cellar_add' | 'wishlist_add' | 'wine_liked' | 'rating' | 'refinement' | 'tonight_mode';
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface TonightSession {
  occasion: string;
  food?: string;
  mood?: string;
  recommendation?: string;
  timestamp: string;
}

export interface SommelierState {
  phase: SommelierPhase;
  maxUnlockedPhase: SommelierPhase;
  precision: number;
  hasDiscoveryData: boolean;
  likedWinesCount: number;
  conversationHistory: ConversationItem[];
}

export const WINE_STYLES = [
  { id: 'elegant_pinot', label: 'Elegant Pinot Noir', labelHe: 'פינו נואר אלגנטי', type: 'red' as const },
  { id: 'bold_cabernet', label: 'Bold Napa Cabernet', labelHe: 'קברנה נאפה נועז', type: 'red' as const },
  { id: 'mineral_chablis', label: 'Mineral Chablis', labelHe: 'שאבלי מינרלי', type: 'white' as const },
  { id: 'creamy_chardonnay', label: 'Creamy Chardonnay', labelHe: 'שרדונה קרמי', type: 'white' as const },
  { id: 'rioja_reserva', label: 'Rioja Reserva', labelHe: 'ריוחה רזרבה', type: 'red' as const },
  { id: 'provence_rose', label: 'Provence Rosé', labelHe: 'רוזה פרובנס', type: 'rose' as const },
  { id: 'barolo', label: 'Barolo', labelHe: 'ברולו', type: 'red' as const },
  { id: 'sauvignon_blanc', label: 'Marlborough Sauvignon Blanc', labelHe: 'סוביניון בלאן מרלבורו', type: 'white' as const },
] as const;

export const OCCASIONS = [
  { id: 'casual_dinner', labelEn: 'Casual dinner', labelHe: 'ארוחת ערב יומיומית' },
  { id: 'hosting', labelEn: 'Hosting friends', labelHe: 'אירוח חברים' },
  { id: 'special', labelEn: 'Special occasions', labelHe: 'אירועים מיוחדים' },
  { id: 'exploring', labelEn: 'Just exploring', labelHe: 'סתם מחפש' },
] as const;
