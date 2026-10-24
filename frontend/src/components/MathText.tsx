import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
  className?: string;
}

function renderSegment(segment: string, display: boolean): string {
  try {
    return katex.renderToString(segment, { displayMode: display, throwOnError: false });
  } catch {
    return segment;
  }
}

function parseAndRender(text: string): string {
  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const displayStart = remaining.indexOf('$$');
    const inlineStart = remaining.indexOf('$');

    if (displayStart !== -1 && (displayStart <= inlineStart || inlineStart === -1)) {
      parts.push(escapeHtml(remaining.slice(0, displayStart)));
      const afterOpen = remaining.slice(displayStart + 2);
      const displayEnd = afterOpen.indexOf('$$');
      if (displayEnd === -1) {
        parts.push(escapeHtml(remaining.slice(displayStart)));
        break;
      }
      parts.push(renderSegment(afterOpen.slice(0, displayEnd), true));
      remaining = afterOpen.slice(displayEnd + 2);
    } else if (inlineStart !== -1) {
      parts.push(escapeHtml(remaining.slice(0, inlineStart)));
      const afterOpen = remaining.slice(inlineStart + 1);
      const inlineEnd = afterOpen.indexOf('$');
      if (inlineEnd === -1) {
        parts.push(escapeHtml(remaining.slice(inlineStart)));
        break;
      }
      parts.push(renderSegment(afterOpen.slice(0, inlineEnd), false));
      remaining = afterOpen.slice(inlineEnd + 1);
    } else {
      parts.push(escapeHtml(remaining));
      break;
    }
  }

  return parts.join('');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function MathText({ text, className = '' }: MathTextProps) {
  const html = parseAndRender(text);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
