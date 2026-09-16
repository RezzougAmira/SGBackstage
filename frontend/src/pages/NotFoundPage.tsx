export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <p className="mt-4 text-xl text-gray-600">Page non trouvée</p>
        <a href="/" className="mt-6 inline-block text-blue-600 hover:text-blue-800">
          Retour au tableau de bord
        </a>
      </div>
    </div>
  );
}
