import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
    },
    {
      path: '/movies',
      name: 'movies',
      component: () => import('@/views/MoviesView.vue'),
    },
    {
      path: '/movies/new',
      name: 'movies.new',
      component: () => import('@/views/MovieFormView.vue'),
    },
    {
      path: '/movies/:id/edit',
      name: 'movies.edit',
      component: () => import('@/views/MovieFormView.vue'),
    },
    {
      path: '/movies/:id',
      name: 'movies.show',
      component: () => import('@/views/MovieDetailView.vue'),
    },
    {
      path: '/actors/:id',
      name: 'actors.show',
      component: () => import('@/views/ActorDetailView.vue'),
    },
    {
      path: '/lists',
      name: 'lists',
      component: () => import('@/views/ListsView.vue'),
    },
    {
      path: '/lists/:id',
      name: 'lists.show',
      component: () => import('@/views/ListDetailView.vue'),
    },
    {
      path: '/tmdb',
      name: 'tmdb',
      component: () => import('@/views/TmdbSearchView.vue'),
    },
    {
      path: '/sync',
      name: 'sync',
      component: () => import('@/views/SyncView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/StatsView.vue'),
    },
  ],
})

export default router
