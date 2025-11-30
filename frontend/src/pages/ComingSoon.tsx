import { AlertCircle } from 'lucide-react';

export default function ComingSoon() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 via-white to-gray-100 p-6">
      <div className="max-w-2xl w-full text-center">
        {/* Icon lớn + hiệu ứng pulse */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 animate-ping bg-cyan-400/20 rounded-full w-32 h-32 mx-auto" />
          <div className="relative mx-auto w-32 h-32 bg-linear-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl">
            <AlertCircle className="w-16 h-16 text-white" />
          </div>
        </div>

        {/* Tiêu đề */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4">
          Coming Soon
        </h1>

        {/* Mô tả */}
        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
          We're working hard to bring you this amazing feature. <br />
          <span className="text-cyan-600 font-semibold">Stay tuned!</span>
        </p>

        {/* Hiệu ứng loading dots */}
        <div className="flex justify-center gap-3 mb-12">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-4 h-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        {/* Thông tin thêm */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/50">
          <p className="text-gray-600">
            This section is under active development and will be available in the next update.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <span className="px-5 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium">
              Analytics
            </span>
            <span className="px-5 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              Inventory
            </span>
            <span className="px-5 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              People Tracking
            </span>
          </div>
        </div>

        {/* Footer nhỏ */}
        <p className="mt-12 text-sm text-gray-500">
          © 2025 WareVision • Smart Warehouse Monitoring
        </p>
      </div>
    </div>
  );
}