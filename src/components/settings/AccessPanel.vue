<template>
  <div class="space-y-4">
    <p class="text-xs text-[var(--text-muted)] leading-relaxed">
      {{ $t('access.intro') }}
    </p>

    <!-- Nur mit Shelf: ohne Konto gibt es keine Zugänge zu verwalten. -->
    <div v-if="!settings.isOnline" class="text-xs text-[var(--text-muted)] opacity-70">
      {{ $t('access.onlineOnly') }}
    </div>

    <template v-else>
      <div v-if="loading" class="flex items-center gap-3 py-6">
        <div class="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-xs text-[var(--text-muted)]">{{ $t('access.loading') }}</span>
      </div>

      <div v-else-if="error" class="space-y-3">
        <p class="text-xs text-red-400 font-bold">{{ error }}</p>
        <button
          @click="load"
          class="px-4 py-2 rounded-xl bg-[var(--bg-app)] border border-[var(--border-ui)] text-xs font-black uppercase tracking-widest text-[var(--text-main)]"
        >
          {{ $t('access.retry') }}
        </button>
      </div>

      <template v-else>
        <section v-for="gruppe in gruppen" :key="gruppe.type" class="space-y-2">
          <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">
            {{ gruppe.type === 'oauth' ? $t('access.apps') : $t('access.devices') }}
          </h3>

          <div
            v-for="token in gruppe.tokens"
            :key="token.id"
            class="flex items-center gap-3 bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl px-4 py-3"
          >
            <i :class="gruppe.type === 'oauth' ? 'bi bi-box-arrow-in-right' : 'bi bi-laptop'"
               class="text-[var(--text-muted)]"></i>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-[var(--text-main)] truncate">
                {{ token.name }}
                <span v-if="token.is_current" class="ml-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  {{ $t('access.thisDevice') }}
                </span>
              </p>
              <p class="text-[11px] text-[var(--text-muted)] opacity-70">
                {{ token.last_used_at ? $t('access.lastUsed', { date: kurzesDatum(token.last_used_at) }) : $t('access.neverUsed') }}
              </p>
            </div>
            <button
              @click="widerrufen(token)"
              :disabled="busy"
              class="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
            >
              {{ $t('access.revoke') }}
            </button>
          </div>
        </section>

        <p v-if="!tokens.length" class="text-xs text-[var(--text-muted)] opacity-70">
          {{ $t('access.none') }}
        </p>

        <button
          v-if="tokens.some(t => !t.is_current)"
          @click="andereWiderrufen"
          :disabled="busy"
          class="px-4 py-2 rounded-xl bg-[var(--bg-app)] border border-[var(--border-ui)] text-xs font-black uppercase tracking-widest text-[var(--text-main)] disabled:opacity-40"
        >
          {{ $t('access.revokeOthers') }}
        </button>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useApi } from '@/composables/useApi'
import { useSettingsStore } from '@/stores/settings'

interface AccessToken {
  id: number
  name: string
  type: 'device' | 'oauth'
  is_current: boolean
  last_used_at: string | null
  created_at: string | null
}

const { t } = useI18n()
const { apiGet, apiDelete } = useApi()
const settings = useSettingsStore()

const tokens  = ref<AccessToken[]>([])
const loading = ref(false)
const busy    = ref(false)
const error   = ref('')

// Getrennt aufgeführt: eine App-Zustimmung nimmt man aus anderen Gründen
// zurück als ein altes Gerät.
const gruppen = computed(() =>
  [
    { type: 'device' as const, tokens: tokens.value.filter(t => t.type !== 'oauth') },
    { type: 'oauth'  as const, tokens: tokens.value.filter(t => t.type === 'oauth') },
  ].filter(g => g.tokens.length > 0),
)

function kurzesDatum(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

async function load() {
  if (!settings.isOnline) return
  loading.value = true
  error.value = ''
  try {
    const data = await apiGet('/user/tokens')
    tokens.value = data?.data ?? []
  } catch (e: any) {
    // 404 heißt hier nicht "nicht gefunden", sondern "diese Shelf kennt die
    // Funktion noch nicht" — sie kam mit 2.43.0.
    error.value = e?.response?.status === 404 ? t('access.needsNewerShelf') : (e?.message ?? String(e))
  } finally {
    loading.value = false
  }
}

async function widerrufen(token: AccessToken) {
  const frage = token.is_current ? t('access.confirmCurrent') : t('access.confirm', { name: token.name })
  if (!confirm(frage)) return

  busy.value = true
  try {
    await apiDelete(`/user/tokens/${token.id}`)
    // Neu laden statt lokal streichen: der Server entscheidet, was noch gilt.
    await load()
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    busy.value = false
  }
}

async function andereWiderrufen() {
  if (!confirm(t('access.confirmOthers'))) return

  busy.value = true
  try {
    await apiDelete('/user/tokens/others')
    await load()
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>
