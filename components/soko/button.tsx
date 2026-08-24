import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-transform duration-75 active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
  {
    variants: {
      variant: {
        primary:
          "bg-cream text-bg rounded-full hover:bg-white",
        gold: "bg-gold text-bg rounded-full hover:bg-gold-2",
        ghost:
          "bg-transparent text-cream/90 rounded-full border border-line hover:bg-glass-strong",
        danger: "bg-danger/15 text-danger rounded-full",
        icon: "rounded-full bg-glass border border-line text-cream",
      },
      size: {
        lg: "h-12 px-7 text-[15px]",
        md: "h-11 px-5 text-sm",
        sm: "h-9 px-4 text-sm",
        icon: "size-14",
        iconSm: "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "lg",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
