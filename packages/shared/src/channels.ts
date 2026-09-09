export const CHANNELS = ["INSTAGRAM", "X", "YOUTUBE", "THREADS"] as const;
export type ChannelValue = (typeof CHANNELS)[number];

export const CHANNEL_LABEL: Record<ChannelValue, string> = {
  INSTAGRAM: "인스타그램",
  X: "X",
  YOUTUBE: "유튜브",
  THREADS: "스레드",
};

/** 배포 링크 코드는 URL에 노출되므로 짧고 채널이 드러나는 접두어를 붙인다. (예: ig_k3j9x2) */
export const CHANNEL_PREFIX: Record<ChannelValue, string> = {
  INSTAGRAM: "ig",
  X: "x",
  YOUTUBE: "yt",
  THREADS: "th",
};
