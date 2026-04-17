//---   Modules/Imports   ---//
import { CapacitorHttp as Http } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

const updateModule = (url) => {
  return new Promise(async (resolve, reject) => {
    //---   Download File From GitHub & Save to Memory/RAM   ---//
    let data = await Http.get({
      url: url,
      responseType: "json",
      observe: "events",
    }).catch((err) => {
      return reject(err);
    });

    //---   Write File From Memory to Local Storage   ---//
    // const fileData = data.data.toString("utf8");
    // const app = await Filesystem.writeFile({
    //   path: "vuetube-update.apk",
    //   directory: Directory.Documents,
    //   data: fileData,
    // }).catch((err) => {
    //   return reject(err);
    // });
    console.log(data.data.browser_download_url);
    // data = await Http.get({
    //   url: data.data.browser_download_url,
    //   // responseType: "blob",
    //   // observe: "events",
    // }).catch((err) => {
    //   return reject(err);
    // });
    //---   Open Written File   ---//
    // console.log(app.uri);
    window.open(data.data.browser_download_url, "_blank");
  });
};
//---   Start   ---//
export default defineNuxtPlugin(() => {
  return {
    provide: {
      update: updateModule,
    },
  };
});
