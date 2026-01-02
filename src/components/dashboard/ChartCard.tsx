"use client";

interface ChartData {
  day: string;
  value: number;
}

interface ChartCardProps {
  title: string;
  data: ChartData[];
}

export function ChartCard({ title, data }: ChartCardProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      
      <div className="flex items-end justify-between gap-2 h-48">
        {data.map((item, index) => {
          const height = (item.value / maxValue) * 100;
          const isHighest = item.value === maxValue;
          
          return (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative w-full flex items-end justify-center" style={{ height: '160px' }}>
                <div
                  className={`w-full rounded-t-lg transition-all hover:opacity-80 ${
                    isHighest
                      ? 'bg-gradient-to-t from-emerald-600 to-emerald-500'
                      : index % 2 === 0
                      ? 'bg-gradient-to-t from-emerald-500/70 to-emerald-400/70'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${item.day}: ${item.value}`}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {item.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
