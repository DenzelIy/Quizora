import { Circle, Square, Triangle, Diamond, Check, X } from 'lucide-react';

const colorMap: Record<string, { bg: string; hover: string; selected: string }> = {
  red: { bg: 'bg-red-500/20 border-red-500/40', hover: 'hover:bg-red-500/30', selected: 'bg-red-500 border-red-400' },
  blue: { bg: 'bg-blue-500/20 border-blue-500/40', hover: 'hover:bg-blue-500/30', selected: 'bg-blue-500 border-blue-400' },
  green: { bg: 'bg-emerald-500/20 border-emerald-500/40', hover: 'hover:bg-emerald-500/30', selected: 'bg-emerald-500 border-emerald-400' },
  yellow: { bg: 'bg-yellow-500/20 border-yellow-500/40', hover: 'hover:bg-yellow-500/30', selected: 'bg-yellow-500 border-yellow-400' },
  purple: { bg: 'bg-purple-500/20 border-purple-500/40', hover: 'hover:bg-purple-500/30', selected: 'bg-purple-500 border-purple-400' },
  cyan: { bg: 'bg-cyan-500/20 border-cyan-500/40', hover: 'hover:bg-cyan-500/30', selected: 'bg-cyan-500 border-cyan-400' },
};

const shapeIcons = [Circle, Square, Triangle, Diamond, Circle, Square];
const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan'];

interface AnswerCardProps {
  text: string;
  index: number;
  selected?: boolean;
  correct?: boolean;
  revealed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function AnswerCard({ text, index, selected, correct, revealed, disabled, onClick }: AnswerCardProps) {
  const color = colors[index % colors.length];
  const { bg, hover, selected: selectedClass } = colorMap[color];
  const ShapeIcon = shapeIcons[index % shapeIcons.length];

  let classes = `relative w-full p-4 sm:p-5 rounded-xl border-2 text-left transition-all duration-200 answer-card-hover cursor-pointer min-h-[70px] flex items-center gap-3`;

  if (revealed) {
    if (correct) {
      classes += ' bg-emerald-500 border-emerald-400 text-white';
    } else if (selected && !correct) {
      classes += ' bg-red-500/30 border-red-500 text-red-200';
    } else {
      classes += ' bg-slate-700/30 border-slate-600 text-slate-400';
    }
  } else if (selected) {
    classes += ` ${selectedClass} text-white scale-[1.02]`;
  } else {
    classes += ` ${bg} ${!disabled ? hover : ''} text-white`;
  }

  if (disabled && !revealed) {
    classes += ' opacity-60 cursor-not-allowed';
  }

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      <ShapeIcon className="w-5 h-5 flex-shrink-0 opacity-60" />
      <span className="text-base sm:text-lg font-medium flex-1">{text}</span>
      {revealed && correct && <Check className="w-6 h-6 text-white flex-shrink-0" />}
      {revealed && selected && !correct && <X className="w-6 h-6 text-red-200 flex-shrink-0" />}
    </button>
  );
}
