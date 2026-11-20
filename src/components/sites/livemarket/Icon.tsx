import Image from "next/image";

type IconProps = {
  name: string;
  width: number;
  height?: number;
  alt?: string;
  className?: string;
};

/** Renders one of the SVGs extracted from livemarket.pro (public/sites/livemarket/svg). */
export function Icon({ name, width, height = width, alt = "", className }: IconProps) {
  return (
    <Image
      src={`/sites/livemarket/svg/${name}.svg`}
      width={width}
      height={height}
      alt={alt}
      className={className}
      unoptimized
      draggable={false}
    />
  );
}
