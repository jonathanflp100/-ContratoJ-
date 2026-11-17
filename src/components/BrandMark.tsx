interface BrandMarkProps {
  inverted?: boolean;
}

export function BrandMark({ inverted = false }: BrandMarkProps) {
  return (
    <div className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          width="28"
          height="28"
          rx="7"
          fill={inverted ? '#FFFFFF' : '#0F2544'}
        />
        <path
          d="M8.5 8.5H15.5L19.5 12.5V19.5C19.5 20.0523 19.0523 20.5 18.5 20.5H8.5C7.94772 20.5 7.5 20.0523 7.5 19.5V9.5C7.5 8.94772 7.94772 8.5 8.5 8.5Z"
          stroke={inverted ? '#0F2544' : '#FFFFFF'}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M11 15L13 17L17 13"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={`text-lg font-bold tracking-tight ${
          inverted ? 'text-white' : 'text-navy-900'
        }`}
      >
        ContratoJá
      </span>
    </div>
  );
}
