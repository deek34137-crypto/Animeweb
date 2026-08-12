export default function HentaiLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <div className="h-44 shimmer-loader rounded-3xl" />
      <div className="h-10 w-48 shimmer-loader rounded-xl" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-40 h-56 shimmer-loader rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-52 shimmer-loader rounded-2xl" />
        ))}
      </div>
    </div>
  );
}