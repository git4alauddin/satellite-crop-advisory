type PlaceholderPageProps = {
  title: string;
  summary: string;
};

export default function PlaceholderPage({ title, summary }: PlaceholderPageProps) {
  return (
    <div className="page">
      <h2>{title}</h2>
      <p>{summary}</p>
      <div className="placeholderBox">
        <p>This component is intentionally reset and ready for fresh implementation.</p>
      </div>
    </div>
  );
}
