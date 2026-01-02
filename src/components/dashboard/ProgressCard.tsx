"use client";

interface ProgressCardProps {
  title: string;
  percentage: number;
  stats?: {
    completed: number;
    inProgress: number;
    pending: number;
  };
}

export function ProgressCard({ title, percentage, stats }: ProgressCardProps) {
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      
      <div className="flex items-center justify-center">
        <div className="relative h-48 w-48">
          {/* Background Circle */}
          <svg className="h-full w-full -rotate-90 transform">
            <circle
              cx="96"
              cy="96"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress Circle */}
            <circle
              cx="96"
              cy="96"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="text-emerald-600 transition-all duration-500"
              strokeLinecap="round"
            />
          </svg>
          
          {/* Center Text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-white">
                {percentage}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Completato</div>
            </div>
          </div>
        </div>
      </div>

      {stats && (
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="flex items-center justify-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              Completati
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {stats.completed}
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              In Corso
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {stats.inProgress}
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <div className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              In Attesa
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {stats.pending}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
