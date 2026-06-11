interface LoadingSpinnerProps {
  fullScreen?: boolean;
  message?: string;
}

export default function LoadingSpinner({ fullScreen = false, message }: LoadingSpinnerProps) {
  const containerClasses = fullScreen 
    ? "h-screen flex items-center justify-center bg-gray-100"
    : "flex items-center justify-center min-h-screen";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-violet-500 rounded-full animate-spin"></div>
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  );
}
