// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Import Tailwind CSS
import '../css/application.css'

// Import all controllers
import './controllers'

// Create Vue app
const app = createApp(App)
app.use(router)
app.mount('#app')
