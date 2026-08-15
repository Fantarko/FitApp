type BlobBackgroundProps = {
  colors?: [string, string];
};

export default function BlobBackground({
  colors = ["var(--color-primary)", "var(--color-plum)"],
}: BlobBackgroundProps) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="animate-float-slow absolute -top-20 -right-28 h-[520px] w-[520px] opacity-[0.13] md:-right-6"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          d="M45,-58.5C58.4,-49.6,68.8,-35.1,72.6,-18.9C76.4,-2.7,73.6,15.2,65.1,29.6C56.6,44,42.5,54.9,26.7,61.8C10.9,68.6,-6.6,71.5,-22.4,67.2C-38.2,62.9,-52.3,51.4,-61.2,36.6C-70.1,21.8,-73.8,3.7,-70.4,-12.6C-67,-28.9,-56.5,-43.4,-42.9,-52.6C-29.3,-61.8,-14.6,-65.7,1.6,-67.7C17.9,-69.7,35.7,-67.4,45,-58.5Z"
          transform="translate(100 100)"
          fill={colors[0]}
        />
      </svg>
      <svg
        className="animate-float absolute bottom-[-110px] left-[-110px] h-[380px] w-[380px] opacity-[0.11]"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          d="M39.5,-51.6C50.7,-42.6,58.7,-29.6,61.6,-15.3C64.5,-1,63.3,14.6,56.4,27.4C49.5,40.2,36.9,50.2,22.5,56.4C8.1,62.6,-8.1,65,-23.3,60.7C-38.5,56.4,-52.7,45.4,-60.5,31C-68.3,16.6,-69.7,-1.2,-64.6,-16.6C-59.5,-32,-47.9,-45,-34.3,-53.6C-20.7,-62.2,-5.1,-66.4,8.9,-64.4C22.9,-62.4,26.3,-60.6,39.5,-51.6Z"
          transform="translate(100 100)"
          fill={colors[1]}
        />
      </svg>
    </div>
  );
}
