// https://nuxt.com/docs/api/nuxt-config
export default defineNuxtConfig({
  //---   VueTube Stuff   ---//
  runtimeConfig: {
    public: {
      channel: "Unstable",
      version: "dev-local",
    },
  },
  experimental: {
    payloadExtraction: 'client'
  },
  nitro: {
    preset: "static",
  },
  ssr: false,

  plugins: [
    { src: "~/plugins/00.buffer-polyfill.client" },
    { src: "~/plugins/vuetify-compat.client" },
    { src: "~/plugins/vuex-compat.client" },
    { src: "~/plugins/auth", mode: "client" },
    { src: "~/plugins/youtube", mode: "client" },
    { src: "~/plugins/vuetube", mode: "client" },
    { src: "~/plugins/ryd", mode: "client" },
    { src: "~/plugins/thirdPartyPluginLoader", mode: "client" },
    { src: "~/plugins/language", mode: "client" },
    { src: "~/plugins/update", mode: "client" },
    { src: "~/plugins/theme-init.client" },
  ],

  generate: {
    dir: "../dist",
  },

  //---   VueTube Debugging   ---//
  devServer: {
    port: 3000,
    host: "localhost",
  },

  //---   Default NUXT Stuff   ---//
  app: {
    head: {
      title: "VueTube",
      htmlAttrs: {
        lang: "en",
      },
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover",
        },
        { name: "format-detection", content: "telephone=no" },
      ],
    },
  },

  css: ["@mdi/font/css/materialdesignicons.css", "~/assets/styles.scss"],
  components: true,

  build: {
    transpile: ['vuetify']
  },
  modules: ["@pinia/nuxt", "vuetify-nuxt-module"],
  vuetify: {
    vuetifyOptions: {
      theme: {
        defaultTheme: "dark",
        themes: {
          light: {
            dark: false,
            colors: {
              primary: "#136458",
              background: "#ffffff",
            },
          },
          dark: {
            dark: true,
            colors: {
              primary: "#00d7cd",
              background: "#000000",
            },
          },
        },
      },
    },
  },

  vite: {
    resolve: {
      alias: {
        buffer: "buffer/",
      },
    },
    define: {
      "global": "globalThis",
    },
    optimizeDeps: {
      include: [
        "buffer",
        "@capacitor/toast",
        "@capacitor/status-bar",
        "@capgo/capacitor-navigation-bar",
        "@capacitor/haptics",
        "@capacitor/filesystem",
        "@capacitor/app",
        "@capacitor/core",
        "acorn",
        "astring",
        "acorn-walk",
        "showdown",
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ],
    },
  },


  compatibilityDate: "2025-01-01",
});
