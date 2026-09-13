import {
  DangerIcon,
  InfoIcon,
  SuccessIcon,
  WarningIcon,
  type AppIconProps,
} from "@/components/ui/icons";
import type { ComponentType } from "react";

type NoticeTone = "info" | "warning" | "danger" | "success";

type NoticeProps = {
  title: string;
  children: React.ReactNode;
  tone?: NoticeTone;
};

const toneClasses: Record<NoticeTone, string> = {
  info: "border-blue/25 bg-blue-soft text-blue",
  warning: "border-gold/40 bg-gold-soft text-gold-ink",
  danger: "border-danger/30 bg-danger-soft text-danger",
  success: "border-success/30 bg-success-soft text-success",
};

/* The glyph repeats the tone the colour already carries, so colour is no longer
   the only thing separating a warning from a result. */
const toneIcons: Record<NoticeTone, ComponentType<AppIconProps>> = {
  info: InfoIcon,
  warning: WarningIcon,
  danger: DangerIcon,
  success: SuccessIcon,
};

export function Notice({ title, children, tone = "info" }: NoticeProps) {
  const ToneIcon = toneIcons[tone];

  return (
    <aside className={`flex gap-3 rounded-xs border p-4 ${toneClasses[tone]}`}>
      <ToneIcon className="mt-0.5 shrink-0" size={20} />
      <div className="min-w-0">
        <p className="card-title text-current">{title}</p>
        <div className="mt-1 text-sm leading-6">{children}</div>
      </div>
    </aside>
  );
}
