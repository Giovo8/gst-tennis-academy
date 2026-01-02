"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumbs({ items, showHome = true, className = "" }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-2 text-sm">
        {showHome && (
          <>
            <li>
              <Link
                href="/"
                className="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-frozen-400 transition-colors"
                aria-label="Home"
              >
                <Home className="h-4 w-4" />
              </Link>
            </li>
            {items.length > 0 && (
              <li>
                <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-600" />
              </li>
            )}
          </>
        )}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-frozen-400 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`${
                    isLast
                      ? "text-slate-900 dark:text-white font-medium"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-600" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
