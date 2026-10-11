// Ekran ładowania, gdy Firebase sprawdza sesję
function Splash({ message }: { message?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6">
      <div className="text-6xl animate-float">🇪🇸</div>

      {message ? (
        <p className="max-w-sm">{message}</p>
      ) : (
        <div
          role="status"
          aria-label="Loading"
          className="h-8 w-8 animate-spin rounded-full border-4 border-accent-soft border-t-accent"
        />
      )}
    </div>
  );
}

export default Splash;
