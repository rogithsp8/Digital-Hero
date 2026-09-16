interface Props { message?: string; }

export default function ErrorMessage({ message }: Props) {
  if (!message) return null;
  return (
    <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">
      {message}
    </div>
  );
}
