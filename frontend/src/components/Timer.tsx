interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { width: 60, stroke: 4, fontSize: 'text-lg' },
  md: { width: 90, stroke: 5, fontSize: 'text-2xl' },
  lg: { width: 120, stroke: 6, fontSize: 'text-4xl' },
};

export function Timer({ timeRemaining, totalTime, size = 'md' }: TimerProps) {
  const { width, stroke, fontSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? timeRemaining / totalTime : 0;
  const offset = circumference * (1 - progress);

  const color =
    timeRemaining <= 5 ? '#ef4444' :
    timeRemaining <= 10 ? '#eab308' :
    '#22c55e';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width, height: width }}>
      <svg width={width} height={width} className="-rotate-90">
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="#334155"
          strokeWidth={stroke}
        />
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span
        className={`absolute font-bold ${fontSize}`}
        style={{ color }}
      >
        {Math.ceil(timeRemaining)}
      </span>
    </div>
  );
}
