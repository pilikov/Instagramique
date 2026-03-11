export interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  account_type: string;
  profile_picture_url?: string;
  biography?: string;
  website?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL" | "STORY";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  children?: {
    data: Array<{
      media_url: string;
      media_type: string;
    }>;
  };
}

export interface InstagramComment {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  like_count?: number;
  replies?: {
    data: InstagramComment[];
  };
}

export interface InstagramInsight {
  name: string;
  period: string;
  values: Array<{
    value: number;
    end_time?: string;
  }>;
  title: string;
  description: string;
  id: string;
}

export interface SessionData {
  accessToken: string;
  userId: string;
  username?: string;
  expiresAt?: number;
}
