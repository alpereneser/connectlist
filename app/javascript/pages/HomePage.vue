<template>
  <div class="min-h-screen bg-gray-50">
    <Header />
    <SubHeader />
    <main class="container mx-auto px-4 py-8">
      <!-- Ana sayfa içeriği buraya gelecek -->
      <h1 class="text-2xl font-bold text-gray-900">Welcome to Connect:List</h1>
    </main>
  </div>
</template>

<script>
import Header from '../components/Header.vue'
import SubHeader from '../components/SubHeader.vue'

export default {
  name: 'HomePage',
  components: {
    Header,
    SubHeader
  }
}
</script>
