import { Children, Fragment } from "react";
import { parseFurigana, stripFurigana } from "../../domain/furigana.js";

function renderString(text, keyPrefix) {
  return parseFurigana(text).map((token, index) => {
    if (!token.reading) return <Fragment key={`${keyPrefix}-${index}`}>{token.text}</Fragment>;
    return (
      <ruby key={`${keyPrefix}-${index}`}>
        {token.text}
        <rt aria-hidden="true">{token.reading}</rt>
      </ruby>
    );
  });
}

// `plain` を渡すと、ふりがなを付けずにそのまま表示する。ナビ・ボタン・バッジ
// などの機能的なUI部品で、ルビによる情報過多を避けるために使う。読みの注釈記法
// （｜・《》）はどちらの表示でも解釈し、plain では読みを落として基底だけを出す。
export function UiText({ children, plain = false }) {
  return Children.map(children, (child, index) => {
    if (typeof child === "string" || typeof child === "number") {
      if (plain) return <Fragment key={index}>{stripFurigana(String(child))}</Fragment>;
      return <Fragment key={index}>{renderString(String(child), index)}</Fragment>;
    }
    return child;
  });
}

const ICON_PATHS = {
  map: <>
    <path d="M4 6.5 9 4l6 2.5L20 4v13.5L15 20l-6-2.5L4 20Z" />
    <path d="M9 4v13.5M15 6.5V20" />
  </>,
  aquarium: <>
    <path d="M3.5 5.5h17v13h-17zM3.5 9h17" />
    <path d="M8 14c1.6-1.8 4.4-1.8 6 0-1.6 1.8-4.4 1.8-6 0Zm6 0 2-1.5v3z" />
  </>,
  wardrobe: <>
    <path d="M12 5.2a2.2 2.2 0 1 1 2.2-2.2" />
    <path d="m12 5.2-8.5 6.3h17zM7 11.5v7h10v-7" />
  </>,
  settings: <>
    <path d="M5 7h14M5 17h14M8 4v6M16 14v6" />
    <circle cx="8" cy="7" r="2" />
    <circle cx="16" cy="17" r="2" />
  </>,
  keyboard: <>
    <path d="M3 6.5h18v11H3z" />
    <path d="M6.8 10h.4M10.3 10h.4M13.8 10h.4M17.3 10h.4M8.5 14h7" />
  </>,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  close: <>
    <path d="m6 6 12 12M18 6 6 18" />
  </>,
  play: <>
    <path d="M5 12h13M14 8l4 4-4 4" />
  </>,
  coin: <>
    <circle cx="12" cy="12" r="8" />
    <path d="M9.5 9.5c.7-1.4 4.7-1.2 4.7.8 0 2-4.4 1.3-4.4 3.5 0 2 3.9 2.3 4.9.7M12 6.5v11" />
  </>,
};

export function UiIcon({ name, size = 20, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={`ui-icon ${className}`}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {ICON_PATHS[name]}
      </g>
    </svg>
  );
}
