export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[600px] mx-auto shadow-xl min-h-screen bg-[#F0F4FA]">
      {children}
    </div>
  );
}
