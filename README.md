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
- **Netlify** - Deployment and hosting
- **SendGrid** - Email notifications
- **TMDB API** - Movie and TV data
- **Google Books API** - Book information
- **RAWG API** - Game database
- **Google Places API** - Location data

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Phosphor Icons** - Beautiful icon library
- **PostCSS** - CSS processing

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
   # Supabase
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # API Keys
   VITE_TMDB_API_KEY=your_tmdb_api_key
   VITE_GOOGLE_BOOKS_API_KEY=your_google_books_api_key
   VITE_RAWG_API_KEY=your_rawg_api_key
   VITE_GOOGLE_PLACES_API_KEY=your_google_places_api_key
   VITE_FOURSQUARE_API_KEY=your_foursquare_api_key
   
   # Email Service
   SENDGRID_API_KEY=your_sendgrid_api_key
   SENDGRID_FROM_EMAIL=your_verified_email
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

## 📁 Project Structure

```
connectlist/
├── public/                 # Static assets
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
├── supabase/
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge functions
└── scripts/              # Build and utility scripts
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

### Mobile Layout Improvements (Latest)
- **Fixed Search Page**: Resolved mobile category menu sticky positioning with proper header offset calculations
- **Fixed Profile Page**: Updated mobile padding to prevent content overlap with header elements
- **Fixed Settings Page**: Corrected sticky tab navigation positioning for mobile devices
- **Standardized Safe Areas**: Implemented consistent CSS variables for mobile safe area calculations across all pages
- **Enhanced Mobile UX**: All sticky elements now properly account for device safe areas and header heights

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