interface StatusBadgeProps {
  readonly children: string;
  readonly tone?: "SUCCESS" | "WARNING" | "DANGER" | "INFO" | "LIME" | "NEUTRAL";
}

export function StatusBadge({ children, tone = "NEUTRAL" }: StatusBadgeProps) {
  return <span className={`avStatusBadge avStatusBadge--${tone.toLowerCase()}`}>{children}</span>;
}