export const state = () => {
  return {
    loading: null,
    error: null,
    avatar: null,
    banner: null,
    title: null,
    subscribe: null,
    subscribeAlt: null,
    descriptionPreview: null,
    fullChannelInfo: null,
    subscribers: null,
    videosCount: null,
    featuredChannels: null,
    videoExample: null,
    channel: null,
    videoList: null,
    channelData: null,
  };
};
export const mutations = {
  setLoading(state, loading) {
    state.loading = loading;
  },
  setError(state, error) {
    state.error = error;
  },
  setChannelData(state, channelData) {
    state.avatar = channelData.avatar;
    state.banner = channelData.banner;
    state.title = channelData.title;
    state.subscribe = channelData.subscribe;
    state.subscribeAlt = channelData.subscribeAlt;
    state.descriptionPreview = channelData.descriptionPreview;
    state.fullChannelInfo = channelData.fullChannelInfo;
    state.subscribers = channelData.subscribers;
    state.videosCount = channelData.videosCount;
    state.featuredChannels = channelData.featuredChannels;
    state.videoExample = channelData.videoExample;
    state.videoList = channelData.videoList;
    // state.channelData = channelData;
    state.totalData = channelData.totalData;
    state.community = channelData.community;
  },
  updateChannelData(state, payload) {
    state.channel.totalData.contents = state.channel.totalData.contents.concat(payload.contents);
    state.channel.totalData.continuations = state.channel.totalData.continuations.concat(payload.continuations);
  }

};

export function getChannelProfileData() {
  return this.state;
}

export const actions = {
  async fetchChannel({ commit }, channelUrl) {
    console.log(channelUrl);
    let channelRequest;
    if (
      channelUrl.includes("/c/") ||
      channelUrl.includes("/user/") ||
      channelUrl.includes("/channel/") ||
      channelUrl.includes("/@")
    ) {
      channelRequest = `https://m.youtube.com/${channelUrl}`;
    } else {
      channelRequest = `https://m.youtube.com/channel/${channelUrl}`;
    }
    commit("setLoading", true);
    let channel = await this.$youtube.getChannel(channelRequest, "main");
    let community = await this.$youtube.getChannel(channelRequest, "community");
    let fullInfo = await this.$youtube.getChannel(channelRequest, "fullInfo", channel.header.pageHeaderRenderer.content.pageHeaderViewModel.attribution.attributionViewModel.suffix.commandRuns[0].onTap.innertubeCommand.showEngagementPanelEndpoint.engagementPanel.engagementPanelSectionListRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].continuationItemRenderer.continuationEndpoint.continuationCommand.token);
    let fullChannelInfo = fullInfo.onResponseReceivedEndpoints[0].appendContinuationItemsAction.continuationItems[0].aboutChannelRenderer.metadata.aboutChannelViewModel;
    console.log(fullChannelInfo);
    console.log(channel);
    console.log("community" + community);
    let videoList = await this.$youtube.channelVideos(channel);
    console.log(videoList);
    try {
      const channelData = {
        avatar:
          channel.header.c4TabbedHeaderRenderer?.avatar?.thumbnails[
            channel.header.c4TabbedHeaderRenderer?.avatar?.thumbnails.length - 1
          ].url || channel.header.pageHeaderRenderer.content.pageHeaderViewModel.image.decoratedAvatarViewModel.avatar.avatarViewModel.image.sources[channel.header.pageHeaderRenderer.content.pageHeaderViewModel.image.decoratedAvatarViewModel.avatar.avatarViewModel.image.sources.length -1].url || "",
        banner:
          channel.header.c4TabbedHeaderRenderer?.banner?.thumbnails[
            channel.header.c4TabbedHeaderRenderer?.banner.thumbnails.length - 1
          ].url || channel.header.pageHeaderRenderer.content.pageHeaderViewModel.banner.imageBannerViewModel.image.sources[channel.header.pageHeaderRenderer.content.pageHeaderViewModel.banner.imageBannerViewModel.image.sources.length - 1].url || "",
        title: channel.header.c4TabbedHeaderRenderer?.title || channel.header.pageHeaderRenderer.content.pageHeaderViewModel.title.dynamicTextViewModel.text.content,
        subscribe:
          channel.header.c4TabbedHeaderRenderer?.subscribeButton.buttonRenderer
            .text.runs[0].text || channel.header.pageHeaderRenderer.content.pageHeaderViewModel.actions.flexibleActionsViewModel.actionsRows[0].actions[0].buttonViewModel.title || "null",
        subscribeAlt:
          channel.header.c4TabbedHeaderRenderer?.subscriberCountText.runs[0]
            .text || channel.header.pageHeaderRenderer.content.pageHeaderViewModel.actions.flexibleActionsViewModel.actionsRows[0].actions[0].buttonViewModel.accessibilityText || "null",
        descriptionPreview:
          channel.header.c4TabbedHeaderRenderer?.tagline.channelTaglineRenderer
            .content || channel.header.pageHeaderRenderer.content.pageHeaderViewModel.description.descriptionPreviewViewModel.description.content || "null",
        fullChannelInfo:
          channel.header.c4TabbedHeaderRenderer?.tagline.channelTaglineRenderer
            .content || fullChannelInfo,
        subscribers:
          channel.header.c4TabbedHeaderRenderer?.subscriberCountText.runs[0]
            .text || channel.header.pageHeaderRenderer.content.pageHeaderViewModel.metadata.contentMetadataViewModel.metadataRows[1].metadataParts[0].text.content || "null",
        videosCount: channel.header.c4TabbedHeaderRenderer ? (channel.header.c4TabbedHeaderRenderer?.videosCountText?.runs[0]?.text +
          " " +
          channel.header.c4TabbedHeaderRenderer?.videosCountText?.runs[1]
            ?.text) : (channel.header.pageHeaderRenderer.content.pageHeaderViewModel.metadata.contentMetadataViewModel.metadataRows[1].metadataParts[1].text.content )
           || "null",
        featuredChannels: null, // You can set this value as per your data structure
        // videoExample:
        //   channel.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer
        //     .content.sectionListRenderer.contents[0].shelfRenderer.content
        //     .horizontalListRenderer? channel.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer
        //     .content.sectionListRenderer.contents[0].shelfRenderer.content
        //     .horizontalListRenderer.items[0].elementRenderer.newElement.type
        //     .componentType.model.gridVideoModel.videoData : channel.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer
        //     .content.sectionListRenderer.contents[0].shelfRenderer.content
        //     .verticalListRenderer.items[0].elementRenderer.newElement.type
        //     .componentType.model.videoWithContextModel.videoWithContextData,
        // videoExample:
        //   channel.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer
        //     .content.sectionListRenderer.contents[0].shelfRenderer.content
        //     .horizontalListRenderer? channel.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer
        //     .content.sectionListRenderer.contents[0].shelfRenderer.content
        //     .horizontalListRenderer.items : channel.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer
        //     .content.sectionListRenderer.contents[0].shelfRenderer.content
        //     .verticalListRenderer.items,
       // videoExample: channel.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents,
        totalData: videoList,
        // community section is second from the end of the list
        community: community.contents.singleColumnBrowseResultsRenderer.tabs[community.contents.singleColumnBrowseResultsRenderer.tabs.length - 2].tabRenderer
          .content.sectionListRenderer,
      };
      commit("setChannelData", channelData);
      commit("setLoading", false);
    } catch (error) {
      commit("setError", error);
      commit("setLoading", false);
      console.error(error);
    }
  },
};

// export const actions = {
//   fetchChannel({ state }, channelUrl) {
//     commit('setLoading', true);
//     // console.log(channelUrl);
//     let channelRequest = "";
//     // console.warn(channelUrl);
//     if (
//       channelUrl.includes("/c/") ||
//       channelUrl.includes("/user/") ||
//       channelUrl.includes("/channel/") ||
//       channelUrl.includes("/@")
//     ) {
//       channelRequest = `https://youtube.com/${channelUrl}`;
//     } else {
//       channelRequest = `https://youtube.com/channel/${channelUrl}`;
//     }
//     this.$youtube
//       .getChannel(channelRequest)
//       .then((channel) => {
//         console.warn(channel.header.channelMobileHeaderRenderer);
//         state.loading = false;
//         state.banner =
//           channel.header.channelMobileHeaderRenderer.contents[0].elementRenderer.newElement.type.componentType.model.channelBannerModel?.data.image.sources[4].url;
//         state.avatar =
//           channel.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.avatarData.avatar?.image.sources[3].url;
//         state.title =
//           channel.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.title;
//         state.subscribe =
//           channel.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.subscribeButtonViewModel.subscribeButtonViewModel.subscribeButtonContent.buttonText;
//         state.subscribeAlt =
//           channel.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.subscribeButtonViewModel.subscribeButtonViewModel.subscribeButtonContent.accessibilityText;
//         state.descriptionPreview =
//           channel.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.descriptionPreview.description;
//         state.subscribers =
//           channel.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.metadata.subscriberCountText;
//         state.videosCount =
//           channel.header.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.metadata.videosCountText;
//         const featuredSection =
//           channel.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents.find(
//             (i) => {
//               return Boolean(
//                 i?.shelfRenderer?.content?.verticalListRenderer?.items[0]
//                   .elementRenderer
//               );
//             }
//           );
//         // state.featuredChannels =
//         //   featuredSection.shelfRenderer.content.horizontalListRenderer.items;
//         console.log(
//           channel.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer
//             .content.sectionListRenderer.contents[0].shelfRenderer.content
//             .verticalListRenderer.items[0].elementRenderer.newElement.type
//             .componentType.model
//         );
//         state.videoExample =
//           channel.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].shelfRenderer.content.horizontalListRenderer.items[0].elementRenderer.newElement.type.componentType.model.gridVideoModel.videoData;
//       })
//       .catch((err) => {
//         state.loading = false;
//         state.error = err;
//         console.error(err);
//       });
//   },
// };
