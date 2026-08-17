<template>
  <div class="flex h-full">

    <!-- Left nav -->
    <aside class="w-52 flex-shrink-0 border-r border-[var(--border-ui)] py-6 px-3 flex flex-col gap-1">
      <button
        v-for="item in visibleSections"
        :key="item.id"
        @click="active = item.id"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all"
        :class="active === item.id
          ? 'bg-[var(--status-red)]/10 text-[var(--status-red)] border border-[var(--status-red)]/20'
          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] border border-transparent'"
      >
        <i :class="`bi bi-${item.icon} text-base leading-none`"></i>
        <span>{{ $t(item.labelKey) }}</span>
        <span v-if="item.id === 'updates' && settings.updateAvailable"
          class="ml-auto flex h-2 w-2 rounded-full bg-[var(--status-green)]"></span>
      </button>
    </aside>

    <!-- Right content -->
    <main class="flex-1 overflow-y-auto p-8 max-w-2xl">

      <!-- ── Allgemein ── -->
      <!-- Theme und Sprache saßen früher in einem eigenen Bereich
           "Erscheinungsbild"; für zwei Zeilen lohnt kein eigener Reiter.
           Die Texte liegen weiterhin unter settings.appearance.*. -->
      <template v-if="active === 'general'">
        <SectionHeader icon="gear" :title="$t('settings.general.title')" />

        <!-- Zeilen alphabetisch nach der deutschen Beschriftung:
             Beim Systemstart öffnen, Design, Sprache. -->
        <SettingsRow :label="$t('settings.general.autostartLabel')" :hint="$t('settings.general.autostartHint')">
          <button
            @click="toggleAutostart"
            role="switch"
            :aria-checked="autostart"
            class="relative w-11 h-6 rounded-full transition-colors"
            :class="autostart ? 'bg-[var(--status-green)]' : 'bg-[var(--border-ui)]'"
          >
            <span
              class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              :class="autostart ? 'translate-x-5' : 'translate-x-0'"
            ></span>
          </button>
        </SettingsRow>

        <SettingsRow :label="$t('settings.appearance.themeLabel')" :hint="$t('settings.appearance.themeHint')">
          <ThemeSwitcher />
        </SettingsRow>

        <SettingsRow :label="$t('settings.appearance.languageLabel')" :hint="$t('settings.appearance.languageHint')">
          <LanguageSwitcher />
        </SettingsRow>
      </template>

      <!-- ── Verbindung ── -->
      <template v-if="active === 'connection'">
        <SectionHeader icon="cloud" :title="$t('settings.connection.title')" />

        <div class="flex gap-3 mb-6">
          <ModeButton
            :active="settings.mode === 'standalone'"
            icon="pc-display"
            :label="$t('settings.connection.standalone')"
            @click="settings.mode = 'standalone'"
          />
          <ModeButton
            :active="settings.mode === 'online'"
            icon="cloud-fill"
            :label="$t('settings.connection.connectMode')"
            @click="settings.mode = 'online'"
          />
        </div>

        <template v-if="settings.mode === 'online'">
          <div class="space-y-4">
            <SettingsInput :label="$t('settings.connection.shelfUrl')" type="url" v-model="settings.shelfUrl" :placeholder="$t('settings.connection.shelfUrlPlaceholder')" />

            <!--
              Verbundenes Konto. Ohne diese Anzeige bleibt unsichtbar, unter
              welchem Konto der Abgleich schreibt — und wenn das ein anderes ist
              als das im Browser, kommen Bewertungen zwar an, tauchen in der
              Shelf aber nicht auf.
            -->
            <div v-if="settings.token" class="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                  {{ $t('settings.connection.accountTitle') }}
                </span>
                <button
                  @click="loadAccount"
                  :disabled="accountLoading"
                  class="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-40 transition-colors"
                  :title="$t('settings.connection.accountRecheck')"
                >
                  <i class="bi" :class="accountLoading ? 'bi-arrow-repeat animate-spin' : 'bi-arrow-clockwise'"></i>
                </button>
              </div>

              <div v-if="accountLoading" class="mt-1.5 text-sm text-[var(--text-muted)] opacity-60">
                {{ $t('settings.connection.accountLoading') }}
              </div>

              <div v-else-if="accountError" class="mt-1.5">
                <p class="text-sm font-bold text-[var(--status-red)]">{{ accountError }}</p>
              </div>

              <div v-else-if="account" class="mt-1.5 flex items-center gap-2 flex-wrap">
                <i class="bi bi-person-circle text-[var(--status-green)]"></i>
                <span class="text-sm font-bold text-[var(--text-main)]">{{ account.name || account.email }}</span>
                <span v-if="account.name && account.email" class="text-xs text-[var(--text-muted)] opacity-60">{{ account.email }}</span>
                <span v-if="account.id" class="text-[10px] text-[var(--text-muted)] opacity-40 font-mono">#{{ account.id }}</span>
              </div>

              <p class="mt-1.5 text-[10px] text-[var(--text-muted)] opacity-50 leading-relaxed">
                {{ $t('settings.connection.accountHint') }}
              </p>
            </div>

            <!-- OAuth Login -->
            <button
              @click="doOAuthLogin"
              :disabled="oauthLoading || !settings.shelfUrl"
              class="w-full bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 text-[var(--text-main)] font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
            >
              <i class="bi bi-shield-lock"></i>
              {{ oauthLoading ? $t('settings.connection.oauthWaiting') : $t('settings.connection.oauthLogin') }}
            </button>

            <!-- Divider -->
            <div class="flex items-center gap-3">
              <div class="flex-1 h-px bg-[var(--border-ui)]"></div>
              <span class="text-xs text-[var(--text-muted)] opacity-50">{{ $t('settings.connection.orManual') }}</span>
              <div class="flex-1 h-px bg-[var(--border-ui)]"></div>
            </div>

            <SettingsInput :label="$t('settings.connection.email')" type="email" v-model="loginEmail" :placeholder="$t('settings.connection.emailPlaceholder')" />
            <SettingsInput :label="$t('settings.connection.password')" type="password" v-model="loginPassword" placeholder="••••••••" />

            <button
              @click="doLogin"
              :disabled="loginLoading"
              class="w-full bg-[var(--status-red)] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/10"
            >
              <i class="bi bi-box-arrow-in-right"></i>
              {{ loginLoading ? $t('settings.connection.connecting') : $t('settings.connection.loginConnect') }}
            </button>
            <p v-if="loginError"   class="text-[var(--status-red)]   text-xs text-center font-bold">{{ loginError }}</p>
            <p v-if="loginSuccess" class="text-[var(--status-green)] text-xs text-center font-bold">{{ $t('settings.connection.loginSuccess') }}</p>

            <p class="text-center text-xs text-[var(--text-muted)] opacity-70">
              {{ $t('settings.connection.noAccount') }}
              <a href="https://movieshelf.info" target="_blank" class="text-[var(--status-red)] font-bold hover:underline">
                {{ $t('settings.connection.registerLink') }}
              </a>
            </p>
          </div>
        </template>
        <p v-else class="text-xs text-[var(--text-muted)] opacity-50">
          {{ $t('settings.connection.standaloneHint') }}
        </p>

        <SaveButton class="mt-6" @click="save" />
      </template>

      <!-- ── TMDb ── -->
      <template v-if="active === 'tmdb'">
        <SectionHeader icon="film" :title="$t('settings.tmdb.title')" />

        <img src="/tmdb.svg" alt="TMDb" class="h-4 w-auto mb-5" />

        <SettingsRow :label="$t('settings.tmdb.apiKeyLabel')" :hint="$t('settings.tmdb.apiKeyHint')">
          <a href="https://www.themoviedb.org/settings/api" target="_blank"
            class="text-xs text-[var(--status-red)] hover:underline font-bold">{{ $t('settings.tmdb.requestKey') }}</a>
        </SettingsRow>

        <div class="mt-3 mb-6">
          <input
            v-model="settings.tmdbApiKey"
            type="password"
            :placeholder="$t('settings.tmdb.apiKeyPlaceholder')"
            class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] opacity-80 focus:outline-none focus:border-[var(--status-red)]/50 transition-colors font-mono"
          />
        </div>

        <SaveButton @click="save" />
      </template>

      <!-- ── Jellyfin ── -->
      <template v-if="active === 'jellyfin'">
        <SectionHeader icon="hdd-network" :title="$t('jellyfin.title')" />
        <JellyfinPanel />
      </template>

      <!-- ── Updates ── -->
      <template v-if="active === 'updates'">
        <SectionHeader icon="arrow-repeat" :title="$t('settings.updates.title')" />

        <div class="glass rounded-2xl p-5 mb-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-bold text-[var(--text-main)]">{{ $t('settings.updates.installedVersion') }}</p>
              <p class="text-2xl font-black text-[var(--text-main)] mt-0.5">v{{ settings.appVersion }}</p>
            </div>
            <div v-if="settings.updateAvailable"
              class="flex items-center gap-2 bg-[var(--status-green)]/10 border border-[var(--status-green)]/20 rounded-xl px-3 py-1.5">
              <span class="flex h-2 w-2 rounded-full bg-[var(--status-green)] animate-pulse"></span>
              <span class="text-xs font-black text-[var(--status-green)] uppercase tracking-widest">
                {{ $t('settings.updates.available', { version: settings.newestVersion }) }}
              </span>
            </div>
            <span v-else class="text-xs text-[var(--text-muted)] opacity-50 font-bold uppercase tracking-widest">{{ $t('settings.updates.upToDate') }}</span>
          </div>
        </div>

        <!-- Changelog for new version -->
        <div v-if="settings.updateAvailable && settings.updateChangelog && !downloading"
          class="glass rounded-2xl p-5 mb-4">
          <p class="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60 mb-3">
            {{ $t('settings.updates.whatsNew', { version: settings.newestVersion }) }}
          </p>
          <div class="space-y-1.5">
            <template v-for="line in changelogLines" :key="line.text">
              <p v-if="line.type === 'heading'"
                class="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest opacity-50 mt-3 first:mt-0">
                {{ line.text }}
              </p>
              <div v-else-if="line.type === 'item'" class="flex gap-2">
                <span class="text-[var(--status-red)] flex-shrink-0 mt-0.5">·</span>
                <span class="text-xs text-[var(--text-main)] opacity-80">{{ line.text }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Download progress -->
        <div v-if="downloading" class="glass rounded-2xl p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-bold text-[var(--text-main)]">{{ $t('settings.updates.downloading') }}</p>
            <span class="text-sm font-black text-[var(--text-main)]">{{ downloadProgress }}%</span>
          </div>
          <div class="w-full bg-[var(--bg-app)] rounded-full h-2 overflow-hidden">
            <div class="h-2 bg-[var(--status-green)] rounded-full transition-all duration-300"
              :style="{ width: downloadProgress + '%' }"></div>
          </div>
          <p v-if="updateError" class="text-xs text-[var(--status-red)] font-bold mt-3">{{ updateError }}</p>
        </div>

        <!-- Persistent error (also visible after download finished/failed) -->
        <div v-if="updateError && !downloading"
          class="flex items-start gap-3 bg-[var(--status-red)]/10 border border-[var(--status-red)]/20 rounded-2xl px-4 py-3 mb-3">
          <i class="bi bi-exclamation-octagon-fill text-[var(--status-red)] flex-shrink-0 mt-0.5"></i>
          <p class="text-xs text-[var(--text-main)] opacity-90">{{ updateError }}</p>
        </div>

        <!-- Manual download notice -->
        <div v-if="settings.updateAvailable && settings.updateManual && !downloading"
          class="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 mb-3">
          <i class="bi bi-exclamation-triangle-fill text-amber-400 flex-shrink-0 mt-0.5"></i>
          <p class="text-xs text-[var(--text-main)] opacity-80">
            {{ $t('settings.updates.manualNote') }}
          </p>
        </div>

        <div class="flex gap-3">
          <!-- Auto-install button -->
          <button
            v-if="settings.updateAvailable && !settings.updateManual && !downloading"
            @click="installUpdate"
            class="flex-1 bg-[var(--status-green)] hover:opacity-90 text-white font-black py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
          >
            <i class="bi bi-download"></i> {{ $t('settings.updates.installNow') }}
          </button>
          <!-- Manual download button -->
          <a
            v-if="settings.updateAvailable && settings.updateManual && settings.updateUrl && !downloading"
            :href="settings.updateUrl"
            target="_blank"
            class="flex-1 bg-[var(--status-green)] hover:opacity-90 text-white font-black py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
          >
            <i class="bi bi-box-arrow-up-right"></i> {{ $t('settings.updates.download') }}
          </a>
          <button
            v-if="!downloading"
            @click="handleUpdateCheck"
            :disabled="checkingUpdate"
            class="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-[var(--text-main)] py-3 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <i class="bi bi-arrow-repeat" :class="{ 'animate-spin': checkingUpdate }"></i>
            {{ checkingUpdate ? $t('settings.updates.checking') : $t('settings.updates.checkForUpdates') }}
          </button>
        </div>

        <!--
          Zählung aktiver Installationen. Steht hier, weil sie auf derselben
          Abfrage mitfährt: die App fragt beim Start ohnehin nach der neuesten
          Version. Vorgabe ist aus — ohne ausdrückliches Einschalten wird
          nichts gesendet und nichts gespeichert.
        -->
        <div class="glass rounded-2xl p-5 mt-4">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-sm font-bold text-[var(--text-main)]">{{ $t('settings.stats.title') }}</p>
              <p class="text-xs text-[var(--text-muted)] opacity-60 mt-1 leading-relaxed">
                {{ $t('settings.stats.hint') }}
              </p>
            </div>
            <button
              @click="toggleStats"
              class="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 mt-0.5"
              :class="settings.statsEnabled ? 'bg-[var(--status-green)]' : 'bg-white/5 border border-white/10'"
              :aria-pressed="settings.statsEnabled"
              :aria-label="$t('settings.stats.title')"
            >
              <div class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                :class="settings.statsEnabled ? 'translate-x-6' : 'translate-x-0'" />
            </button>
          </div>

          <p v-if="settings.statsEnabled" class="text-[10px] text-[var(--text-muted)] opacity-40 mt-3 font-mono break-all">
            {{ settings.statsInstallId }}
          </p>
        </div>
      </template>

      <!-- ── Backup ── -->
      <!-- ── Duplikate ── -->
      <template v-if="active === 'duplicates'">
        <SectionHeader icon="files" :title="$t('settings.duplicates.title')" />

        <div class="glass rounded-2xl p-5 mb-4">
          <p class="text-xs text-[var(--text-muted)] opacity-60 mb-4">
            {{ $t('settings.duplicates.hint') }}
          </p>
          <button
            @click="scanDuplicates"
            :disabled="duplicatesLoading"
            class="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--text-main)] font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <i class="bi" :class="duplicatesLoading ? 'bi-arrow-repeat animate-spin' : 'bi-search'"></i>
            {{ duplicatesLoading ? $t('common.loading') : $t('settings.duplicates.scan') }}
          </button>
        </div>

        <p v-if="duplicatesScanned && duplicateGroups.length === 0"
          class="glass rounded-2xl p-5 text-sm text-[var(--status-green)] font-bold flex items-center gap-2">
          <i class="bi bi-check-circle-fill"></i>{{ $t('settings.duplicates.none') }}
        </p>

        <div v-for="gruppe in duplicateGroups" :key="gruppe.reason + gruppe.label" class="glass rounded-2xl p-5 mb-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <p class="text-sm font-bold text-[var(--text-main)] truncate">{{ gruppe.label }}</p>
            <span
              class="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex-shrink-0"
              :class="gruppe.reason === 'tmdb'
                ? 'bg-red-600/15 text-red-400 border border-red-500/25'
                : 'bg-white/5 text-[var(--text-muted)] border border-white/10'"
            >
              {{ gruppe.reason === 'tmdb' ? $t('settings.duplicates.byTmdb') : $t('settings.duplicates.byTitle') }}
            </span>
          </div>

          <div v-for="film in gruppe.movies" :key="film.id"
            class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
            <router-link :to="`/movies/${film.id}`" class="flex-1 min-w-0 group">
              <p class="text-xs font-bold text-[var(--text-main)] truncate group-hover:text-red-400 transition-colors">
                {{ film.title }}
              </p>
              <p class="text-[10px] text-[var(--text-muted)] opacity-60">
                {{ [film.year, film.collection_type, film.tag].filter(Boolean).join(' · ') }}
              </p>
            </router-link>
            <button
              @click="removeDuplicate(film.id)"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-red-600 transition-colors flex-shrink-0"
              :title="$t('common.delete')"
            >
              <i class="bi bi-trash3-fill text-xs"></i>
            </button>
          </div>
        </div>
      </template>

      <template v-if="active === 'backup'">
        <SectionHeader icon="archive" :title="$t('settings.backup.title')" />

        <!-- Backup erstellen -->
        <div class="glass rounded-2xl p-5 mb-4">
          <p class="text-sm font-bold text-[var(--text-main)] mb-1">{{ $t('settings.backup.createTitle') }}</p>
          <p class="text-xs text-[var(--text-muted)] opacity-60 mb-4">
            {{ $t('settings.backup.createHint') }}
          </p>
          <div v-if="backupResult" class="mb-3 text-xs font-bold"
            :class="backupResult.success ? 'text-[var(--status-green)]' : 'text-[var(--status-red)]'">
            {{ backupResult.success
              ? $t('settings.backup.createdResult', { count: backupResult.movies })
              : `✗ ${backupResult.error}` }}
          </div>
          <button
            @click="createBackup"
            :disabled="backupLoading"
            class="w-full bg-[var(--bg-elevated)] hover:bg-[var(--border-ui)] border border-[var(--border-ui)] text-[var(--text-main)] font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <i class="bi bi-cloud-download" :class="{ 'animate-pulse': backupLoading }"></i>
            {{ backupLoading ? $t('settings.backup.creating') : $t('settings.backup.saveBackup') }}
          </button>
        </div>

        <!-- Backup wiederherstellen -->
        <div class="glass rounded-2xl p-5 mb-4">
          <p class="text-sm font-bold text-[var(--text-main)] mb-1">{{ $t('settings.backup.restoreTitle') }}</p>
          <p class="text-xs text-[var(--text-muted)] opacity-60 mb-4">
            {{ $t('settings.backup.restoreHint') }}
          </p>
          <div v-if="restoreResult" class="mb-3 text-xs font-bold"
            :class="restoreResult.success ? 'text-[var(--status-green)]' : 'text-[var(--status-red)]'">
            {{ restoreResult.success
              ? $t('settings.backup.restoredResult', { movies: restoreResult.movies, actors: restoreResult.actors })
              : `✗ ${restoreResult.error}` }}
          </div>
          <button
            @click="restoreBackup"
            :disabled="restoreLoading"
            class="w-full bg-transparent hover:bg-[var(--status-red)]/5 border border-[var(--status-red)]/30 text-[var(--status-red)] font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <i class="bi bi-arrow-counterclockwise" :class="{ 'animate-spin': restoreLoading }"></i>
            {{ restoreLoading ? $t('settings.backup.restoring') : $t('settings.backup.restoreBackup') }}
          </button>
        </div>

        <!-- CSV / Letterboxd Import -->
        <div class="glass rounded-2xl p-5">
          <p class="text-sm font-bold text-[var(--text-main)] mb-1">{{ $t('settings.backup.csvTitle') }}</p>
          <p class="text-xs text-[var(--text-muted)] opacity-60 mb-4">
            {{ $t('settings.backup.csvHint') }}
          </p>
          <div v-if="importResult" class="mb-3 text-xs font-bold"
            :class="importResult.error ? 'text-[var(--status-red)]' : 'text-[var(--status-green)]'">
            {{ importResult.error
              ? `✗ ${importResult.error}`
              : $t('settings.backup.csvResult', { imported: importResult.imported, skipped: importResult.skipped }) }}
          </div>
          <button
            data-testid="csv-import-button"
            @click="importCsv"
            :disabled="importLoading"
            class="w-full bg-[var(--bg-elevated)] hover:bg-[var(--border-ui)] border border-[var(--border-ui)] text-[var(--text-main)] font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <i class="bi bi-file-earmark-spreadsheet" :class="{ 'animate-pulse': importLoading }"></i>
            {{ importLoading ? $t('settings.backup.importing') : $t('settings.backup.chooseCsv') }}
          </button>
        </div>
      </template>

      <!-- ── Info ── -->
      <template v-if="active === 'about'">
        <SectionHeader icon="info-circle" :title="$t('settings.about.title')" />

        <!-- App -->
        <div class="glass rounded-2xl p-5 mb-4 flex items-center gap-4">
          <img src="/icon.png" alt="" class="w-14 h-14 rounded-xl" />
          <div>
            <p class="text-lg font-black text-[var(--text-main)]">MovieShelf Desktop</p>
            <p class="text-xs text-[var(--text-muted)] opacity-70">v{{ settings.appVersion }} · {{ $t('settings.about.license') }}</p>
            <p class="text-xs text-[var(--text-muted)] opacity-70 mt-0.5">{{ $t('settings.about.author') }}</p>
          </div>
        </div>

        <!-- Technik -->
        <div class="glass rounded-2xl p-5 mb-4">
          <p class="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60 mb-3">
            {{ $t('settings.about.technical') }}
          </p>
          <dl class="grid grid-cols-2 gap-y-2 text-xs">
            <template v-for="row in infoRows" :key="row.label">
              <dt class="text-[var(--text-muted)] opacity-70">{{ row.label }}</dt>
              <dd class="text-[var(--text-main)] font-mono">{{ row.value }}</dd>
            </template>
          </dl>
        </div>

        <!-- Speicherort -->
        <div class="glass rounded-2xl p-5 mb-4">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-sm font-bold text-[var(--text-main)]">{{ $t('settings.about.dataTitle') }}</p>
              <p class="text-xs text-[var(--text-muted)] opacity-60 mt-0.5 font-mono break-all">{{ appInfo?.dataPath }}</p>
            </div>
            <button
              @click="openDataFolder"
              class="flex-shrink-0 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-ui)] rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5"
            >
              <i class="bi bi-folder2-open"></i> {{ $t('settings.about.openFolder') }}
            </button>
          </div>
        </div>

        <!-- Links -->
        <div class="glass rounded-2xl p-5 mb-4 space-y-2">
          <a v-for="link in aboutLinks" :key="link.url" :href="link.url" target="_blank"
            class="flex items-center gap-3 text-sm text-[var(--text-main)] hover:text-[var(--status-red)] transition-colors">
            <i :class="`bi bi-${link.icon} text-[var(--text-muted)]`"></i>
            <span class="font-medium">{{ $t(link.labelKey) }}</span>
            <i class="bi bi-box-arrow-up-right text-[10px] text-[var(--text-muted)] opacity-50 ml-auto"></i>
          </a>
        </div>

        <!-- Unterstützen -->
        <div class="glass rounded-2xl p-5 mb-4">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--status-yellow-bg)] flex items-center justify-center">
              <i class="bi bi-cup-hot text-lg text-[var(--status-yellow)]"></i>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-bold text-[var(--text-main)]">{{ $t('settings.about.donateTitle') }}</p>
              <p class="text-xs text-[var(--text-muted)] opacity-70 mt-0.5">{{ $t('settings.about.donateHint') }}</p>
            </div>
            <a
              href="https://buymeacoffee.com/adminzdr"
              target="_blank"
              class="flex-shrink-0 text-xs font-bold text-[var(--text-main)] hover:text-[var(--status-red)] border border-[var(--border-ui)] rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5"
            >
              {{ $t('settings.about.donateAction') }}
              <i class="bi bi-box-arrow-up-right text-[10px] opacity-50"></i>
            </a>
          </div>
        </div>

        <!-- Danksagung / Attribution -->
        <div class="glass rounded-2xl p-5">
          <p class="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60 mb-3">
            {{ $t('settings.about.creditsTitle') }}
          </p>
          <div class="mb-5">
            <a href="https://www.themoviedb.org" target="_blank" class="flex justify-center mb-3">
              <img src="/tmdb.svg" alt="TMDb" class="h-4 w-auto" />
            </a>
            <p class="text-xs text-[var(--text-main)] opacity-80">{{ $t('settings.about.tmdbCredit') }}</p>
          </div>
          <div>
            <a href="https://jellyfin.org" target="_blank" class="flex justify-center mb-3">
              <img src="/jellyfin.svg" alt="Jellyfin" class="h-7 w-7" />
            </a>
            <p class="text-xs text-[var(--text-main)] opacity-80">
              {{ $t('settings.about.jellyfinCredit') }}
              <span class="opacity-60">{{ $t('settings.about.jellyfinLogoLicense') }}</span>
            </p>
          </div>
        </div>
      </template>

      <!-- ── Entwickler ── -->
      <template v-if="active === 'dev'">
        <SectionHeader icon="bug" :title="$t('settings.dev.title')" />

        <!-- Protokolle -->
        <div class="glass rounded-2xl p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-sm font-bold text-[var(--text-main)]">{{ $t('settings.dev.logsTitle') }}</p>
              <p class="text-xs text-[var(--text-muted)] opacity-60 mt-0.5">{{ $t('settings.dev.logsHint') }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="refreshLogs"
                class="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-ui)] rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5"
              >
                <i class="bi bi-arrow-repeat" :class="{ 'animate-spin': logsLoading }"></i> {{ $t('settings.dev.refresh') }}
              </button>
              <button
                @click="openLogFolder"
                class="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-ui)] rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5"
              >
                <i class="bi bi-folder2-open"></i> {{ $t('settings.dev.folder') }}
              </button>
              <button
                @click="clearLogs"
                class="text-xs font-bold text-[var(--status-red)] hover:bg-[var(--status-red)]/10 border border-[var(--status-red)]/20 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5"
              >
                <i class="bi bi-trash3"></i> {{ $t('settings.dev.clear') }}
              </button>
            </div>
          </div>
          <pre
            class="bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] leading-relaxed text-[var(--text-main)] opacity-80 font-mono overflow-auto max-h-80 whitespace-pre-wrap break-all"
          >{{ logs || $t('settings.dev.noEntries') }}</pre>
        </div>

        <div class="bg-[var(--status-red-bg)] border border-[var(--status-red)]/20 rounded-2xl p-5">
          <p class="text-xs text-[var(--status-red)] opacity-60 font-bold uppercase tracking-widest mb-4">{{ $t('settings.dev.destructive') }}</p>
          <button
            @click="clearDatabase"
            class="w-full bg-transparent hover:bg-[var(--status-red)]/10 border border-[var(--status-red)]/20 text-[var(--status-red)] font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            <i class="bi bi-trash3"></i> {{ $t('settings.dev.clearDb') }}
          </button>
        </div>
      </template>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, defineComponent, h } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'
import { useApi } from '@/composables/useApi'
import { useUpdateService } from '@/services/updateService'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher.vue'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue'
import JellyfinPanel from '@/components/settings/JellyfinPanel.vue'

const { t, locale } = useI18n()

// ── Inline sub-components ────────────────────────────────────────────────────

const SectionHeader = defineComponent({
  props: { icon: String, title: String },
  setup(props) {
    return () => h('div', { class: 'mb-6' }, [
      h('div', { class: 'flex items-center gap-3 mb-1' }, [
        h('i', { class: `bi bi-${props.icon} text-[var(--status-red)] text-lg` }),
        h('h1', { class: 'text-xl font-black text-[var(--text-main)] uppercase tracking-tight' }, props.title),
      ]),
      h('div', { class: 'h-px bg-[var(--border-ui)] mt-4' }),
    ])
  }
})

const SettingsRow = defineComponent({
  props: { label: String, hint: String },
  setup(props: { label?: string; hint?: string }, { slots }: { slots: Record<string, (() => unknown) | undefined> }) {
    return () => h('div', { class: 'flex items-center justify-between py-4 border-b border-[var(--border-ui)]' }, [
      h('div', [
        h('p', { class: 'text-sm font-bold text-[var(--text-main)]' }, props.label),
        props.hint ? h('p', { class: 'text-xs text-[var(--text-muted)] opacity-60 mt-0.5' }, props.hint) : null,
      ]),
      h('div', (slots as any).default?.()),
    ])
  }
})

const SettingsInput = defineComponent({
  props: { label: String, type: String, modelValue: String, placeholder: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', [
      h('label', { class: 'text-xs text-[var(--text-muted)] opacity-40 font-bold uppercase tracking-widest block mb-1' }, props.label),
      h('input', {
        type: props.type ?? 'text',
        value: props.modelValue,
        placeholder: props.placeholder,
        class: 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--status-red)]/50 transition-colors',
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
      }),
    ])
  }
})

const ModeButton = defineComponent({
  props: { active: Boolean, icon: String, label: String },
  emits: ['click'],
  setup(props, { emit }) {
    return () => h('button', {
      onClick: () => emit('click'),
      class: [
        'flex-1 py-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2',
        props.active
          ? 'bg-[var(--status-red)] border-[var(--status-red)] text-white shadow-lg shadow-red-600/20'
          : 'bg-[var(--bg-app)] border-[var(--border-ui)] text-[var(--text-muted)] hover:text-[var(--text-main)]',
      ].join(' '),
    }, [
      h('i', { class: `bi bi-${props.icon}` }),
      props.label,
    ])
  }
})

const SaveButton = defineComponent({
  props: { class: String },
  emits: ['click'],
  setup(props, { emit }) {
    return () => h('button', {
      onClick: () => emit('click'),
      class: `w-full bg-[var(--status-red)] hover:opacity-90 text-white font-black py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/10 ${props.class ?? ''}`,
    }, [
      h('i', { class: 'bi bi-floppy' }),
      t('settings.saveSettings'),
    ])
  }
})

// ── State ────────────────────────────────────────────────────────────────────

const route    = useRoute()
const settings = useSettingsStore()
const { login, apiGet } = useApi()
const { checkForUpdates } = useUpdateService()

const isDev            = ref(false)
const active           = ref('general')
const autostart        = ref(false)
const logs             = ref('')
const logsLoading      = ref(false)

const loginEmail       = ref('')
const loginPassword    = ref('')
const loginLoading     = ref(false)
const loginError       = ref('')
const loginSuccess     = ref(false)

const oauthLoading     = ref(false)
const oauthState       = ref('')

/**
 * Das Konto, mit dem der Desktop bei der Shelf angemeldet ist.
 *
 * Ohne diese Anzeige lässt sich nicht erkennen, unter welchem Konto der
 * Abgleich schreibt. Fällt das auseinander, kommen Bewertungen und
 * Gesehen-Stand zwar an, tauchen in der Shelf aber nicht auf, weil dort nach
 * dem angemeldeten Nutzer gefiltert wird — ein Fehlerbild, das von aussen wie
 * "wird nicht übertragen" aussieht.
 */
const account        = ref<{ id?: number, name?: string, email?: string } | null>(null)
const accountLoading = ref(false)
const accountError   = ref('')

async function loadAccount() {
  account.value      = null
  accountError.value = ''
  if (settings.mode !== 'online' || !settings.shelfUrl || !settings.token) return

  accountLoading.value = true
  try {
    account.value = await apiGet('/user') as { id?: number, name?: string, email?: string }
  } catch (e: unknown) {
    const err = e as { response?: { status?: number, data?: { message?: string } }, message?: string }
    accountError.value = err?.response?.status === 401
      ? t('settings.connection.accountExpired')
      : (err?.response?.data?.message ?? err?.message ?? t('settings.connection.accountFailed'))
  } finally {
    accountLoading.value = false
  }
}

const checkingUpdate   = ref(false)
const downloading      = ref(false)
const downloadProgress = ref(0)
const updateError      = ref('')

const changelogLines = computed(() => {
  if (!settings.updateChangelog) return []
  return settings.updateChangelog.split('\n')
    .filter(l => l.trim())
    .map(l => {
      if (/^###\s+/.test(l)) return { type: 'heading', text: l.replace(/^###\s+/, '') }
      if (/^-\s+/.test(l))   return { type: 'item',    text: l.replace(/^-\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1') }
      return null
    })
    .filter(Boolean) as { type: string; text: string }[]
})

const backupLoading    = ref(false)
const duplicateGroups   = ref<{ reason: 'tmdb' | 'title'; label: string; movies: any[] }[]>([])
const duplicatesLoading = ref(false)
const duplicatesScanned = ref(false)

async function scanDuplicates() {
  duplicatesLoading.value = true
  try {
    duplicateGroups.value = await window.electron.db.movies.duplicates()
    duplicatesScanned.value = true
  } finally {
    duplicatesLoading.value = false
  }
}

// Nach dem Löschen neu suchen statt die Zeile nur auszublenden: fällt eine
// Gruppe damit auf einen Eintrag, ist sie keine Dublette mehr und verschwindet.
async function removeDuplicate(id: number) {
  await window.electron.db.movies.delete(id)
  await scanDuplicates()
}

const backupResult     = ref<{ success: boolean; movies?: number; error?: string } | null>(null)
const restoreLoading   = ref(false)
const restoreResult    = ref<{ success: boolean; movies?: number; actors?: number; error?: string } | null>(null)
const importLoading    = ref(false)
const importResult     = ref<{ imported: number; skipped: number; error?: string } | null>(null)

const sections = [
  { id: 'general',    icon: 'gear',          labelKey: 'settings.sections.general'    },
  { id: 'backup',     icon: 'archive',       labelKey: 'settings.sections.backup'     },
  { id: 'duplicates', icon: 'files',         labelKey: 'settings.sections.duplicates' },
  { id: 'dev',        icon: 'bug',           labelKey: 'settings.sections.dev',  dev: true },
  { id: 'tmdb',       icon: 'film',          labelKey: 'settings.sections.tmdb'       },
  { id: 'jellyfin',   icon: 'hdd-network',   labelKey: 'settings.sections.jellyfin'   },
  { id: 'updates',    icon: 'arrow-repeat',  labelKey: 'settings.sections.updates'    },
  { id: 'connection', icon: 'cloud',         labelKey: 'settings.sections.connection' },
  { id: 'about',      icon: 'info-circle',   labelKey: 'settings.sections.about'      },
]

// ── Info-Seite ───────────────────────────────────────────────────────────────

const appInfo = ref<AppInfo | null>(null)

const infoRows = computed(() => {
  const i = appInfo.value
  if (!i) return []
  return [
    { label: t('settings.about.version'), value: `v${i.version}` },
    { label: 'Electron',                  value: i.electron },
    { label: 'Chromium',                  value: i.chrome },
    { label: 'Node.js',                   value: i.node },
    { label: 'V8',                        value: i.v8 },
    { label: t('settings.about.system'),  value: `${i.platform} ${i.arch}` },
  ]
})

const aboutLinks = [
  { url: 'https://movieshelf.info',                                          icon: 'globe',    labelKey: 'settings.about.website' },
  { url: 'https://github.com/lunasans/movieshelf-desktop',                   icon: 'github',   labelKey: 'settings.about.sourceCode' },
  { url: 'https://github.com/lunasans/movieshelf-desktop/releases',          icon: 'tag',      labelKey: 'settings.about.releases' },
  { url: 'https://github.com/lunasans/movieshelf-desktop/issues/new',        icon: 'bug',      labelKey: 'settings.about.reportIssue' },
]

function openDataFolder() {
  window.electron.openDataFolder()
}

// Alphabetisch nach dem übersetzten Namen — die Reihenfolge stimmt damit auch
// nach einem Sprachwechsel, weil t() reaktiv ist.
const visibleSections = computed(() =>
  sections
    .filter(s => !s.dev || isDev.value)
    .slice()
    .sort((a, b) => t(a.labelKey).localeCompare(t(b.labelKey), locale.value))
)

watch(active, (id) => {
  if (id === 'dev') refreshLogs()
})

// Direkt auf einen Bereich springen (?section=updates aus dem Tray-Menü).
// Als watch mit immediate, weil ein erneuter Aufruf nur die Query ändert und
// die Komponente dabei nicht neu gemountet wird.
watch(() => route.query.section, (section) => {
  if (typeof section !== 'string') return
  // 'appearance' gibt es nicht mehr, Theme/Sprache stehen jetzt unter 'general'.
  const id = section === 'appearance' ? 'general' : section
  if (sections.some(s => s.id === id)) {
    active.value = id
  }
}, { immediate: true })

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  isDev.value = await window.electron.getIsDev()
  autostart.value = await window.electron.getAutostart()
  appInfo.value = await window.electron.getInfo()
  await settings.load()
  loadAccount()

  window.electron.update.onProgress((percent: number) => {
    downloadProgress.value = percent
  })
  // Fehler aus dem Updater-Prozess (z. B. fehlgeschlagene Signaturprüfung nach
  // dem Download, oder quitAndInstall) sichtbar machen statt sie zu verschlucken.
  window.electron.update.onError((message: string) => {
    updateError.value = message || t('settings.updates.updateFailed')
    downloading.value = false
  })

  handleUpdateCheck()
})

// ── Functions ────────────────────────────────────────────────────────────────

async function handleUpdateCheck() {
  checkingUpdate.value = true
  try { await checkForUpdates() } finally { checkingUpdate.value = false }
}

/**
 * Zählung umschalten — beim Einschalten gleich einmal melden.
 *
 * Die Kennung fährt auf der Versionsabfrage mit, und die läuft nur beim
 * App-Start, beim Oeffnen dieser Seite und auf Knopfdruck. Wer den Schalter
 * umlegt, hat all das gerade hinter sich: es passierte also sichtbar nichts,
 * und die Installation tauchte erst beim nächsten Start auf. Das sah aus, als
 * würde der Schalter nicht wirken.
 *
 * Nur beim Einschalten. Ein Ausschalten braucht keine Meldung — der vorhandene
 * Eintrag verfällt auf dem Server von selbst.
 */
async function toggleStats() {
  const einschalten = !settings.statsEnabled
  await settings.setStatsEnabled(einschalten)
  if (einschalten) await handleUpdateCheck()
}

async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32)
  window.crypto.getRandomValues(array)
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const data    = new TextEncoder().encode(verifier)
  const hash    = await window.crypto.subtle.digest('SHA-256', data)
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  return { verifier, challenge }
}

async function doOAuthLogin() {
  if (!settings.shelfUrl) return
  const baseUrl = new URL(settings.shelfUrl).origin
  loginError.value   = ''
  loginSuccess.value = false
  oauthLoading.value = true

  const state = crypto.randomUUID()
  oauthState.value = state

  const { verifier, challenge } = await generatePkce()

  const params = new URLSearchParams({
    response_type:          'code',
    client_id:              'filmdb-desktop',
    redirect_uri:           'movieshelf://oauth/callback',
    state,
    code_challenge:         challenge,
    code_challenge_method:  'S256',
  })

  window.electron.oauth.onCallback(async ({ code, state: returnedState }) => {
    oauthLoading.value = false
    if (returnedState !== oauthState.value) {
      loginError.value = t('settings.connection.oauthStateError')
      return
    }
    try {
      const res = await axios.post(`${baseUrl}/api/oauth/token`, {
        grant_type:    'authorization_code',
        code,
        redirect_uri:  'movieshelf://oauth/callback',
        client_id:     'filmdb-desktop',
        code_verifier: verifier,
      })
      settings.token = res.data.access_token
      await settings.save()
      loginSuccess.value = true
      await loadAccount()
    } catch {
      loginError.value = t('settings.connection.tokenExchangeFailed')
    }
  })

  await window.electron.oauth.openBrowser(
    `${baseUrl}/oauth/authorize?${params}`
  )
}

async function doLogin() {
  loginError.value   = ''
  loginSuccess.value = false
  loginLoading.value = true
  try {
    const token = await login(settings.shelfUrl, loginEmail.value, loginPassword.value)
    settings.token = token
    await settings.save()
    loginSuccess.value  = true
    loginPassword.value = ''
    await loadAccount()
  } catch (e: unknown) {
    loginError.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('settings.connection.loginFailed')
  } finally {
    loginLoading.value = false
  }
}

async function installUpdate() {
  downloading.value      = true
  downloadProgress.value = 0
  updateError.value      = ''
  try {
    await window.electron.update.download()
    window.electron.update.install()
  } catch (e: unknown) {
    updateError.value = String(e)
    downloading.value = false
  }
}

async function save() {
  await settings.save()
}

async function toggleAutostart() {
  autostart.value = await window.electron.setAutostart(!autostart.value)
}

async function refreshLogs() {
  logsLoading.value = true
  try { logs.value = await window.electron.logs.get() }
  finally { logsLoading.value = false }
}

async function clearLogs() {
  await window.electron.logs.clear()
  logs.value = ''
}

function openLogFolder() {
  window.electron.logs.openFolder()
}

async function clearDatabase() {
  if (confirm(t('settings.dev.clearDbConfirm'))) {
    await window.electron.db.movies.clear()
    alert(t('settings.dev.dbCleared'))
    window.location.reload()
  }
}

async function createBackup() {
  backupLoading.value = true
  backupResult.value  = null
  try {
    const result = await window.electron.backup.create()
    if (!result.canceled) backupResult.value = result
  } finally {
    backupLoading.value = false
  }
}

async function restoreBackup() {
  restoreLoading.value = true
  restoreResult.value  = null
  try {
    const result = await window.electron.backup.restore()
    if (!result.canceled) {
      restoreResult.value = result
      if (result.success) {
        setTimeout(() => window.location.reload(), 1500)
      }
    }
  } finally {
    restoreLoading.value = false
  }
}

async function importCsv() {
  importResult.value  = null
  importLoading.value = true
  try {
    const text = await pickCsvFile()
    if (!text) return

    const rows = parseCsv(text)
    importResult.value = await window.electron.db.movies.import(rows)
  } catch (e: unknown) {
    importResult.value = { imported: 0, skipped: 0, error: String(e) }
  } finally {
    importLoading.value = false
  }
}

function pickCsvFile(): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type   = 'file'
    input.accept = '.csv,text/csv'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsText(file, 'utf-8')
    }
    input.click()
  })
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return []

  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)

  const nameIdx    = idx('name')    !== -1 ? idx('name')    : idx('title')
  const yearIdx    = idx('year')
  const ratingIdx  = idx('rating')
  const tagsIdx    = idx('tags')
  const watchedIdx = idx('watched date')

  return lines.slice(1).flatMap(line => {
    // simple CSV split (no quoted-comma support — good enough for Letterboxd)
    const cols = line.split(',')
    const title = cols[nameIdx]?.trim()
    if (!title) return []

    const year       = parseInt(cols[yearIdx]?.trim() ?? '') || undefined
    const rawRating  = parseFloat(cols[ratingIdx]?.trim() ?? '')
    // Letterboxd: 0.5–5.0 scale → multiply × 2 for 1–10
    const rating     = isNaN(rawRating) ? undefined : Math.round(rawRating * 2 * 10) / 10
    const tag        = cols[tagsIdx]?.trim() || undefined
    const is_watched = !!(cols[watchedIdx]?.trim())

    return [{ title, year, rating, tag, is_watched }]
  })
}
</script>
