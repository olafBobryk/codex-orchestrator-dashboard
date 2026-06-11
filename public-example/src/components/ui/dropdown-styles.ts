type DropdownOptionClassOptions = {
  active?: boolean;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  activeClassName?: string;
  selectedClassName?: string;
  disabledClassName?: string;
};

export const dropdownListWrapperClassName = "flex flex-col";
export const dropdownListClassName =
  "flex flex-col max-h-[260px] overflow-y-auto";
export const dropdownEmptyStateClassName = "px-4 py-3";
export const dropdownOptionBaseClassName =
  "flex w-full min-w-0 items-center gap-2.5 !px-[15px] !py-2.5 text-left text-sm transition-colors motion-micro text-foreground/80 hover:!bg-foreground/5";
export const dropdownOptionRadiusClassName =
  "rounded-none first:rounded-t-[9px] last:rounded-b-[9px]";

export function getDropdownOptionClassName({
  active,
  selected,
  disabled,
  className,
  activeClassName,
  selectedClassName,
  disabledClassName,
}: DropdownOptionClassOptions) {
  return [
    dropdownOptionBaseClassName,
    dropdownOptionRadiusClassName,
    selected ? "!bg-foreground/10 !text-foreground" : undefined,
    active && !selected ? "!bg-foreground/5 !text-foreground" : undefined,
    disabled
      ? "cursor-not-allowed opacity-50 hover:bg-transparent"
      : "cursor-pointer",
    className,
    active ? activeClassName : undefined,
    selected ? selectedClassName : undefined,
    disabled ? disabledClassName : undefined,
  ]
    .filter(Boolean)
    .join(" ");
}
