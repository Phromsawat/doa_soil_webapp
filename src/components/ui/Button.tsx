import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer font-thai font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-[#1b3652] shadow-sm shadow-primary/10",
        accent: "bg-accent text-primary hover:bg-[#43a677] font-semibold shadow-sm shadow-accent/20",
        outline: "border border-slate-200 bg-white hover:bg-slate-50 text-primary",
        ghost: "hover:bg-slate-100 text-primary",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5 rounded-button",
        sm: "h-9 rounded-button px-3.5 text-xs",
        lg: "h-13 rounded-button px-8 text-base",
        icon: "h-11 w-11 rounded-button",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
