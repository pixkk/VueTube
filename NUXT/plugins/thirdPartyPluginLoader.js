//---   Modules/Imports   ---//
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import constants from "~/lib/constants";
import { getCpn } from "~/lib/utils";

const { fs } = constants;

//---   Set Up App Directory   ---//
const APP_DIRECTORY = Directory.Data;

//---   Ensure Plugins Folder   ---//
const ensureStructure = new Promise(async (resolve, reject) => {
  try {
    await Filesystem.mkdir({
      directory: APP_DIRECTORY,
      recursive: true,
      path: fs.plugins,
    });
  } catch (e) {
    /* Exists */
  }

  resolve();
});

const tpplModule = {
  //---   List Plugins   ---//
  list: new Promise(async (resolve, reject) => {
    await ensureStructure;

    Filesystem.readdir({
      path: fs.plugins,
      directory: APP_DIRECTORY,
    })
    .then(res => {
      resolve(res);
    })
    .catch(err => {
      reject(err);
    });


  }),

  async addPlugin(content) {
    await ensureStructure;
    new Promise(async (resolve, reject) => {
      const fileName = getCpn();
      console.log("Saving Plugin As" + fileName);
      await Filesystem.writeFile({
        path: fs.plugins + fileName + ".js",
        directory: APP_DIRECTORY,
        data: content,
        encoding: Encoding.UTF8,
      });
      resolve();
    });
  },

  async removePlugin(name) {
    await ensureStructure;
    new Promise(async (resolve, reject) => {
      await Filesystem.deleteFile({
        path: fs.plugins + name,
        directory: APP_DIRECTORY,
      });
      resolve();
    });
  },

};

//---   Start   ---//
export default defineNuxtPlugin(() => {
  return {
    provide: {
      tppl: tpplModule,
    },
  };
});
