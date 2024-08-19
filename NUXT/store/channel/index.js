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
    let channelRequest;
    let channel;
    let aboutChannelInfo;
    let fullChannelInfo;
    let videoList;
    let community;
    let videos;
    try {
      if (
        channelUrl.includes("/c/") ||
        channelUrl.includes("/user/") ||
        channelUrl.includes("/channel/") ||
        channelUrl.includes("/@")
      ) {
        channelRequest = `https://m.youtube.com/${channelUrl}`;
      } else {
        channelRequest = channelUrl;
      }
      commit("setLoading", true);
      channel = await this.$youtube.getChannel(channelRequest, "main");
      community = await this.$youtube.getChannel(channelRequest, "community");
      videos = await this.$youtube.getChannel(channelRequest, "videos");
      aboutChannelInfo = await this.$youtube.getChannel(channelRequest, "aboutChannelInfo", channel.header.pageHeaderRenderer.content.pageHeaderViewModel.attribution? channel.header.pageHeaderRenderer.content.pageHeaderViewModel.attribution.attributionViewModel.suffix.commandRuns[0].onTap.innertubeCommand.showEngagementPanelEndpoint.engagementPanel.engagementPanelSectionListRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].continuationItemRenderer.continuationEndpoint.continuationCommand.token : channel.header.pageHeaderRenderer.content.pageHeaderViewModel.description.descriptionPreviewViewModel.rendererContext.commandContext.onTap.innertubeCommand.showEngagementPanelEndpoint.engagementPanel.engagementPanelSectionListRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].continuationItemRenderer.continuationEndpoint.continuationCommand.token);
      fullChannelInfo = aboutChannelInfo.onResponseReceivedEndpoints[0].appendContinuationItemsAction.continuationItems[0].aboutChannelRenderer.metadata.aboutChannelViewModel;
      videoList = await this.$youtube.channelVideos(videos);
    }
    catch (error) {
      commit("setError", error);
      commit("setLoading", false);
      console.error(error);
    }

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
            ?.text) : (channel.header.pageHeaderRenderer.content.pageHeaderViewModel.metadata.contentMetadataViewModel.metadataRows[1].metadataParts[1] ? channel.header.pageHeaderRenderer.content.pageHeaderViewModel.metadata.contentMetadataViewModel.metadataRows[1].metadataParts[1].text.content : "" )
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
        // community section is second from the end of the list (in 90% of cases)
        community: community != null ? community.contents.singleColumnBrowseResultsRenderer.tabs[community.contents.singleColumnBrowseResultsRenderer.tabs.length - 2].tabRenderer
         .content.sectionListRenderer : null,
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
