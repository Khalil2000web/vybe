"use client";

import { useEffect, useState } from "react";
import { formatFullDate, formatRelativeTime } from "@/app/lib/time";

export default function TimeAgo({ date, className = "" }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (!date) return null;

  return (
    <time
      dateTime={date}
      title={formatFullDate(date)}
      className={className}
    >
      {formatRelativeTime(date, now)}
    </time>
  );
}