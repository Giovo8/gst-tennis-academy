"use client";

type TypingIndicatorProps = {
  userNames: string[];
};

export default function TypingIndicator({ userNames }: TypingIndicatorProps) {
  if (userNames.length === 0) return null;

  const displayText =
    userNames.length === 1
      ? `${userNames[0]} sta scrivendo...`
      : userNames.length === 2
      ? `${userNames[0]} e ${userNames[1]} stanno scrivendo...`
      : `${userNames[0]} e altri ${userNames.length - 1} stanno scrivendo...`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
      <div className="flex gap-1">
        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-xs italic">{displayText}</span>
    </div>
  );
}
