import { NAME_DISPLAY_MAX } from "../../config/app";

interface Props {
  name: string | undefined;
  max?: number;
}

/**
 * 名字太長就截斷（補「…」，滑上去看完整名字），避免把表格撐寬跑版。
 */
export function NameCell({ name, max = NAME_DISPLAY_MAX }: Props) {
  const full = String(name || "匿名");
  const cut = full.length > max ? full.slice(0, max) + "…" : full;
  return (
    <span className="nmtxt" title={full}>
      {cut}
    </span>
  );
}
