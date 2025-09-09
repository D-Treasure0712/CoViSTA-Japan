import { ErrorDisplayProps } from "@/types/dataType";
import Link from 'next/link';

export default function ErrorDisplay({ title, message, error }: ErrorDisplayProps) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-lg">
            <h2 className="text-2xl font-bold text-red-600 mb-4">{title}</h2>
            <p className="text-gray-700">{message}</p>
            {error && (
            <pre className="mt-4 text-left text-xs bg-gray-50 p-3 rounded overflow-auto border">
                {error}
            </pre>
            )}
            <Link href="/" className="mt-6 inline-block bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700 transition-colors">
                選択画面に戻る
            </Link>
        </div>
      </div>
    );
}