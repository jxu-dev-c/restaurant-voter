type NoticeProps = {
  title: string;
  children: React.ReactNode;
  tone?: "info" | "warning" | "danger" | "success";
};

const toneClasses = {
  info: "border-[#bfd5e5] bg-[#f0f7fb] text-[#214f69]",
  warning: "border-[#ead6a6] bg-[#fff9e8] text-warning",
  danger: "border-[#f0c3bd] bg-[#fff4f2] text-danger",
  success: "border-[#bcd8c5] bg-[#eef8f1] text-leaf",
};

export function Notice({ title, children, tone = "info" }: NoticeProps) {
  return (
    <aside className={`rounded-2xl border p-4 ${toneClasses[tone]}`}>
      <p className="font-bold">{title}</p>
      <div className="mt-1 text-sm leading-6">{children}</div>
    </aside>
  );
}
