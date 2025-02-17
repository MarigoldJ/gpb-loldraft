export interface ChampionData {
  type: string;
  format: string;
  version: string;
  data: {
    [key: string]: {
      id: string;
      key: string;
      name: string;
      title: string;
      image: {
        full: string;
      };
    };
  };
}
