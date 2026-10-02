<template>
  <div class="account-page pa-4">
    <!-- Signed-in accounts list -->
    <template v-if="accounts.length > 0">
      <v-list-subheader>Accounts</v-list-subheader>
      <v-list>
        <v-list-item
          v-for="account in accounts"
          :key="account.id"
          :active="account.id === activeAccountId"
          @click="switchAccount(account.id)"
        >
          <template #prepend>
            <v-avatar>
              <v-img v-if="account.avatar" :src="account.avatar" />
              <v-icon v-else size="40">mdi-account-circle</v-icon>
            </v-avatar>
          </template>
          <v-list-item-title>{{ account.name || account.email }}</v-list-item-title>
          <v-list-item-subtitle>{{ account.email }}</v-list-item-subtitle>
          <template #append>
            <v-icon v-if="account.id === activeAccountId" color="primary" class="mr-2">mdi-check-circle</v-icon>
            <v-btn elevation="0" icon variant="text" @click.stop="signOut(account.id)">
              <v-icon>mdi-logout</v-icon>
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
      <v-divider class="my-4" />
    </template>

    <!-- No credentials warning -->
    <v-alert v-if="!hasCredentials && !signingIn" type="warning" class="mb-4">
      YouTube client credentials are not yet loaded. Open the app home screen first to initialize the player, then return here.
    </v-alert>

    <!-- Add account button -->
    <v-btn
      elevation="0"
      v-if="!signingIn"
      block
      variant="outlined"
      color="primary"
      :disabled="!hasCredentials"
      @click="startSignIn"
    >
      <v-icon start>mdi-account-plus</v-icon>
      Add account
    </v-btn>

    <!-- Device code dialog -->
    <v-card v-if="signingIn && deviceCodeData" class="mt-4 pa-4 text-center">
      <v-card-title class="justify-center">Sign in to YouTube</v-card-title>
      <v-card-text>
        <p>On your phone or computer, go to:</p>
        <div class="verification-url font-weight-bold text-h6 my-2">
          {{ deviceCodeData.verification_url }}
        </div>
        <p>Enter this code:</p>
        <div class="user-code text-h4 font-weight-black letter-spacing my-3">
          {{ deviceCodeData.user_code }}
        </div>
        <v-progress-circular indeterminate color="primary" class="my-2" />
        <p class="text-caption mt-2">Waiting for authorization…</p>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn elevation="0" variant="text" @click="cancelSignIn">Cancel</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Loading state before device code arrives -->
    <v-card v-else-if="signingIn" class="mt-4 pa-4 text-center">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-2">Requesting code…</p>
    </v-card>

    <!-- Error -->
    <v-alert v-if="error" type="error" class="mt-4" closable v-model="errorOpen">
      {{ error }}
    </v-alert>

    <!-- Success -->
    <v-alert v-if="success" type="success" class="mt-4" closable v-model="successOpen">
      {{ success }}
    </v-alert>
  </div>
</template>

<script>
export default {
  name: "AccountPage",

  data() {
    return {
      signingIn: false,
      deviceCodeData: null,
      pollAborted: false,
      error: null,
      success: null,
      errorOpen: true,
      successOpen: true,
    };
  },

  mounted() {
    if (this.$store.getters["auth/isSignedIn"]) {
      this.$auth.refreshAccountInfo().catch(() => {});
    }
  },

  computed: {
    accounts() {
      return this.$store.state.auth.accounts;
    },
    activeAccountId() {
      return this.$store.state.auth.activeAccountId;
    },
    hasCredentials() {
      return this.$auth.hasCredentials();
    },
  },

  methods: {
    async startSignIn() {
      this.signingIn = true;
      this.deviceCodeData = null;
      this.pollAborted = false;
      this.error = null;

      try {
        await this.$auth.signIn((codeData) => {
          this.deviceCodeData = codeData;
        });
        this.success = "Signed in successfully!";
        this.successOpen = true;
      } catch (e) {
        if (!this.pollAborted) {
          this.error =
            e.message === "access_denied"
              ? "Authorization was denied."
              : e.message === "timeout"
              ? "Code expired. Please try again."
              : "Sign-in failed. Please try again.\n" + (e.stack || e.name + ": " + e.message);
          this.errorOpen = true;
        }
      } finally {
        this.signingIn = false;
        this.deviceCodeData = null;
      }
    },

    cancelSignIn() {
      this.pollAborted = true;
      this.signingIn = false;
      this.deviceCodeData = null;
    },

    switchAccount(id) {
      this.$auth.switchAccount(id);
    },

    async signOut(id) {
      await this.$auth.signOut(id);
      if (this.accounts.length === 0) {
        this.success = "Signed out.";
        this.successOpen = true;
      }
    },
  },
};
</script>

<style scoped>
.verification-url {
  color: rgb(var(--v-theme-primary));
}
.user-code {
  font-size: 2.5rem;
  letter-spacing: 0.4rem;
  font-family: monospace;
}
</style>
