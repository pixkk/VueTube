const getDefaultState = () => {
  return {
    loading: null,
    error: null,
    avatar: null,
    banner: null,
    title: null,
    subscribe: null,
    subscribeAlt: "",
    descriptionPreview: null,
    subscribers: null,
    videosCount: null,
    featuredChannels: null,
    videoExample: null,
  };
};
export const state = () => {
  return getDefaultState();
};
export const actions = {
  fetchChannel({ state }, channelUrl) {
    Object.assign(state, getDefaultState());
    state.loading = true;
    console.log(channelUrl);
    let channelRequest = "";
    console.warn(channelUrl);
    if (
      channelUrl.includes("/c/") ||
      channelUrl.includes("/user/") ||
      channelUrl.includes("/channel/") ||
      channelUrl.includes("/@")
    ) {
      channelRequest = `https://youtube.com/${channelUrl}`;
    } else {
      channelRequest = `https://youtube.com/channel/${channelUrl}`;
    }
    this.$youtube
      .getChannel(channelRequest)
      .then((channel) => {
        // console.warn(channel);
        state.loading = false;
        state.banner =
          channel.header.channelMobileHeaderRenderer.contents[0].elementRenderer.newElement.type.componentType.model.channelBannerModel?.data.image.sources[2].url;
        state.avatar =
          channel.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.avatarData.avatar?.image.sources[0].url;
        state.title =
          channel.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.title;
        state.subscribe =
          channel.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.subscribeButtonViewModel.subscribeButtonViewModel.subscribeButtonContent.buttonText;
        state.subscribeAlt =
          channel.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.subscribeButtonViewModel.subscribeButtonViewModel.subscribeButtonContent.accessibilityText;
        state.descriptionPreview =
          channel.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.descriptionPreview.description;
        state.subscribers =
          channel.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.metadata.subscriberCountText;
        state.videosCount =
          channel.header.header.channelMobileHeaderRenderer.contents[1].elementRenderer.newElement.type.componentType.model.channelProfileModel.data.metadata.videosCountText;
        const featuredSection =
          channel.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents.find(
            (i) => {
              return Boolean(
                i?.shelfRenderer?.content?.verticalListRenderer?.items[0]
                  .elementRenderer
              );
            }
          );
        // state.featuredChannels =
        //   featuredSection.shelfRenderer.content.horizontalListRenderer.items;
        console.log(
          channel.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer
            .content.sectionListRenderer.contents[0].shelfRenderer.content
            .verticalListRenderer.items[0].elementRenderer.newElement.type
            .componentType.model
        );
        state.videoExample =
          channel.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].shelfRenderer.content.verticalListRenderer.items[0].elementRenderer.newElement.type.componentType.model.videoWithContextModel.videoWithContextData.videoData;
      })
      .catch((err) => {
        state.loading = false;
        state.error = err;
        console.error(err);
      });
  },
};
