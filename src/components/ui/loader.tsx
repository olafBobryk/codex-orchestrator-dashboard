import { LoaderCircle } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

const loaderVariants = cva(
  "shrink-0 animate-spin text-muted-foreground",
  {
    variants: {
      size: {
        sm: "size-3.5",
        default: "size-4",
        lg: "size-5",
      },
      surface: {
        transparent: "",
        filled: "rounded-full bg-background",
        "sidebar-collapsed":
          "group-data-[collapsed=true]/sidebar:rounded-full group-data-[collapsed=true]/sidebar:bg-sidebar",
      },
    },
    defaultVariants: {
      size: "default",
      surface: "transparent",
    },
  }
)

function Loader({
  className,
  size,
  surface,
  "aria-label": ariaLabel = "Loading",
  ...props
}: ComponentProps<typeof LoaderCircle> & VariantProps<typeof loaderVariants>) {
  return (
    <LoaderCircle
      data-slot="loader"
      aria-label={ariaLabel}
      className={cn(loaderVariants({ size, surface, className }))}
      {...props}
    />
  )
}

export { Loader, loaderVariants }
