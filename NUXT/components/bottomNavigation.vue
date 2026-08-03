<template>
  <div
    v-if="!$route.path.includes('/mods') || $route.path.includes('/tweaks')"
    class="bottomNav background"
    ref="navRoot"
  >
    <v-divider v-if="!$store.state.tweaks.roundTweak"/>
    <v-bottom-navigation
      :model-value="activeIndex"
      style="
        box-shadow: none !important;
        padding: 0 !important;
        position: relative;
        height: 100%;
      "
      class="transparent nav"
      :shift="$store.state.tweaks.navigationShift"

    >
      <v-btn
        elevation="0"
        v-for="(item, i) in tabs"
        :key="i"
        v-ripple="false"
        active-class="link-active"
        class="navButton link"
        :to="item.link"
        :value="i"
        variant="plain"
      >
        <!--        <div-->
        <!--          v-if="$store.state.tweaks.navigationIcons !== 0"-->
        <!--          class="px-3"-->
        <!--          style="padding: 6px 18px 6px 18px"-->
        <!--          :style="{-->
        <!--            color:-->
        <!--              tabSelection == i-->
        <!--                ? 'var(&#45;&#45;v-primary-base)'-->
        <!--                : theme.global.current.value.dark-->
        <!--                ? 'var(&#45;&#45;v-background-lighten4)'-->
        <!--                : 'var(&#45;&#45;v-background-darken4)',-->
        <!--          }"-->
        <!--          :class="-->
        <!--            tabSelection == i && $store.state.tweaks.navigationShift-->
        <!--              ? theme.global.current.value.dark-->
        <!--                ? 'tab primary text&#45;&#45;darken-4 '-->
        <!--                : 'tab primary text&#45;&#45;lighten-4 '-->
        <!--              : ''-->
        <!--          "-->
        <!--        >-->
        <!--          <svg-->
        <!--            v-if="$store.state.tweaks.navigationIcons === 1"-->
        <!--            xmlns="http://www.w3.org/2000/svg"-->
        <!--            fill="currentColor"-->
        <!--            viewBox="0 0 50 50"-->
        <!--            height="1.5rem"-->
        <!--            width="1.5rem"-->
        <!--            class="mt-1"-->
        <!--          >-->
        <!--            <use :href="`/${item.svg}.svg#main`" />-->
        <!--          </svg>-->
        <!--          <svg-->
        <!--            v-if="$store.state.tweaks.navigationIcons === 2"-->
        <!--            xmlns="http://www.w3.org/2000/svg"-->
        <!--            fill="currentColor"-->
        <!--            viewBox="0 0 21 21"-->
        <!--            height="1.5rem"-->
        <!--            width="1.5rem"-->
        <!--            class="mt-1"-->
        <!--          >-->
        <!--            <use :href="`/${item.svg2}.svg#main`" />-->
        <!--          </svg>-->
        <!--          <svg-->
        <!--            v-if="$store.state.tweaks.navigationIcons === 3"-->
        <!--            xmlns="http://www.w3.org/2000/svg"-->
        <!--            fill="currentColor"-->
        <!--            viewBox="0 0 33 33"-->
        <!--            height="1.5rem"-->
        <!--            width="1.5rem"-->
        <!--            class="mt-1"-->
        <!--          >-->
        <!--            <use :href="`/${item.svg3}.svg#main`" />-->
        <!--          </svg>-->
        <!--        </div>-->
        <v-icon
          v-if="$store.state.tweaks.navigationIcons === 0"
          :style="
          activeIndex == i && $store.state.tweaks.navigationShift
            ? {
                padding: '6px 18px',
                backgroundColor: 'rgb(var(--v-theme-primary))',
                borderRadius: '9999px',
                color: 'rgb(var(--v-theme-on-primary))'
              }
            : {
                padding: '6px 18px'
              }
          "
          class="my-1"
          :color="
            activeIndex == i
              ? 'primary'
              : 'on-background'
          "
          :icon="item.icon"
        />
        <span v-if="$store.state.tweaks.navigationText" v-text="item.name"/>
        <!-- + (activeIndex == i ? '' : '-outline') -->
      </v-btn>
      <div
        v-if="!$store.state.tweaks.navigationShift"
        :style="{
          top: $store.state.tweaks.navigationText ? '0.35rem' : '0.75rem',
        }"
        class="link-anime"
      ></div>
      <!-- <v-btn
      elevation="0"
        text
        class="navButton mr-2 fill-height"
        color="white"
        @click="searchBtn()"
        ><v-icon>mdi-magnify</v-icon></v-btn
      > -->
    </v-bottom-navigation>
  </div>
</template>

<script>
import {useTheme} from 'vuetify'

export default {
  setup() {
    const theme = useTheme()

    return {
      theme
    }
  },
  methods: {
    moveIndicator(index) {
      try {
        const buttons = this.$refs.navRoot.querySelectorAll('.navButton');
        const pill = this.$refs.navRoot.querySelector('.link-anime');
        if (!pill || !buttons[index]) return;

        const navRect = this.$refs.navRoot.querySelector('.nav').getBoundingClientRect();
        const btnRect = buttons[index].getBoundingClientRect();
        const pillWidth = pill.offsetWidth;

        const x = btnRect.left - navRect.left + btnRect.width / 2 - pillWidth / 2;
        pill.style.transform = `translateX(${x}px)`;
        pill.style.scale = '1';
      } catch (e) {

      }
    }
  },
  computed: {
    activeIndex() {
      return this.tabs.findIndex((item) => this.$route.path.startsWith(item.link));
    },
  },
  data() {
    return {
      tabs: [
        // TODO: pull from Vuex & localStorage for customizations
        {
          name: "",
          icon: "mdi-home",
          svg: "home",
          svg2: "fhome",
          svg3: "chome",
          link: "/home",
        },
        // { name: "Shorts", icon: "mdi-lightning-bolt", link: "/shorts" },
        // { name: "Upload", icon: "mdi-plus", link: "/upload" },
        {
          name: "",
          icon: "mdi-youtube-subscription",
          svg: "subs",
          svg2: "fsubs",
          svg3: "csubs",
          link: "/subscriptions",
        },
        {
          name: "",
          icon: "mdi-view-list",
          svg: "list",
          svg2: "flist",
          svg3: "clist",
          link: "/library",
        },
        // { name: "Settings", icon: "mdi-menu", link: "/settings" },
      ],
    };
  },

  mounted() {
    const lang = this.$lang("pages");
    this.tabs[0].name = lang.home;
    this.tabs[1].name = lang.subscriptions;
    this.tabs[2].name = lang.library;
    this.$nextTick(() => this.moveIndicator(this.activeIndex));

    this._resizeObserver = new ResizeObserver(() => {
      this.moveIndicator(this.activeIndex);
    });
    this._resizeObserver.observe(this.$refs.navRoot.querySelector('.nav'));
  },
  beforeUnmount() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  },
  watch: {
    activeIndex(i) {
      this.moveIndicator(i);
    }
  }
};
</script>

<style scoped>
.link-anime {
  left: 0;
  height: 2rem;
  width: 3.25rem;
  position: absolute;
  transition: transform 0.15s ease-in-out, scale 0.1s ease;
  background-color: var(--v-primary-base);
  padding: 0.1em 0.5em 0.1em 0.5em;
  border-radius: 2rem;
  opacity: 0.25;
  z-index: -1;
  scale: 0;
}

.bottomNav {
  /* box-shadow: inset 0 0 10rem var(--v-background-base) !important; */
  height: calc(4rem + env(safe-area-inset-bottom)) !important;
  padding-bottom: env(safe-area-inset-bottom) !important;
  box-shadow: none !important;
  position: fixed;
  z-index: 100;
  width: 100%;
  bottom: 0;
}

.navButton {
  width: 25vw !important;
  font-size: 0.66rem !important;
}

.tab {
  padding: 0.1em 0.5em 0.1em 0.5em;
  border-radius: 2rem;
}
</style>
