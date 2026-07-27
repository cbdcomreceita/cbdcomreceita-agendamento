export function RichText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-brand-forest-dark">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}
