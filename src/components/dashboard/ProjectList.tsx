"use client";

import { LucideIcon } from "lucide-react";

interface Project {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
}

interface ProjectListProps {
  projects: Project[];
}

const colorClasses: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  green: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
};

export function ProjectList({ projects }: ProjectListProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attività</h3>
        <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
          + Nuovo
        </button>
      </div>
      
      <div className="space-y-3">
        {projects.map((project) => {
          const Icon = project.icon;
          return (
            <div
              key={project.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition-all hover:border-gray-200 hover:bg-gray-100/50 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-gray-700 dark:hover:bg-gray-800"
            >
              <div className={`rounded-lg p-2 ${colorClasses[project.color] || colorClasses.blue}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {project.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {project.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
