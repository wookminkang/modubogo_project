import React from "react";

interface TitleProps {
  // children?: React.ReactNode;
  title: string;
  description: string;
  titlePosition?: "bottom" | "top";
  right?: React.ReactNode;
}

export function CardTitle({
  title,
  description,
  titlePosition,
  right,
}: TitleProps) {
  return (
    <div
      className={`flex pt-[8px] pb-[24px] justify-between items-center ${titlePosition === "bottom" ? "flex-col-reverse" : ""}`}
    >
      <div className="flex flex-col">
        <h3 className="text-[20px] font-bold text-[#333d4b]">{title}</h3>
        <h4 className="text-[13px] text-[#6b7684] mt-[4px]">{description}</h4>
      </div>

      {right && right}
    </div>
  );
}

// Title.titleButtonBox = function TitleButtonBox({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return <button>{children}</button>;
// };
