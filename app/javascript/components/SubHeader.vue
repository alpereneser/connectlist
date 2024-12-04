<template>
  <nav class="bg-white border-b border-gray-200">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-12">
        <!-- Left Navigation -->
        <div class="flex items-center space-x-8">
          <router-link to="/timeline" class="flex items-center text-orange-500 border-b-2 border-orange-500 h-full">
            <svg class="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Timeline
          </router-link>
          
          <router-link to="/series" class="flex items-center text-gray-500 hover:text-gray-900">
            <svg class="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            Series
          </router-link>

          <router-link to="/books" class="flex items-center text-gray-500 hover:text-gray-900">
            <svg class="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            Books
          </router-link>

          <router-link to="/videos" class="flex items-center text-gray-500 hover:text-gray-900">
            <svg class="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            Videos
          </router-link>

          <router-link to="/people" class="flex items-center text-gray-500 hover:text-gray-900">
            <svg class="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            People
          </router-link>
        </div>

        <!-- Right Buttons -->
        <div class="flex items-center space-x-4">
          <button class="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 rounded-lg border border-gray-300 hover:border-gray-400">
            <svg class="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
            </svg>
            Discover
          </button>

          <button class="flex items-center px-4 py-2 text-white bg-orange-500 hover:bg-orange-600 rounded-lg">
            <svg class="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            Add List
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'SubHeader'
}
</script>
