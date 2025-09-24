# 🔗 ConnectList

**ConnectList** is a modern social media platform for creating, sharing, and discovering curated lists. Whether it's movies, books, games, places, or people - organize your interests and connect with like-minded individuals.

🌐 **Live Demo**: [https://connectlist.me](https://connectlist.me)

[![Netlify Status](https://api.netlify.com/api/v1/badges/connectlist/deploy-status.svg)](https://app.netlify.com/sites/connectlist/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)

## 📊 Project Stats

- **🚀 Performance**: Lighthouse Score 95+ (Performance, Accessibility, Best Practices, SEO)
- **📱 PWA Ready**: Installable on all devices with offline functionality
- **🌍 Multilingual**: English & Turkish support with i18next
- **⚡ Fast Build**: ~15s build time with Vite optimization
- **🔧 Type Safe**: 100% TypeScript coverage
- **📦 Bundle Size**: Optimized chunks with code splitting
- **🛡️ Security**: Environment-based configuration with secure API proxies

## ✨ Features

### 🎬 Content Categories
- **Movies & TV Series** - Create watchlists and share recommendations
- **Books** - Build reading lists and discover new authors
- **Games** - Track your gaming journey and wishlist
- **Places** - Share travel destinations and local favorites
- **People** - Curate lists of inspiring individuals

### 🌐 Social Features
- **Follow System** - Connect with users who share your interests
- **Real-time Notifications** - Stay updated on list activities
- **Comments & Interactions** - Engage with community content
- **Direct Messaging** - Private conversations with followers

### 📱 Modern Experience
- **Progressive Web App (PWA)** - Install on any device
- **Responsive Design** - Optimized for mobile and desktop
- **Multilingual Support** - Available in English and Turkish
- **Dark/Light Themes** - Comfortable viewing experience
- **Offline Functionality** - Access your lists anywhere

### 🔍 Discovery
- **Smart Search** - Find content across all categories
- **Category Filtering** - Browse by specific interests
- **Trending Content** - Discover popular lists and items
- **Personalized Recommendations** - AI-powered suggestions

## 🛠️ Tech Stack

### Frontend
- **React 18.3.1** - Modern UI library with concurrent features
- **TypeScript 5.6.2** - Type-safe development with latest features
- **Vite 5.4.10** - Lightning-fast build tool and dev server
- **TailwindCSS 3.4.14** - Utility-first styling with JIT compilation
- **React Router 6.28.0** - Declarative client-side routing
- **TanStack Query 5.59.0** - Powerful data fetching and caching
- **i18next 23.16.4** - Comprehensive internationalization
- **Framer Motion 11.11.17** - Production-ready motion library
- **Radix UI** - Unstyled, accessible UI primitives
- **Lucide React 0.460.0** - Beautiful & consistent icon library

### Backend & Services
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication
  - Storage
  - Edge Functions
- **Netlify** - Deployment and hosting
  - Serverless Functions
  - Edge Functions
  - CI/CD Pipeline
  - Environment Management
- **SendGrid** - Email notifications and transactional emails
- **TMDB API** - Movie and TV data
- **Google Books API** - Book information
- **RAWG API** - Game database
- **Google Places API** - Location data with photo support
- **Foursquare API** - Additional place information
- **YouTube API** - Video content integration

### Development Tools
- **ESLint 9.13.0** - Modern code linting with flat config
- **TypeScript ESLint 8.11.0** - TypeScript-specific linting rules
- **PostCSS 8.4.49** - CSS processing and optimization
- **Autoprefixer 10.4.20** - Automatic vendor prefixing
- **Netlify CLI** - Local development and deployment
- **MCP (Model Context Protocol)** - AI-powered development assistance
- **Vite PWA Plugin 0.20.5** - Progressive Web App capabilities
- **React Hook Form 7.53.2** - Performant forms with easy validation
- **Zod 3.23.8** - TypeScript-first schema validation
- **Class Variance Authority** - Type-safe component variants

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/alpereneser/connectlist.git
   cd connectlist
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # External API Keys
   VITE_TMDB_API_KEY=your_tmdb_api_key
   VITE_GOOGLE_BOOKS_API_KEY=your_google_books_api_key
   VITE_RAWG_API_KEY=your_rawg_api_key
   VITE_GOOGLE_PLACES_API_KEY=your_google_places_api_key
   VITE_FOURSQUARE_API_KEY=your_foursquare_api_key
   VITE_YOUTUBE_API_KEY=your_youtube_api_key
   
   # Email Service Configuration
   SENDGRID_API_KEY=your_sendgrid_api_key
   SENDGRID_FROM_EMAIL=your_verified_email
   SENDGRID_TEMPLATE_ID=your_template_id
   
   # Analytics & Monitoring
   VITE_GA_MEASUREMENT_ID=your_google_analytics_id
   VITE_CLARITY_PROJECT_ID=your_clarity_project_id
   
   # MCP Configuration
   MCP_SUPABASE_CONNECTION_STRING=your_postgres_connection_string
   MCP_FIGMA_ACCESS_TOKEN=your_figma_access_token
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   This will start Netlify Dev which includes both the frontend and serverless functions.

5. **Open your browser**
   
   Navigate to `http://localhost:3999/` (Netlify Dev proxied UI; Functions are available under `/.netlify/functions/*`)

#### Local Email Functions & Mailtrap Smoke Test

To verify local email functions:

1. Ensure your `.env` contains:
   ```env
   MAILTRAP_TOKEN=your_mailtrap_api_token
   ```
2. Test function endpoints via Netlify Dev proxy (running on `http://localhost:3999/`):
   - Email test page (GET):
     ```powershell
     Invoke-WebRequest -UseBasicParsing -Method Get -Uri http://localhost:3999/.netlify/functions/email-test
     ```
   - Mailtrap send (POST JSON):
     ```powershell
     $body = @{ to = "test@example.com"; subject = "ConnectList Mailtrap Smoke"; text = "Smoke test from Netlify function" } | ConvertTo-Json
     Invoke-RestMethod -Method Post -Uri http://localhost:3999/.netlify/functions/mailtrap-send -ContentType 'application/json' -Body $body
     ```
   - Successful response example:
     ```
     success id
     ------- --
        True <message-id-from-mailtrap>
     ```

Notes:
- Netlify Dev ports configured in `netlify.toml`:
  - `[dev] port = 3999` (proxy UI)
  - `[dev] targetPort = 3002` (Vite)
  - `[dev] functionsPort = 8888` (Functions)
- The list like action triggers email via `triggerListLikedNotification` after a successful like, respecting user email preferences.


### Available Scripts

```bash
# Development
npm run dev          # Start Netlify Dev server with functions
npm run preview      # Preview production build locally

# Building
npm run build        # Build for production
npm run lint         # Run ESLint

# MCP Servers
npm run mcp:supabase # Start Supabase MCP server
npm run mcp:figma    # Start Figma MCP server
npm run mcp:start    # Start default MCP server
```

### Building for Production

```bash
npm run build
```

## 📁 Project Structure

```
connectlist/
├── public/                 # Static assets
│   ├── manifest.json      # PWA manifest
│   ├── serviceWorker.js   # Service worker for offline functionality
│   ├── sitemap.xml        # SEO sitemap
│   └── _headers           # Netlify headers configuration
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions and API clients
│   ├── types/            # TypeScript type definitions
│   ├── contexts/         # React contexts
│   ├── i18n/             # Internationalization
│   └── utils/            # Helper functions
├── netlify/
│   └── functions/        # Serverless functions
│       ├── daily-digest.js        # Email digest automation
│       ├── google-places-proxy.ts # Places API proxy
│       ├── dynamic-sitemap.ts     # Dynamic sitemap generation
│       └── email-test.js          # Email testing utilities
├── supabase/
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge functions
├── scripts/              # Build and utility scripts
│   ├── mcp-supabase.js   # MCP Supabase server
│   ├── mcp-figma.cjs     # MCP Figma integration
│   └── test-mcp-connection.js # MCP testing utilities
├── netlify.toml          # Netlify configuration
├── DOCUMENTATION.md      # Comprehensive project documentation
└── package.json          # Dependencies and scripts
```

## 🌍 Deployment

### Netlify CLI (Recommended)

1. **Install Netlify CLI globally**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

4. **Deploy to production**
   ```bash
   netlify deploy --prod
   ```

### Netlify Dashboard (Alternative)

1. **Connect your GitHub repository** to Netlify
2. **Set environment variables** in Netlify dashboard
3. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
4. **Deploy automatically** on every push to main branch

### Manual Deployment

```bash
npm run build
# Upload dist/ folder to your hosting service
```

### Environment Variables for Production

Ensure these environment variables are set in your Netlify dashboard:

```env
# Required for core functionality
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# External APIs
VITE_TMDB_API_KEY=your_tmdb_api_key
VITE_GOOGLE_BOOKS_API_KEY=your_google_books_api_key
VITE_RAWG_API_KEY=your_rawg_api_key
VITE_GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Email service
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_email

# Analytics (optional)
VITE_GA_MEASUREMENT_ID=your_google_analytics_id
VITE_CLARITY_PROJECT_ID=your_clarity_project_id
```

## 🎨 Features in Detail

### List Management
- Create lists with rich descriptions
- Add items from multiple content sources
- Organize with categories and tags
- Share publicly or keep private
- Collaborative list editing

### User Profiles
- Customizable avatars and bios
- Follow/unfollow system
- Activity feeds
- List collections
- Privacy settings

### Search & Discovery
- Global search across all content
- Category-specific filtering
- Trending and popular content
- Personalized recommendations
- Advanced search filters

### Mobile Experience
- Native app-like experience
- Offline functionality
- Push notifications
- Touch-optimized interface
- Install prompts

## Recent Updates

### Latest Features & Improvements

#### Internationalization & UX Enhancements (January 2025)
- **Fixed i18n Key Structure**: Resolved inconsistent translation key usage across Messages page
  - Updated `messages.*` keys to proper `common.messages.*` namespace structure
  - Fixed search results "No results found" translations to use correct `common.noResults` key
  - Ensured consistent translation key hierarchy throughout the application
- **Language-Aware Loading Quotes**: Enhanced category switching experience with multilingual motivational quotes
  - Turkish quotes: "Iyi fikirler paylasinca cogalir", "Kesfetmek, ilk adimi atmaktir", etc.
  - English quotes: "Good ideas grow when shared", "Exploration begins with the first step", etc.
  - Dynamic language detection based on user's selected language preference
- **Messages Page Layout Fixes**: Improved empty state containers to properly fill available space
  - Fixed "No conversations yet" area to extend to bottom of page
  - Enhanced "Select a conversation" placeholder to use full height
  - Better visual hierarchy and spacing in messaging interface
- **Mobile Messaging & Comments Polish**: Added safe-area padding helpers so header and BottomMenu spacing stays correct on phones
  - Comment modal input stays above the bottom menu and respects safe-area insets
  - Message list and composer share consistent offsets; Message Detail header simplified to avoid duplicate back icons
  - BottomMenu visibility rules updated so inbox and detail screens behave as expected
- **Timeline & Profile Lazy Loading**: Replaced window scroll listeners with IntersectionObserver sentinels for home feed and profile lists
  - Prevents repeated fetch loops while keeping infinite scroll and pull-to-refresh working
  - Maintains scroll position when new data is appended, with mobile-friendly padding adjustments
- **Create List Step 1 Stabilization**: Restored JSX structure after prior regression and ensured ASCII-only copy
  - Fixed video error popup, back header, and build pipeline regressions
  - Verified `npm run build` passes

#### 🚀 Netlify Functions & Email System
#### Netlify Functions & Email System
- **Email Service Integration**: SendGrid integration for transactional emails and notifications
- **Google Places Proxy**: Secure API proxy for location data with photo support
- **Dynamic Sitemap**: Automated sitemap generation for better SEO
- **Email Testing**: Comprehensive email testing infrastructure

#### 🔧 MCP (Model Context Protocol) Integration
#### MCP (Model Context Protocol) Integration
- **Figma MCP Server**: Design system integration for development workflow
- **PostgreSQL MCP**: Advanced database operations and analytics
- **Development Scripts**: Automated MCP server management and testing

#### 📱 Mobile Layout Improvements
- **Fixed Search Page**: Resolved mobile category menu sticky positioning with proper header offset calculations
- **Fixed Profile Page**: Updated mobile padding to prevent content overlap with header elements
- **Fixed Settings Page**: Corrected sticky tab navigation positioning for mobile devices
- **Standardized Safe Areas**: Implemented consistent CSS variables for mobile safe area calculations across all pages
- **Enhanced Mobile UX**: All sticky elements now properly account for device safe areas and header heights

#### 🛠️ Infrastructure & DevOps
- **Netlify CLI Integration**: Streamlined development workflow with `netlify dev`
- **Production Deployment**: Automated CI/CD pipeline with build optimization
- **Function Dependencies**: Isolated package management for serverless functions
- **Environment Configuration**: Enhanced environment variable management
- **Build Optimization**: Improved build process with chunk size optimization

#### ⚙️ Development Environment Optimization (January 2025)
- **Vite Configuration Updates**: Enhanced development server configuration for better Netlify Dev integration
  - Updated server port configuration to 3002 with `strictPort: true` for consistent proxy behavior
  - Improved CORS and host settings for seamless local development
  - Optimized build process with better chunk size management
- **Netlify Dev Proxy Setup**: Streamlined proxy configuration between Netlify Dev and Vite
  - Netlify Dev runs on port 3999 (main UI)
  - Vite development server on port 3002 (framework)
  - Functions available on port 8888
  - Automatic proxy routing for seamless development experience
- **Service Worker Optimization**: Enhanced service worker management for development
  - Improved cache clearing for localhost development
  - Better separation between development and production SW behavior
  - Resolved MIME type conflicts in development environment
- **Production Deployment**: Successfully deployed to https://connectlist.me
  - Build time: 15.91s with optimized asset bundling
  - 64 files and 7 functions deployed to CDN
  - Automated sitemap generation with 224 dynamic routes

#### 💬 Messaging System Enhancements (January 2025)
- **Real-time Messaging**: Complete Instagram/WhatsApp-style messaging system
  - Real-time message sync with Supabase subscriptions
  - Typing indicators with presence tracking
  - Message delivery status and error handling
  - Optimistic UI updates for instant messaging feel
- **User-Friendly URLs**: Enhanced messaging navigation
  - Added `/messages/@username` format for direct user messaging
  - Maintained backward compatibility with conversation ID URLs
  - Automatic conversation creation for new message threads
  - Seamless routing between username and conversation ID formats
- **Unread Message Indicators**: Visual notification system
  - Orange badge indicators for unread message counts
  - Real-time unread count updates across conversations
  - "99+" format for high message counts
  - Integrated with conversation list for better UX
- **Email Notifications**: Mailtrap-powered messaging alerts
  - Automatic email notifications for new messages
  - Professional email templates with sender information
  - User preference controls for email notifications
  - Fixed receiver detection logic for accurate notifications
- **UI/UX Improvements**: Modern messaging interface
  - Removed BottomMenu spacing conflicts in message detail
  - Added back navigation button for better mobile experience
  - Full-height container utilization for better space usage
  - Responsive design optimizations for web and mobile
- **Profile Page Optimization**: Cleaner mobile experience
  - Hidden SubHeader on Profile pages for more content space
  - Improved padding and layout consistency
  - Better mobile navigation flow

## 🔧 Configuration

### Database Schema
The application uses Supabase with the following main tables:
- `profiles` - User profiles and settings
- `lists` - User-created lists
- `list_items` - Items within lists
- `follows` - User follow relationships
- `notifications` - System notifications
- `messages` - Direct messages

### API Integration
- **TMDB**: Movie and TV show data
- **Google Books**: Book information and covers
- **RAWG**: Video game database
- **Google Places**: Location and place data
- **Foursquare**: Additional place information

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use conventional commit messages
- Write tests for new features
- Update documentation as needed
- Ensure mobile responsiveness

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/alpereneser/connectlist/issues)
- **Discussions**: [GitHub Discussions](https://github.com/alpereneser/connectlist/discussions)
- **Email**: support@connectlist.app

## 🌟 Acknowledgments

- [Supabase](https://supabase.com) - Backend infrastructure
- [Netlify](https://netlify.com) - Hosting and deployment
- [TMDB](https://themoviedb.org) - Movie and TV data
- [Phosphor Icons](https://phosphoricons.com) - Beautiful icons
- [TailwindCSS](https://tailwindcss.com) - Styling framework

---

**Made with ❤️ by [Alperen Eser](https://github.com/alpereneser)**

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-site-id/deploy-status.svg)](https://app.netlify.com/sites/your-site/deploys)
