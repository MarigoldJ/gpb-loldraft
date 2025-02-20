export default function DraftLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full min-h-screen">{children}</div>;
}
