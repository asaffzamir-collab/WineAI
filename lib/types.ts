// Database types
export interface UserProfile {
  id: string;
  display_name?: string;
  preferred_language?: 'he' | 'en';
  preferred_currency?: string;
  onboarding_completed: boolean;
  created_at?: string;
}

export interface TasteProfile {
  id: string;
  user_id: string;
  wine_type: 'red' | 'white' | 'rose';
  profile_data: TasteProfileData;
  updated_at?: string;
}

export interface TasteProfileData {
  overall_style?: string;
  body_structure?: string;
  fruit_profile?: string;
  style_notes?: string;
  recommended_grapes?: string[];
  recommended_regions?: string[];
  what_to_avoid?: string[];
  summary?: string;
}

export interface Wine {
  id: string;
  name: string;
  winery: string;
  vivino_rating?: number;
  vivino_reviews?: number;
  country?: string;
  region?: string;
  grapes?: string[];
  alcohol?: number;
  wine_type: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert';
  tasting_notes?: {
    nose?: string[];
    palate?: string[];
    finish?: string;
  };
  ai_description?: string;
  image_url?: string;
  created_at?: string;
}

export interface CellarItem {
  id: string;
  user_id: string;
  wine_id: string;
  quantity: number;
  purchase_price?: number;
  purchase_date?: string;
  storage_location?: string;
  drink_from?: string;
  drink_until?: string;
  notes?: string;
  created_at?: string;
  wines?: Wine;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  wine_id: string;
  priority?: number;
  notes?: string;
  created_at?: string;
  wines?: Wine;
}

export interface WineTasting {
  id: string;
  user_id: string;
  wine_id: string;
  rating: number;
  notes?: string;
  tasted_at?: string;
}

export interface StorePrice {
  id: string;
  wine_id: string;
  user_id: string;
  store_name: string;
  price: number;
  currency: string;
  country: string;
  availability?: string;
  purchase_url?: string;
  updated_at?: string;
}
