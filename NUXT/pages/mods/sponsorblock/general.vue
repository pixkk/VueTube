<template>
  <div class="mainContainer pt-1">
    <!-- SponsorBlockSettings -->
    <v-divider v-if="!$store.state.tweaks.roundTweak" />

<!--    <v-card-title style="padding-bottom: 0 !important">SponsorBlock</v-card-title>-->
    <v-card
      flat
      class="d-flex flex-row mx-4 mb-4 pr-4 background"
      style="overflow: hidden; position: relative; padding-bottom: 0 !important"
      :class="
        $store.state.tweaks.roundTweak > 0
          ? $vuetify.theme.dark
            ? 'lighten-1'
            : 'darken-1'
          : ''
      "
      :style="{
        borderRadius: `${$store.state.tweaks.roundTweak / 2}rem`,
        padding: !$store.state.tweaks.roundTweak ? '1rem' : '',
        margin: !$store.state.tweaks.roundTweak ? '0 !important' : '',
      }"
      @click="
        (sponsorBlockIntegration = !sponsorBlockIntegration),
          $vuetube.haptics.hapticsImpactLight(1)
      "
    >
      <div
        v-if="roundTweak > 0"
        class="circle"
        :class="sponsorBlockIntegration ? '' : 'moved'"
        style="width: 11rem; height: 11rem"
      ></div>
      <div
        v-if="roundTweak > 0"
        class="circle"
        :class="sponsorBlockIntegration ? '' : 'moved'"
        style="width: 7rem; height: 7rem"
      ></div>
      <v-icon
        class="pr-8 pl-4 py-12"
        style="border-radius: 0rem !important; transition: all 0.2s ease"
        :style="{
          translate:
            sponsorBlockIntegration && $store.state.tweaks.roundTweak > 0
              ? '0 1.75rem'
              : '0 -1.5rem',
          scale: sponsorBlockIntegration ? '1.1' : '1',
          color: sponsorBlockIntegration ? 'var(--v-primary-base)' : '',
        }"
      >
        {{
          sponsorBlockIntegration
            ? "mdi-account-cancel"
            : "mdi-account-cancel"
        }}
      </v-icon>
      <div
        class="my-auto pa-4 ml-n4 background"
        :class="
          $store.state.tweaks.roundTweak > 0
            ? $vuetify.theme.dark
              ? 'lighten-1'
              : 'darken-1'
            : ''
        "
        style="position: relative"
        :style="{
          boxShadow:
            $store.state.tweaks.roundTweak > 0
              ? 'inset 1rem 0 1rem -1rem var(--v-background-base)'
              : '',
          borderRadius: `${$store.state.tweaks.roundTweak / 4}rem`,
        }"
      >
        <div class="mb-4">SponsorBlock integration</div>
        <div
          class="background--text"
          :class="$vuetify.theme.dark ? 'text--lighten-4' : 'text--darken-4'"
          style="font-size: 0.75rem; margin-top: -0.25rem !important"
        >
          Enable SponsorBlock integration.
        </div>
      </div>
      <v-switch
        v-model="sponsorBlockIntegration"
        class="mt-4"
        style="pointer-events: none"
        inset
      />
    </v-card>
  </div>
</template>

<script>
import language from "~/components/Settings/language.vue";
export default {
  components: {
    language,
  },
  data() {
    return {
      dialog: false,
      lang: {},
    };
  },
  computed: {
    sponsorBlockIntegration: {
      get() {
        return this.$store.state.sponsorBlockIntegration;
      },
      set(value) {
        this.$store.commit("setSponsorBlockIntegration", value);
      },
    },
    roundTweak() {
      return this.$store.state.tweaks.roundTweak;
    },
  },
  mounted() {
    const lang = this.$lang();
    this.lang = lang.mods.general;
  },
  methods: {
    methodsTest() {
      return "";
    },
  },
};
</script>

<style scoped>
.v-card {
  margin: 1em;
}

section {
  padding: 0 1em 1em 1em;
}
.circle {
  left: -2rem;
  bottom: -2rem;
  opacity: 0.25;
  position: absolute;
  border-radius: 50%;
  background: var(--v-primary-base);
  transition: all 0.25s ease;
}
.moved {
  bottom: -8rem;
  left: -16rem;
}
</style>
