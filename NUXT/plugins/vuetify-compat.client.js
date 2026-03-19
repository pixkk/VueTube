export default defineNuxtPlugin({
  name: "vuetify-v2-compat",
  order: 50,
  setup(nuxtApp) {
    const vuetify = nuxtApp.vueApp.config.globalProperties.$vuetify;
    if (!vuetify?.theme) return;

    const realTheme = toRaw(vuetify.theme);

    function createCurrentThemeProxy() {
      return new Proxy(
        {},
        {
          get(_, prop) {
            if (prop === Symbol.toPrimitive || prop === "toJSON")
              return undefined;
            const colors = realTheme.current?.value?.colors ?? realTheme.current?.colors;
            return colors?.[prop];
          },
          set(_, prop, value) {
            const name = realTheme.global?.name?.value ?? realTheme.name;
            const themes = realTheme.themes?.value ?? realTheme.themes;
            if (themes?.[name]?.colors) {
              themes[name].colors[prop] = value;
            }
            return true;
          },
        }
      );
    }

    function createThemesProxy() {
      return new Proxy(
        {},
        {
          get(_, themeName) {
            if (typeof themeName !== "string") return undefined;
            const themes = realTheme.themes?.value ?? realTheme.themes;
            const themeDef = themes?.[themeName];
            if (!themeDef) return undefined;
            return new Proxy(themeDef, {
              get(target, prop) {
                if (prop === "colors") return target.colors;
                if (target.colors && prop in target.colors) {
                  return target.colors[prop];
                }
                return target[prop];
              },
              set(target, prop, value) {
                if (prop in (target.colors || {})) {
                  target.colors[prop] = value;
                } else {
                  target[prop] = value;
                }
                return true;
              },
            });
          },
        }
      );
    }

    nuxtApp.vueApp.mixin({
      computed: {
        $vuetify() {
          const self = this;
          const orig =
            nuxtApp.vueApp.config.globalProperties.$vuetify;
          return new Proxy(orig, {
            get(target, prop) {
              if (prop === "theme") {
                return new Proxy(realTheme, {
                  get(themeTarget, themeProp) {
                    if (themeProp === "dark") {
                      const cur =
                        realTheme.global?.current?.value ??
                        realTheme.current?.value ??
                        realTheme.current;
                      return cur?.dark ?? false;
                    }
                    if (themeProp === "currentTheme") {
                      return createCurrentThemeProxy();
                    }
                    if (themeProp === "themes") {
                      return createThemesProxy();
                    }
                    return Reflect.get(themeTarget, themeProp);
                  },
                  set(themeTarget, themeProp, value) {
                    if (themeProp === "dark") {
                      const nameRef =
                        realTheme.global?.name ?? realTheme.name;
                      if (nameRef && typeof nameRef === "object" && "value" in nameRef) {
                        nameRef.value = value ? "dark" : "light";
                      } else {
                        realTheme.name = value ? "dark" : "light";
                      }
                      return true;
                    }
                    return Reflect.set(themeTarget, themeProp, value);
                  },
                });
              }
              return Reflect.get(target, prop);
            },
          });
        },
      },
    });
  },
});
