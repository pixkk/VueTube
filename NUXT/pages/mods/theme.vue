<template>
  <client-only>
    <div class="container-max-height d-flex flex-column">
      <!-- ----Color Picker (global, for both)---- -->
      <v-dialog
        v-model="pickerState"
        width="300"
        content-class="background rounded-lg"
      >
        <v-color-picker
          v-model="$vuetify.theme.current[pickerMode]"
          :class="$vuetify.theme.current.dark ? 'lighten-1' : 'darken-1'"
          style="min-width: 100%"
          class="background"
          hide-mode-switch
          dot-size="50"
          mode="hexa"
          elevation="0"
        />
      </v-dialog>
      <!-- ----Primary Colors---- -->
      <v-radio-group
        v-model="$vuetify.theme.current.primary"
        style="max-height: 2rem"
      >
        <div
          class="px-6 d-flex flex-row no-wrap align-center"
          style="max-width: 100%; overflow-x: auto"
        >
          <v-radio
            v-for="color in $vuetify.theme.current.dark ? primaryDark : primaryLight"
            :key="color"
            color="background"
            on-icon="mdi-check"
            :light="$vuetify.theme.current.dark"
            :dark="!$vuetify.theme.current.dark"
            active-class="border-primary"
            style="transition-duration: 0.3s"
            :style="{
              background: color,
              border: '2px solid ' + color,
            }"
            class="mr-2 my-auto rounded-xl"
            :value="color"
          />
          <!-- Custom Primary -->
          <v-btn
      elevation="0"
            icon
            class="background"
            style="height: 1.75rem; width: 1.75rem"
            :class="$vuetify.theme.current.dark ? 'lighten-2' : 'darken-2'"
            @click="(pickerState = true), (pickerMode = 'primary')"
          >
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </div>
      </v-radio-group>
      <!-- ----Background Colors---- -->
      <v-radio-group v-model="$vuetify.theme.current.background">
        <div
          class="d-flex flex-row px-2 no-wrap"
          style="max-width: 100%; overflow-x: auto"
        >
          <div
            v-for="background in $vuetify.theme.current.dark
              ? backgroundsDark
              : backgroundsLight"
            :key="background.color"
            class="text-center"
            style="font-size: 0.75rem"
          >
            <v-radio
              color="primary"
              active-class="px-6 border-primary"
              style="transition-duration: 0.3s"
              :style="{
                background: background.color,
                border: '2px solid ' + background.color,
                borderRadius: `${$store.state.tweaks.roundTweak / 3}rem`,
              }"
              class="py-4 px-4 ma-2"
              :value="background.color"
            />
            {{ background.name }}
          </div>
          <div class="text-center" style="font-size: 0.75rem">
            <v-radio
              color="primary"
              active-class="px-6 border-primary primary"
              style="transition-duration: 0.3s"
              :style="{
                background: $vuetify.theme.current.dark
                  ? 'var(--v-primary-darken4) !important'
                  : 'var(--v-primary-lighten4) !important',
                border: $vuetify.theme.current.dark
                  ? '2px solid var(--v-primary-darken4)'
                  : '2px solid var(--v-primary-lighten4)',
                borderRadius: `${$store.state.tweaks.roundTweak / 3}rem`,
              }"
              class="pa-4 ma-2"
              :value="$vuetify.theme.current.dark ? adaptiveDark : adaptiveLight"
            />
            {{ lang.adaptive }}
          </div>
          <div class="text-center" style="font-size: 0.75rem">
            <!-- Custom Background -->
            <v-btn
      elevation="0"
              icon
              class="ma-2 background border-primary"
              style="height: 3.75rem; width: 3.75rem"
              :style="{
                borderRadius: `${$store.state.tweaks.roundTweak / 3}rem`,
              }"
              :class="$vuetify.theme.dark ? 'lighten-2' : 'darken-2'"
              @click="(pickerState = true), (pickerMode = 'background')"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
            <br />
            {{ lang.custom }}
          </div>
        </div>
      </v-radio-group>
      <!-- ----Mode Switch---- -->
      <v-divider v-if="!$store.state.tweaks.roundTweak" />
      <v-card
        variant="flat"
        class="d-flex flex-row mx-4 mb-4 pa-4 background"
        :class="
          $store.state.tweaks.roundTweak > 0
            ? $vuetify.theme.dark
              ? 'lighten-1'
              : 'darken-1'
            : ''
        "
        :style="{
          borderRadius: `${$store.state.tweaks.roundTweak / 3}rem`,
          padding: !$store.state.tweaks.roundTweak ? '2rem !important' : '',
          margin: !$store.state.tweaks.roundTweak ? '0 !important' : '',
        }"
        @click="
          ($vuetify.theme.dark = !$vuetify.theme.dark),
            $vuetube.haptics.hapticsImpactLight(1)
        "
      >
        <div class="my-auto">
          <div>{{ lang.darkmode }}</div>
          <div
            class="background--text"
            :class="$vuetify.theme.dark ? 'text--lighten-4' : 'text--darken-4'"
            style="font-size: 0.75rem; margin-top: -0.25rem !important"
          >
            {{ lang.darkmodetagline }}
          </div>
        </div>
        <v-spacer />
        <v-switch
          v-model="$vuetify.theme.dark"
          style="pointer-events: none"
          class="mt-2"
          inset
        />
      </v-card>
    </div>
  </client-only>
</template>

<script>
export default {
  data() {
    return {
      primaryLight: [
        "#6b0406",
        "#E57373",
        "#34495E",
        "#6e0ba3",
        "#016a49",
        "#8b5f37",
      ],
      primaryDark: [
        "#dc2626",
        "#FFBBFF",
        "#AAAFFF",
        "#AAFFFF",
        "#7CD6AF",
        "#FEC89B",
      ],
      backgroundsDark: [
        { name: this.$lang("mods").theme.dark, color: "#181818" },
        { name: "Warm", color: "#1c1917" },
        { name: this.$lang("mods").theme.black, color: "#000000" },
      ],
      backgroundsLight: [
        { name: this.$lang("mods").theme.normal, color: "#ffffff" },
        { name: "Cold", color: "#e2e8f0" },
        { name: "Warm", color: "#e7e5e4" },
      ],
      adaptiveLight: "",
      adaptiveDark: "",
      pickerState: false,
      pickerMode: "bg",
      lang: {},
    };
  },
  watch: {
    // also triggers background and primary watcher, unless primary colors match
    "$vuetify.theme.dark"(value) {
      localStorage.setItem("darkTheme", value);
    },
    "$vuetify.theme.current.background"(value) {
      this.$vuetify.theme.dark
        ? localStorage.setItem("backgroundDark", value)
        : localStorage.setItem("backgroundLight", value);
      document.documentElement.style.backgroundColor = value;
      this.$vuetube.statusBar.setTheme(value, this.$vuetify.theme.dark);
      this.$vuetube.navigationBar.setTheme(value, !this.$vuetify.theme.dark);
      // WIP: luma-based light-dark auto-switching
      // let bg = this.$vuetify.theme.current.background;
      // console.log(this.$vuetube.hexToRgb(bg));
      // let luma =
      //   0.2126 * this.$vuetube.hexToRgb(bg).r +
      //   0.7152 * this.$vuetube.hexToRgb(bg).g +
      //   0.0722 * this.$vuetube.hexToRgb(bg).b;
      // if (luma < 40) {
      //   this.$vuetify.theme.dark = true;
      //   this.vuetify.theme.current.background = bg;
      // }
    },
    "$vuetify.theme.current.primary"(value) {
      if (value != undefined) {
        this.$vuetify.theme.dark
          ? localStorage.setItem("primaryDark", value)
          : localStorage.setItem("primaryLight", value);
        let tempD = this.adaptiveDark;
        let tempL = this.adaptiveLight;
        this.adapt();
        if (this.$vuetify.theme.current.background === tempD)
          this.$vuetify.theme.current.background = this.adaptiveDark;
        if (this.$vuetify.theme.current.background === tempL)
          this.$vuetify.theme.current.background = this.adaptiveLight;
      }
    },
  },
  mounted() {
    this.lang = this.$lang("mods").theme;
    if (this.lang.cold) this.backgroundsLight[1].name = this.lang.cold;
    if (this.lang.warm) {
      this.backgroundsDark[1].name = this.lang.warm;
      this.backgroundsLight[2].name = this.lang.warm;
    }
  },
  beforeMount() {
    this.adapt();
  },
  methods: {
    adapt() {
      let hexD = getComputedStyle(document.documentElement).getPropertyValue(
        "--v-primary-darken4"
      );
      let hexL = getComputedStyle(document.documentElement).getPropertyValue(
        "--v-primary-lighten4"
      );
      // the menace above returns a hex string with A SPACE " " in front of it, that's why substring(1)
      // the SPACE " " is stored as part of the CSS variable itself to be used for chaining
      this.adaptiveDark = hexD.substring(1).toUpperCase();
      this.adaptiveLight = hexL.substring(1).toUpperCase();
      setTimeout(() => {
        if (
          this.$vuetify.theme.current.background ==
          hexD.substring(1).toUpperCase()
        )
          this.$vuetify.theme.current.background = this.adaptiveDark;
        if (
          this.$vuetify.theme.current.background ==
          hexL.substring(1).toUpperCase()
        )
          this.$vuetify.theme.current.background = this.adaptiveLight;
      }, 0);
    },
  },
};
</script>
