import type { CSSProperties, ElementType, ReactNode } from "react";

type RevealProps = {
  as?: ElementType;
  /** Position in a group, for the 60ms stagger (capped at 4). */
  index?: number;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>;

/** Fades and lifts its content in when scrolled into view. Server component; see RevealObserver. */
export function Reveal({ as: Tag = "div", index = 0, className, children, ...rest }: RevealProps) {
  const style = { "--i": Math.min(index, 4) } as CSSProperties;
  return (
    <Tag data-reveal="" className={className} style={style} {...rest}>
      {children}
    </Tag>
  );
}
