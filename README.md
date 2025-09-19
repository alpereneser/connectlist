# 🔗 ConnectList

**ConnectList** is a modern social media platform for creating, sharing, and discovering curated lists. Whether it's movies, books, games, places, or people - organize your interests and connect with like-minded individuals.

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
- **React 18.3.1** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first styling
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **i18next** - Internationalization

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
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Phosphor Icons** - Beautiful icon library
- **Lucide React** - Additional icon library
- **PostCSS** - CSS processing
- **Netlify CLI** - Local development and deployment
- **MCP (Model Context Protocol)** - AI-powered development assistance
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server

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
   
   Navigate to `http://localhost:8888` (Netlify Dev default port)

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

### Netlify (Recommended)

1. **Connect your GitHub repository** to Netlify
2. **Set environment variables** in Netlify dashboard
3. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Deploy automatically** on every push to main branch

### Manual Deployment

```bash
npm run build
# Upload dist/ folder to your hosting service
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

## 📱 Recent Updates

### Latest Features & Improvements

#### 🌐 Internationalization & UX Enhancements (January 2025)
- **Fixed i18n Key Structure**: Resolved inconsistent translation key usage across Messages page
  - Updated `messages.*` keys to proper `common.messages.*` namespace structure
  - Fixed search results "No results found" translations to use correct `common.noResults` key
  - Ensured consistent translation key hierarchy throughout the application
- **Language-Aware Loading Quotes**: Enhanced category switching experience with multilingual motivational quotes
  - Turkish quotes: "İyi fikirler paylaşınca çoğalır", "Keşfetmek, ilk adımı atmaktır", etc.
  - English quotes: "Good ideas grow when shared", "Exploration begins with the first step", etc.
  - Dynamic language detection based on user's selected language preference
- **Messages Page Layout Fixes**: Improved empty state containers to properly fill available space
  - Fixed "No conversations yet" area to extend to bottom of page
  - Enhanced "Select a conversation" placeholder to use full height
  - Better visual hierarchy and spacing in messaging interface

#### 🚀 Netlify Functions & Email System
- **Daily Digest Function**: Automated daily email digest system with user activity summaries
- **Email Service Integration**: SendGrid integration for transactional emails and notifications
- **Google Places Proxy**: Secure API proxy for location data with photo support
- **Dynamic Sitemap**: Automated sitemap generation for better SEO
- **Email Testing**: Comprehensive email testing infrastructure

#### 🔧 MCP (Model Context Protocol) Integration
- **Supabase MCP Server**: Direct database access and management through MCP
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