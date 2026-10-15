import type { Boss } from "../lib/types";

const IMG = "https://maplebossteam.com/assets/bosses/";

/** 自己放在 public/bosses/ 的圖，用 BASE_URL 組出來，部署在子路徑也找得到 */
const LOCAL_IMG = (file: string) => import.meta.env.BASE_URL + "bosses/" + file;

/**
 * BOSS 與重生時間（分鐘）。respawnMin === respawnMax 為固定時間，
 * 不相等則是浮動區間（最早～最晚）。
 */
export const BOSSES: Boss[] = [
  { key: "zombie",    name: "殭屍蘑菇王", emoji: "🧟", img: IMG + "zombie-mushmom.png",    map: "螞蟻礦坑隱藏地圖", respawnMin: 40,  respawnMax: 60  },
  { key: "mushking",  name: "蘑菇王",     emoji: "🍄", img: IMG + "mushmom.png",           map: "菇菇王出沒地",     respawnMin: 40,  respawnMax: 60  },
  { key: "blackcroc", name: "沼澤巨鱷",   emoji: "🐊", img: IMG + "swamp-croc.png",        map: "鱷魚潭 I / II",    respawnMin: 45,  respawnMax: 45  },
  { key: "monkey",    name: "殭屍猴王",   emoji: "🐒", img: IMG + "zombie-lupin-king.png", map: "巫婆森林 I / II",  respawnMin: 45,  respawnMax: 45  },
  { key: "hermit",    name: "巨居蟹",     emoji: "🦀", img: IMG + "king-clang.png",        map: "海龜沙灘",         respawnMin: 45,  respawnMax: 45  },
  { key: "balrog",    name: "巴洛古",     emoji: "👹", img: IMG + "balrog.png",            map: "被詛咒的寺院",     respawnMin: 240, respawnMax: 360 },
  { key: "treeking",  name: "樹妖王",     emoji: "🌳", img: IMG + "deo.png",               map: "東方岩石山 V",     respawnMin: 45,  respawnMax: 45  },
  { key: "rubyking",  name: "紅寶王",     emoji: "💎", img: IMG + "stumpy.png",            map: "海岸草叢III",      respawnMin: 45,  respawnMax: 45  },
  { key: "yeti",      name: "雪毛怪人",   emoji: "❄️", img: LOCAL_IMG("yati.png"),         map: "雪人之谷",         respawnMin: 45,  respawnMax: 68  },
  { key: "blackman",  name: "黑鬼里芬",   emoji: "🧪", img: LOCAL_IMG("black_man.png"),    map: "天空庭院",         respawnMin: 45,  respawnMax: 45  },
  { key: "test",      name: "測試王",     emoji: "🧪", img: "",                            map: "測試用",           respawnMin: 10,  respawnMax: 10  },
];

export const bossByKey: Record<string, Boss | undefined> = Object.fromEntries(
  BOSSES.map((b) => [b.key, b]),
);

export const DEFAULT_BOSS = BOSSES[0].key;

/** 找得到就回傳，找不到回 undefined（資料庫可能留有已移除的王） */
export const findBoss = (key: string | undefined): Boss | undefined =>
  key ? bossByKey[key] : undefined;
