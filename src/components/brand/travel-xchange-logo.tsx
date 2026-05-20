import { cn } from "@/lib/utils";

type TravelXchangeLogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
};

export function TravelXchangeLogo({
  className,
  markClassName,
  textClassName,
}: TravelXchangeLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <svg
        aria-hidden="true"
        className={cn("h-11 w-12 shrink-0", markClassName)}
        fill="none"
        viewBox="0 0 74 64"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="travel-xchange-mark-gradient"
            x1="14"
            x2="60"
            y1="8"
            y2="56"
          >
            <stop stopColor="#f52968" />
            <stop offset="0.52" stopColor="#ff4f42" />
            <stop offset="1" stopColor="#ffb000" />
          </linearGradient>
        </defs>
        <path
          d="M15 13C27 23 43 37 59 51"
          stroke="url(#travel-xchange-mark-gradient)"
          strokeLinecap="round"
          strokeWidth="13"
        />
        <path
          d="M59 13C47 23 31 37 15 51"
          stroke="url(#travel-xchange-mark-gradient)"
          strokeLinecap="round"
          strokeWidth="13"
        />
        <path
          d="M9 17L17 12M56 53L67 47M56 11L66 7M8 48L18 54"
          stroke="url(#travel-xchange-mark-gradient)"
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>

      <span
        className={cn(
          "grid leading-none text-[#061b4f]",
          textClassName,
        )}
      >
        <span className="text-[1.45rem] font-black tracking-[-0.01em]">
          Travel
        </span>
        <span className="mt-1 text-[0.78rem] font-extrabold uppercase tracking-[0.38em]">
          Xchange
        </span>
      </span>
    </span>
  );
}
