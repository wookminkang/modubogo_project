import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Image
          src="/modubogo_logo.svg"
          alt="모두보고"
          width={77}
          height={24}
          className="h-6 w-auto"
        />
        <span className="text-xs text-gray-400">
          © 2026 Modubogo. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
