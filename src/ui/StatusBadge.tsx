import type { SampleStatus } from "../domain/types";

const LABEL: Record<SampleStatus, string> = {
  已登记: "已登记",
  待复核: "待复核",
  已修正: "已修正",
};

export default function StatusBadge({ status }: { status: SampleStatus }) {
  const cls = status === "待复核" ? "badge danger" : status === "已修正" ? "badge ok" : "badge warn";
  return <span className={cls}>{LABEL[status]}</span>;
}
