import { RichText } from "./rich-text";

interface Props {
  title?: string;
  paragraphs: string[];
}

export function CopyCard({ title, paragraphs }: Props) {
  return (
    <div className="rounded-2xl border border-brand-sand/60 bg-white p-5 sm:p-6">
      {title && (
        <h2 className="mb-3 text-xl font-bold tracking-tight text-brand-forest-dark sm:text-2xl">
          {title}
        </h2>
      )}
      <div className="space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-[17px] leading-relaxed text-brand-text sm:text-lg">
            <RichText text={p} />
          </p>
        ))}
      </div>
    </div>
  );
}
