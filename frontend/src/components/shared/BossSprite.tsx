import { useState, type CSSProperties } from "react";
import type { Boss } from "../../lib/types";

interface Props {
  boss: Boss;
  /** 圖片的 class */
  imgClass?: string;
  /** 沒有圖或圖掛掉時，emoji 的 class */
  emojiClass?: string;
  /** 沒有圖時 emoji 的字級；圖掛掉的備援交給 CSS class 決定 */
  emojiFontSize?: number;
  imgStyle?: CSSProperties;
}

/**
 * 王的頭像。圖片載不到就換成 emoji，跟舊版的 onerror 行為一樣。
 */
export function BossSprite({
  boss,
  imgClass = "",
  emojiClass = "emoji",
  emojiFontSize,
  imgStyle,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (!boss.img) {
    return (
      <span className={emojiClass} style={emojiFontSize ? { fontSize: emojiFontSize } : undefined}>
        {boss.emoji}
      </span>
    );
  }
  if (failed) {
    return <span className={emojiClass}>{boss.emoji}</span>;
  }
  return (
    <img
      className={imgClass}
      src={boss.img}
      alt={boss.name}
      style={imgStyle}
      onError={() => setFailed(true)}
    />
  );
}
