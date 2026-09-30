<template>
  <div class="mainContainer pt-1">
    <div class="pa-4">
      <p class="mb-4">{{ lang.backupinfo }}</p>
      <v-btn
        block
        size="large"
        elevation="0"
        color="primary"
        prepend-icon="mdi-export"
        class="mb-3"
        :style="{ borderRadius: `${roundTweak / 4}rem` }"
        @click="backupDialog = true"
      >
        {{ lang.backup }}
      </v-btn>
      <v-btn
        block
        size="large"
        elevation="0"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-import"
        :style="{ borderRadius: `${roundTweak / 4}rem` }"
        @click="openRestore"
      >
        {{ lang.restore }}
      </v-btn>
    </div>

    <input
      ref="restoreInput"
      type="file"
      accept=".json,application/json"
      style="display: none"
      @change="onRestoreFile"
    />

    <!-- Backup Dialog -->
    <v-dialog v-model="backupDialog" width="500">
      <v-card
        class="rounded-lg"
        :class="
          theme.global.current.value.dark ? 'background lighten-1' : 'background darken-1'
        "
      >
        <v-card-title class="text-h5">{{ lang.backup }}</v-card-title>
        <v-card-text>
          <v-checkbox
            v-model="backupIncludeHistory"
            :label="lang.backupincludehistory"
            density="compact"
            hide-details
          />
          <p class="text-caption">{{ lang.backupincludehistoryinfo }}</p>
          <p class="text-caption mt-3">{{ lang.backupwarning }}</p>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn elevation="0" color="primary" variant="text" @click="backupDialog = false">
            {{ lang.restorecancel }}
          </v-btn>
          <v-btn elevation="0" color="primary" variant="text" @click="createBackup">
            {{ lang.backup }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Restore Dialog -->
    <v-dialog v-model="restoreDialog" width="500">
      <v-card
        class="rounded-lg"
        :class="
          theme.global.current.value.dark ? 'background lighten-1' : 'background darken-1'
        "
      >
        <v-card-title class="text-h5">{{ lang.restoretitle }}</v-card-title>
        <v-card-text>
          <p class="mb-4">{{ lang.restoreconfirm }}</p>
          <v-btn
            block
            elevation="0"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-file-upload-outline"
            @click="$refs.restoreInput.click()"
          >
            {{ restoreFileName || lang.restorechoosefile }}
          </v-btn>
          <p v-if="pendingRestore" class="text-caption mt-3">
            {{ lang.restoredate }}:
            {{ pendingRestore.date ? new Date(pendingRestore.date).toLocaleString() : "-" }}
            <br />
            {{ lang.restoreversion }}: {{ pendingRestore.version || "-" }}
          </p>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn elevation="0" color="primary" variant="text" @click="restoreDialog = false">
            {{ lang.restorecancel }}
          </v-btn>
          <v-btn
            elevation="0"
            color="primary"
            variant="text"
            :disabled="!pendingRestore"
            @click="confirmRestore"
          >
            {{ lang.restoreproceed }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { useTheme } from "vuetify";
import { useRuntimeConfig } from "nuxt/app";
import { exportBackup, parseBackup, applyBackup } from "~/lib/settingsBackup";

export default {
  setup() {
    const theme = useTheme();

    return {
      theme,
    };
  },
  data() {
    return {
      lang: {},
      backupDialog: false,
      backupIncludeHistory: true,
      restoreDialog: false,
      restoreFileName: "",
      pendingRestore: null,
    };
  },
  computed: {
    roundTweak() {
      return this.$store.state.tweaks.roundTweak;
    },
  },
  mounted() {
    this.lang = this.$lang().mods.general;
  },
  methods: {
    async createBackup() {
      const config = useRuntimeConfig();
      try {
        await exportBackup({
          includeHistory: this.backupIncludeHistory,
          version: config.public.version,
          channel: config.public.channel,
        });
        this.backupDialog = false;
      } catch (e) {
        // Closing the share sheet rejects too, that is not an error
        if (!/cancel/i.test(String(e?.message || e))) {
          this.$youtube.showToast(this.lang.backupfailed);
        }
      }
    },

    openRestore() {
      this.pendingRestore = null;
      this.restoreFileName = "";
      this.restoreDialog = true;
    },

    async onRestoreFile(event) {
      const file = event.target.files[0];
      event.target.value = "";
      if (!file) return;
      try {
        this.pendingRestore = parseBackup(await file.text());
        this.restoreFileName = file.name;
      } catch (e) {
        this.pendingRestore = null;
        this.restoreFileName = "";
        this.$youtube.showToast(this.lang.restoreinvalid);
      }
    },

    confirmRestore() {
      try {
        applyBackup(this.pendingRestore);
      } catch (e) {
        this.restoreDialog = false;
        this.$youtube.showToast(this.lang.backupfailed);
        return;
      }
      window.location.replace("/");
    },
  },
};
</script>
