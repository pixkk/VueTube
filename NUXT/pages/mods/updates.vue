<template>
  <div style="padding: 2rem; padding-bottom: 4rem">
    <v-icon x-large color="primary" style="padding-bottom: 0.25rem">
      mdi-cellphone-arrow-down
    </v-icon>

    <div v-if="status == 'checking'">
      <h1>{{ lang.checking }}</h1>
      <div>
        {{ lang.installed }}:
        {{ installedVersion.substring(0, 7) || "Unknown" }}
        ({{ installedChannel }})
      </div>
      <center>
        <v-progress-circular
          indeterminate
          style="padding-top: 10em"
          color="primary"
          size="75"
        />
      </center>
    </div>

    <div v-if="status == 'latest'">
      <h1>{{ lang.noupdate }}</h1>
      <p>{{ lang.noupdatemessage }}</p>
      <div class="bottom">
        <v-btn rounded @click="getLatest">{{ lang.refresh }}</v-btn>
        <v-btn
          rounded
          depressed
          color="primary"
          class="background--text"
          @click="$router.go(-1)"
        >
          {{ lang.okay }}
        </v-btn>
      </div>
    </div>

    <div v-if="status == 'available'">
      <h1 v-if="!downloading">{{ lang.available }}</h1>
      <h1 v-if="downloading">{{ lang.updating }}</h1>
      <div>
        {{ lang.installed }}:
        {{ installedVersion.substring(0, 7) || "Unknown" }}
        {{ installedChannel.toLowerCase() === "unstable" ? "(unstable)" : "" }}
      </div>
      <div>{{ lang.latest }}: {{ latestVersion?.tag_name }}</div>

      <div
        style="margin-top: 1em"
        class="background--text"
        :class="$vuetify.theme.dark ? 'text--lighten-4' : 'text--darken-4'"
      >
        <div>
          {{ lang.published }}:
          {{ new Date(latestVersion?.assets[0].created_at).toLocaleString() }}
        </div>
        <div>
          {{ lang.size }}:
          {{
            require("~/plugins/utils").humanFileSize(
              latestVersion?.assets[0].size
            )
          }}
        </div>
        <div>
          {{ lang.users }}: {{ latestVersion?.assets[0].download_count }}
        </div>
      </div>

      <div
        style="margin-top: 1em"
        class="background--text"
        :class="$vuetify.theme.dark ? 'text--lighten-4' : 'text--darken-4'"
      >
        <b>Changelog</b>
      </div>
      <div class="background--text" :class="$vuetify.theme.dark ? 'text--lighten-4' : 'text--darken-4'" v-html="mkdwn.makeHtml(latestVersion?.body)?.replace(/\[![A-Za-z0-9]+\]/i, '')">
      </div>

      <v-progress-linear
        v-if="downloading"
        style="position: absolute; top: 0; width: 100%; left: 0"
        color="primary"
        indeterminate
      />

      <div v-if="!downloading" class="bottom">
        <v-btn
          rounded
          depressed
          :class="
            $vuetify.theme.dark ? 'background lighten-1' : 'background darken-1'
          "
          @click="navigateBack"
        >
          {{ lang.later }}
        </v-btn>
        <v-btn
          rounded
          depressed
          class="background--text ml-2"
          color="primary"
          @click="install()"
        >
          {{ lang.update }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script>
import { Device } from "@capacitor/device";
import showdown from "showdown";
import constants from "../../plugins/constants";

export default {
  layout: "empty",
  created() {
    window.openExternal = this.openExternal;
  },
  data() {
    return {
      installedVersion: process.env.version,
      installedChannel: process.env.channel,
      latestVersion: {
        assets: []
      },
      mkdwn: null,
      lang: {},
      status: "checking",
      update: {
        created_at: "",
      },
      downloading: false,
      unstableUrl: null
    };
  },
  computed: {
    showdown() {
      return showdown;
    },
  },
  async mounted() {
    //---   Setup Lang Pack   ---//
    this.lang = this.$lang("mods").updates;
    this.mkdwn = new showdown.Converter();
    this.mkdwn.setOption('tables', true);

    await this.getLatest();
  },

  methods: {
    openExternal(url) {
      this.$vuetube.openExternal(url);
    },
    navigateBack() {
      if (window.history.length > 2) {
        this.$router.go(-1);
      } else {
        this.$router.push('/');
      }
    },
    async getUpdate() {
      const device = await Device.getInfo();
      const platform = device.platform;

      //---   Put all strings into 1 array   ---//
      let downloads = new Array();
      for (const i in this.latestVersion?.assets) {
        const asset = this.latestVersion?.assets[i];
        downloads.push(asset.browser_download_url);
      }

      //---   Pick String For Platform From Above Array   ---//
      if (platform == "ios") {
        this.update = downloads.filter((m) => m.includes(".ipa"))[0];
      } else {
        this.update = downloads.filter((m) => m.includes(".apk"))[0];
      }

      //---   Set Update As Full Data   ---//
      for (const i in this.latestVersion?.assets) {
        const asset = this.latestVersion?.assets[i];
        if (asset.browser_download_url == this.update) {
          return (this.update = asset);
        }
      }
    },

    async getLatest() {
      const device = await Device.getInfo();
      const platform = device.platform;
      //---   Get Latest Version   ---//
      this.status = "checking";
      let currentVersion = localStorage.getItem("lastRunVersion");
      if (currentVersion === "canary" || currentVersion === "release" || /^\d+\.\d+\.\d+$/.test(currentVersion) ) {
        const releases = await this.$vuetube.checkForUpdates();
        this.latestVersion = releases[0];

        //---   Wait like 2 seconds because if people don't see loading, they think it didn't refresh properly   ---//
        if (!this.$route.query.nowait)
          await require("~/plugins/utils").delay(2000);

        //---   Get Proper File   ---//
        await this.getUpdate();

        //---   Kick Off Update Notice   ---//
        if (this.latestVersion?.tag_name !== this.installedVersion) {
          this.status = "available";
        } else {
          this.status = "latest";
        }
      }
      else {
      //   dev update
        const releases = await this.$vuetube.checkForUpdates(true);
        console.warn(releases);
        this.latestVersion.tag_name = releases.details.head_sha;

        let newUrl =
          "<a onclick=openExternal('https://github.com/pixkk/VueTube/commit/"+ releases.details.head_sha +"')>(Click here)</a>";
        this.latestVersion.body = releases.details.display_title + "\n\nFull changelog here ->" + newUrl;
        let urlWithZip = "";
        for (let i = 0; i < releases.artifacts.artifacts.length; i++) {
          let rel = releases.artifacts.artifacts[i];
          console.warn(rel)
          // if (platform == "ios") {
          //   if (rel.name === "VueTube") {
          //     urlWithZip = rel.archive_download_url;
          //   }
          // } else {
          //   if (rel.name === "app-release") {
          //     urlWithZip = rel.archive_download_url;
          //   }
          // }
          // this.unstableUrl = urlWithZip;
          this.unstableUrl = releases.details.html_url;

          this.latestVersion.assets = [
            {
              created_at: rel.created_at,
              download_count: "-",
              size: rel.size_in_bytes
            }
          ]
        }
        console.warn(this.latestVersion)
        if (this.latestVersion?.tag_name !== this.installedVersion) {
          this.status = "available";
        } else {
          this.status = "latest";
        }
      }
    },

    async install() {
      this.downloading = true;
      if (!this.unstableUrl) {
        await this.$update(this.latestVersion?.assets[0].url).catch(() => {
          this.downloading = false;
        });
      }
      else {
        openExternal(this.unstableUrl);
        this.downloading = false;
        // await this.$update(this.unstableUrl).catch(() => {
        //   this.downloading = false;
        // });
      }
      //window.open(this.update.browser_download_url, '_blank');
    },
  },
};
</script>

<style scoped>
.bottom {
  position: absolute;
  padding: 2em;
  bottom: 0;
  right: 0;
}
</style>
