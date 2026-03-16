export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main>
      <div className="overflow-hidden">{children}</div>
    </main>
  );
}
