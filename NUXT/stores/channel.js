import { defineStore } from "pinia";

export const useChannelStore = defineStore("channel", {
  state: () => ({
    loading: null,
    error: null,
    avatar: null,
    banner: null,
    title: null,
    subscribe: null,
    subscribeAlt: null,
    descriptionPreview: null,
    arrayWithContinuations: null,
    channelRequest: null,
    fullChannelInfo: null,
    subscribers: null,
    videosCount: null,
    featuredChannels: null,
    videoExample: null,
    channel: null,
    videoList: null,
    shortsVideoData: null,
    channelData: null,
    totalData: null,
    community: null,
  }),

  actions: {
    setLoading(loading) {
      this.loading = loading;
    },
    setError(error) {
      this.error = error;
    },
    setCommunity(community) {
      this.community = community;
    },
    setChannelData(channelData) {
      this.avatar = channelData.avatar;
      this.banner = channelData.banner;
      this.title = channelData.title;
      this.subscribe = channelData.subscribe;
      this.subscribeAlt = channelData.subscribeAlt;
      this.descriptionPreview = channelData.descriptionPreview;
      this.arrayWithContinuations = channelData.arrayWithContinuations;
      this.fullChannelInfo = channelData.fullChannelInfo;
      this.subscribers = channelData.subscribers;
      this.videosCount = channelData.videosCount;
      this.featuredChannels = channelData.featuredChannels;
      this.videoExample = channelData.videoExample;
      this.videoList = channelData.videoList;
      this.channelRequest = channelData.channelRequest;
      this.channelData = channelData;
      this.totalData = channelData.totalData;
      this.community = channelData.community;
    },
    updateChannelData(payload) {
      this.channel.totalData.contents =
        this.channel.totalData.contents.concat(payload.contents);
      this.channel.totalData.continuations =
        this.channel.totalData.continuations.concat(payload.continuations);
    },

    async fetchChannel(channelUrl) {
      const { $youtube } = useNuxtApp();

      let channelRequest;
      let channel;
      let fullChannelInfo;
      let arrayWithContinuations;
      let videoList;

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
        this.setLoading(true);
        channel = await $youtube.getChannel(channelRequest, "main");

        arrayWithContinuations = [];
        let pageInfo;
        for (
          let i = 0;
          i <
          channel?.contents?.singleColumnBrowseResultsRenderer?.tabs
            ?.length -
            1;
          i++
        ) {
          pageInfo = [];
          let tab =
            channel.contents?.singleColumnBrowseResultsRenderer?.tabs[i];
          if (tab?.tabRenderer) {
            pageInfo.push(
              tab?.tabRenderer?.title,
              tab?.tabRenderer?.content?.sectionListRenderer
                ?.continuations[0]?.reloadContinuationData?.continuation
            );
            arrayWithContinuations.push(pageInfo);
          }
        }
        arrayWithContinuations.push([
          "About Channel",
          channel.header.pageHeaderRenderer.content.pageHeaderViewModel
            .attribution?.attributionViewModel?.suffix?.commandRuns
            ? channel.header.pageHeaderRenderer.content
                .pageHeaderViewModel.attribution?.attributionViewModel
                ?.suffix?.commandRuns[0]?.onTap?.innertubeCommand
                ?.showEngagementPanelEndpoint?.engagementPanel
                ?.engagementPanelSectionListRenderer?.content
                ?.sectionListRenderer?.contents[0]?.itemSectionRenderer
                .contents[0]?.continuationItemRenderer
                ?.continuationEndpoint?.continuationCommand?.token
            : channel.header.pageHeaderRenderer.content
                .pageHeaderViewModel.description
                .descriptionPreviewViewModel.rendererContext
                .commandContext.onTap.innertubeCommand
                .showEngagementPanelEndpoint.engagementPanel
                .engagementPanelSectionListRenderer.content
                .sectionListRenderer.contents[0].itemSectionRenderer
                .contents[0].continuationItemRenderer
                .continuationEndpoint.continuationCommand.token,
        ]);
        videoList = await $youtube.channelVideos(channel);
      } catch (error) {
        this.setError(error);
        this.setLoading(false);
        console.error(error);
      }

      try {
        const channelData = {
          avatar:
            channel.header.c4TabbedHeaderRenderer?.avatar?.thumbnails[
              channel.header.c4TabbedHeaderRenderer?.avatar?.thumbnails
                .length - 1
            ].url ||
            channel.header.pageHeaderRenderer.content.pageHeaderViewModel
              .image.decoratedAvatarViewModel.avatar.avatarViewModel.image
              .sources[
              channel.header.pageHeaderRenderer.content
                .pageHeaderViewModel.image.decoratedAvatarViewModel.avatar
                .avatarViewModel.image.sources.length - 1
            ].url ||
            "",
          banner:
            channel.header.c4TabbedHeaderRenderer?.banner?.thumbnails[
              channel.header.c4TabbedHeaderRenderer?.banner.thumbnails
                .length - 1
            ].url ||
            channel.header.pageHeaderRenderer.content.pageHeaderViewModel
              .banner?.imageBannerViewModel.image.sources[
              channel.header.pageHeaderRenderer.content
                .pageHeaderViewModel.banner.imageBannerViewModel.image
                .sources.length - 1
            ].url ||
            "",
          title:
            channel.header.c4TabbedHeaderRenderer?.title ||
            channel.header.pageHeaderRenderer.content.pageHeaderViewModel
              .title.dynamicTextViewModel.text.content,
          subscribe:
            channel.header.c4TabbedHeaderRenderer?.subscribeButton
              .buttonRenderer.text.runs[0].text ||
            channel.header.pageHeaderRenderer.content.pageHeaderViewModel
              .actions.flexibleActionsViewModel.actionsRows[0].actions[0]
              .buttonViewModel.title ||
            "null",
          subscribeAlt:
            channel.header.c4TabbedHeaderRenderer?.subscriberCountText
              .runs[0].text ||
            channel.header.pageHeaderRenderer.content.pageHeaderViewModel
              .actions.flexibleActionsViewModel.actionsRows[0].actions[0]
              .buttonViewModel.accessibilityText ||
            "null",
          descriptionPreview:
            channel.header.c4TabbedHeaderRenderer?.tagline
              .channelTaglineRenderer.content ||
            channel.header.pageHeaderRenderer.content.pageHeaderViewModel
              .description.descriptionPreviewViewModel.description
              .content ||
            "null",
          fullChannelInfo:
            channel.header.c4TabbedHeaderRenderer?.tagline
              .channelTaglineRenderer.content || fullChannelInfo,
          subscribers:
            channel.header.c4TabbedHeaderRenderer?.subscriberCountText
              .runs[0].text ||
            channel.header.pageHeaderRenderer.content.pageHeaderViewModel
              .metadata.contentMetadataViewModel.metadataRows[1]
              .metadataParts[0].text.content ||
            "null",
          videosCount: channel.header.c4TabbedHeaderRenderer
            ? channel.header.c4TabbedHeaderRenderer?.videosCountText
                ?.runs[0]?.text +
              " " +
              channel.header.c4TabbedHeaderRenderer?.videosCountText
                ?.runs[1]?.text
            : channel.header.pageHeaderRenderer.content
                  .pageHeaderViewModel.metadata
                  .contentMetadataViewModel.metadataRows[1]
                  .metadataParts[1]
              ? channel.header.pageHeaderRenderer.content
                  .pageHeaderViewModel.metadata
                  .contentMetadataViewModel.metadataRows[1]
                  .metadataParts[1].text.content
              : "" || "null",
          featuredChannels: null,
          arrayWithContinuations: arrayWithContinuations,
          channelRequest: channelRequest,
          videoList: videoList,
        };
        this.setChannelData(channelData);
        this.setLoading(false);
      } catch (error) {
        this.setError(error);
        this.setLoading(false);
        console.error(error);
      }
    },
  },
});
