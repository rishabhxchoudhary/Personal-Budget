export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Tailwind CSS Test Page
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test Card 1 - Basic Styles */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Basic Styles
            </h2>
            <p className="text-gray-600 mb-4">
              This card tests basic Tailwind utilities.
            </p>
            <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors">
              Test Button
            </button>
          </div>

          {/* Test Card 2 - Flexbox */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Flexbox Test
            </h2>
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-red-500 rounded"></div>
              <div className="w-12 h-12 bg-green-500 rounded"></div>
              <div className="w-12 h-12 bg-blue-500 rounded"></div>
            </div>
          </div>

          {/* Test Card 3 - Custom Theme Colors */}
          <div className="bg-card text-card-foreground rounded-lg shadow-md p-6 border border-border">
            <h2 className="text-2xl font-semibold mb-4">
              Custom Theme Colors
            </h2>
            <div className="space-y-2">
              <div className="bg-primary text-primary-foreground p-2 rounded">
                Primary Color
              </div>
              <div className="bg-secondary text-secondary-foreground p-2 rounded">
                Secondary Color
              </div>
              <div className="bg-accent text-accent-foreground p-2 rounded">
                Accent Color
              </div>
            </div>
          </div>

          {/* Test Card 4 - Responsive */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Responsive Test
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl">
              This text changes size based on screen width.
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-purple-500 text-white p-2 text-center rounded">
                  {i}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Test Full Width Section */}
        <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-8 rounded-lg">
          <h2 className="text-3xl font-bold mb-4">Gradient Background</h2>
          <p className="text-lg">
            If you can see this gradient and all the styled elements above,
            Tailwind CSS is working correctly!
          </p>
        </div>

        {/* Test Utility Classes */}
        <div className="mt-8 space-y-4">
          <div className="luxury-gradient p-6 rounded-lg luxury-border">
            <h3 className="text-xl font-semibold mb-2">Custom Utility Classes</h3>
            <p>Testing custom utilities: luxury-gradient, luxury-border</p>
          </div>

          <div className="glass-effect p-6 rounded-lg luxury-shadow">
            <h3 className="text-xl font-semibold mb-2">Glass Effect</h3>
            <p>Testing glass-effect and luxury-shadow utilities</p>
          </div>
        </div>
      </div>
    </div>
  );
}
