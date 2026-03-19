<template>
  <div>
    <v-snackbar v-model="updateSnackbar" class="updateBar" :timeout="updateSnackbarTimeout" rounded>
      {{ updateSnackbarText }}

      <template #action="{ attrs }">
        <v-btn
          color="primary"
          text
          v-bind="attrs"
          to="/mods/updates?nowait=true"
          >Update</v-btn
        >
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.updateBar {
  z-index: 99999999;
}
</style>

<script>
import {useRuntimeConfig} from "nuxt/app";

export default {
  data() {
    return {
      updateSnackbar: false,
      updateSnackbarText: "An update is available",
      updateSnackbarTimeout: 5000,
    };
  },

  async mounted() {
    const config = useRuntimeConfig();
    const releases = await this.$vuetube.checkForUpdates();
    const appVersion = config.public.version;
    const appChannel = config.public.channel;
    if (appVersion !== releases[0]?.tag_name && appVersion !== "dev-local" && appChannel !== "Unstable") {
      this.updateSnackbar = true;
    }
  },
};
</script>
