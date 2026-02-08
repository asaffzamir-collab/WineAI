# WineJourney 🍷

A wine discovery and collection management app for wine lovers and collectors. Search wines by photo or text, get detailed information including Vivino ratings, match wines to your personal taste profile, and track your cellar and wishlist.

## Features

### MVP (Phase 1)
- ✅ **Magic Link Authentication** - Passwordless email login
- ✅ **Onboarding Quiz** - Personalized taste profile generation
- ✅ **Wine Search** - Search by text or wine label photo (AI-powered)
- ✅ **Wine Card** - Comprehensive wine information with profile matching
- ✅ **Taste Profile** - View your preferences for red, white, and rosé wines
- ✅ **Cellar Management** - Track your wine collection
- ✅ **Wishlist** - Bookmark wines for future purchase
- ✅ **Home Dashboard** - Stats overview and quick actions
- ✅ **Hebrew (RTL) & English** - Full internationalization support

### Phase 2 (Future)
- 📋 Advanced cellar filters
- 📋 Visual cellar map with drag-and-drop
- 📋 Store price management
- 📋 Wine rating and tasting notes

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Hosting | Vercel |
| Database | Supabase (PostgreSQL + Auth) |
| AI | OpenAI GPT-4o (text + vision) |
| Styling | Tailwind CSS + shadcn/ui |
| Language | Hebrew (RTL) first, English toggle |

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/schema.sql`
4. Paste and run the SQL to create all required tables

### 3. Configure Environment Variables

The `.env.local` file is already configured with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Deploy to Vercel

```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Project Structure

```
/app
  /api
    /cellar/route.ts       # Cellar CRUD operations
    /onboarding/route.ts   # Save onboarding quiz results
    /wine-search/route.ts  # AI wine search
    /wishlist/route.ts     # Wishlist CRUD operations
  /auth/callback/route.ts  # Magic link callback
  /cellar/page.tsx         # Cellar page
  /onboarding/page.tsx     # Onboarding quiz
  /profile/page.tsx        # Taste profile
  /search/page.tsx         # Wine search
  /settings/page.tsx       # App settings
  /wishlist/page.tsx       # Wishlist
  /page.tsx                # Home/Auth page
  /layout.tsx              # Root layout
  /globals.css             # Global styles

/components
  /pages/                  # Page-specific components
  /ui/                     # shadcn/ui components
  bottom-nav.tsx           # Mobile navigation
  onboarding-quiz.tsx      # Quiz component
  wine-card.tsx            # Wine display card

/lib
  /supabase/               # Supabase client setup
  openai.ts                # OpenAI integration
  utils.ts                 # Utility functions
  types.ts                 # TypeScript types

/messages
  he.json                  # Hebrew translations
  en.json                  # English translations

/supabase
  schema.sql               # Database schema
```

## Database Schema

The app uses the following tables:

- `user_profiles` - User settings and preferences
- `taste_profiles` - Wine taste preferences (red/white/rosé)
- `wines` - Cached wine data from AI
- `cellar_items` - User's wine collection
- `wishlist_items` - Bookmarked wines
- `wine_tastings` - Tasting history (for profile updates)
- `store_prices` - Store price information

All tables have Row Level Security (RLS) enabled for data protection.

## Language Support

The app supports Hebrew (RTL) and English. Language can be changed in Settings.

Translation files are located in `/messages/`:
- `he.json` - Hebrew (default)
- `en.json` - English

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.
