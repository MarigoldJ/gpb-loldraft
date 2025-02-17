export const RIOT_BASE_URL = "https://ddragon.leagueoflegends.com";
export const LANGUAGES = ["ko_KR", "en_US", "ja_JP", "zh_CN"] as const;
export type Language = (typeof LANGUAGES)[number];
