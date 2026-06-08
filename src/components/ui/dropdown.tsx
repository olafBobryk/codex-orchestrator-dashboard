/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect */
// Adapted from webvizion-template/src/components/ui/primitives/Dropdown.tsx.
"use client";

import { AnimatePresence, motion, type Transition } from "motion/react";
import { ChevronDown } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

export type DropdownTriggerRenderProps = {
  ref: React.Ref<HTMLElement>;
  isOpen: boolean;
  isPinned: boolean;
  className?: string;

  // root mouse events (for hover open/close)
  onRootMouseEnter: () => void;
  onRootMouseLeave: () => void;

  // click handlers (already wired to pin/open behavior)
  onLeftClick?: (event: React.MouseEvent) => void;
  onRightClick: (event: React.MouseEvent) => void;

  // programmatic controls
  openMenu: (options?: { focusMenu?: boolean; pin?: boolean }) => void;
  closeMenu: (options?: { restoreFocus?: boolean }) => void;

  // built-in chevron icon you can use anywhere in the trigger
  chevronIcon: React.ReactNode;
};

type DropdownProps = {
  renderTrigger: (props: DropdownTriggerRenderProps) => React.ReactNode;
  renderMenu: (helpers: {
    close: (options?: { restoreFocus?: boolean }) => void;
  }) => React.ReactNode;
  /**
   * Optional handler for the "left" part of the trigger (e.g. your label).
   * Behavior is the same as before: clicking left side pins + opens, then calls onLeftClick.
   */
  onLeftClick?: () => void;
  className?: string;
  menuClassName?: string;
  portalTargetId?: string;
  menuWidth?: number | "trigger";
  menuMinWidth?: number;
  align?: "start" | "end";
  side?: "top" | "bottom";
  offset?: number;
  positionStrategy?: "fixed" | "absolute";
  disabled?: boolean;
  open?: boolean;
  openOnHover?: boolean;
  pinOnClick?: boolean;
  disableWhenReducedMotion?: boolean;
  autoFocusMenu?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type DropdownSide = NonNullable<DropdownProps["side"]>;

const DEFAULT_MENU_MIN_WIDTH = 220;
const COLLISION_PADDING = 16;

const disclosureTransition: Transition = {
  duration: 0.26,
  ease: [0.16, 1, 0.3, 1],
};

const DEFAULT_CHEVRON_ICON = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <ChevronDown
      data-is-open={isOpen}
      className="h-3.5 w-3.5 transition-transform motion-micro data-[is-open=true]:rotate-180"
    />
  );
};

function resolveDropdownSide({
  preferredSide,
  measuredHeight,
  availableAbove,
  availableBelow,
}: {
  preferredSide: DropdownSide;
  measuredHeight: number;
  availableAbove: number;
  availableBelow: number;
}): DropdownSide {
  const preferredAvailable =
    preferredSide === "top" ? availableAbove : availableBelow;
  const oppositeSide = preferredSide === "top" ? "bottom" : "top";
  const oppositeAvailable =
    oppositeSide === "top" ? availableAbove : availableBelow;

  if (measuredHeight <= preferredAvailable) {
    return preferredSide;
  }

  if (oppositeAvailable > preferredAvailable) {
    return oppositeSide;
  }

  return preferredSide;
}

export function Dropdown({
  renderTrigger,
  renderMenu,
  onLeftClick,
  className,
  menuClassName,
  portalTargetId,
  menuWidth,
  menuMinWidth = DEFAULT_MENU_MIN_WIDTH,
  align = "end",
  side = "bottom",
  offset = 8,
  positionStrategy = "absolute",
  disabled,
  open,
  openOnHover = true,
  pinOnClick = openOnHover,
  disableWhenReducedMotion = true,
  autoFocusMenu = true,
  onOpenChange,
}: DropdownProps) {
  const motionAllowed = useMotionAllowed(disableWhenReducedMotion);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [isPinned, setIsPinned] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const rootRef = React.useRef<HTMLElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>();
  const [resolvedSide, setResolvedSide] = React.useState<DropdownSide>(side);
  const hoverTimeoutRef = React.useRef<number | null>(null);
  const lastOpenMethodRef = React.useRef<"keyboard" | "pointer" | null>(null);
  const isOpenControlled = open !== undefined;
  const isOpen = open ?? uncontrolledOpen;

  const setOpenState = React.useCallback(
    (next: boolean) => {
      if (!isOpenControlled) {
        setUncontrolledOpen(next);
      }

      onOpenChange?.(next);
    },
    [isOpenControlled, onOpenChange]
  );

  React.useEffect(() => {
    if (!isOpen && isPinned) {
      setIsPinned(false);
    }
  }, [isOpen, isPinned]);

  const focusableSelector =
    'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

  const isFocusableElement = React.useCallback((element: HTMLElement) => {
    if (!element.matches(focusableSelector)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    const isDisabled =
      (element as HTMLButtonElement).disabled ||
      element.getAttribute("aria-disabled") === "true";

    return (
      style.visibility !== "hidden" && style.display !== "none" && !isDisabled
    );
  }, []);

  const getFocusableElements = React.useCallback(() => {
    return Array.from(
      document.querySelectorAll<HTMLElement>(focusableSelector)
    ).filter((element) => {
      const style = window.getComputedStyle(element);
      const isDisabled =
        (element as HTMLButtonElement).disabled ||
        element.getAttribute("aria-disabled") === "true";

      return (
        style.visibility !== "hidden" && style.display !== "none" && !isDisabled
      );
    });
  }, []);

  const getTriggerFocusable = React.useCallback(() => {
    if (!rootRef.current) {
      return null;
    }

    if (isFocusableElement(rootRef.current)) {
      return rootRef.current;
    }

    return rootRef.current.querySelector<HTMLElement>(focusableSelector);
  }, [isFocusableElement]);

  const focusTrigger = React.useCallback(
    (options?: { preventScroll?: boolean }) => {
      const focusTarget = getTriggerFocusable();
      focusTarget?.focus({ preventScroll: options?.preventScroll });
    },
    [getTriggerFocusable]
  );

  const getMenuFocusableElements = React.useCallback(() => {
    if (!menuRef.current) {
      return [];
    }

    return Array.from(
      menuRef.current.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => {
      const style = window.getComputedStyle(element);
      const isDisabled =
        (element as HTMLButtonElement).disabled ||
        element.getAttribute("aria-disabled") === "true";

      return (
        style.visibility !== "hidden" && style.display !== "none" && !isDisabled
      );
    });
  }, []);

  const focusRelativeToTrigger = React.useCallback(
    (direction: "next" | "prev") => {
      const focusables = getFocusableElements();
      const triggerFocusable = getTriggerFocusable();

      if (!triggerFocusable) {
        return;
      }

      const triggerIndex = focusables.indexOf(triggerFocusable);

      if (triggerIndex === -1) {
        return;
      }

      const nextIndex =
        direction === "next" ? triggerIndex + 1 : triggerIndex - 1;
      const nextTarget = focusables[nextIndex];
      nextTarget?.focus({ preventScroll: true });
    },
    [getFocusableElements, getTriggerFocusable]
  );

  const clearHoverTimeout = React.useCallback(() => {
    if (hoverTimeoutRef.current != null) {
      window.clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = null;
  }, []);

  const scheduleClose = React.useCallback(() => {
    clearHoverTimeout();
    hoverTimeoutRef.current = window.setTimeout(() => {
      if (!isPinned) {
        setOpenState(false);
      }
    }, 120);
  }, [clearHoverTimeout, isPinned, setOpenState]);

  const openMenu = React.useCallback(
    (options?: { focusMenu?: boolean; pin?: boolean }) => {
      if (disabled) {
        return;
      }

      lastOpenMethodRef.current = options?.focusMenu ? "keyboard" : "pointer";
      setOpenState(true);

      if (typeof options?.pin === "boolean") {
        setIsPinned(options.pin);
      }
    },
    [disabled, setOpenState]
  );

  const closeMenu = React.useCallback(
    (options?: { restoreFocus?: boolean }) => {
      const restoreFocus = options?.restoreFocus ?? true;
      clearHoverTimeout();
      setOpenState(false);
      setIsPinned(false);

      if (restoreFocus) {
        focusTrigger({ preventScroll: true });
      }
    },
    [clearHoverTimeout, focusTrigger, setOpenState]
  );

  const handleRootMouseEnter = () => {
    if (!openOnHover || disabled) {
      return;
    }

    clearHoverTimeout();

    if (!isPinned) {
      openMenu();
    }
  };

  const handleRootMouseLeave = () => {
    if (!openOnHover || disabled) {
      return;
    }

    if (!isPinned) {
      scheduleClose();
    }
  };

  const handleLeftClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (disabled) {
      return;
    }

    lastOpenMethodRef.current = event.detail === 0 ? "keyboard" : "pointer";
    setIsPinned(true);
    setOpenState(true);
    onLeftClick?.();
  };

  const handleRightClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (disabled) {
      return;
    }

    lastOpenMethodRef.current = event.detail === 0 ? "keyboard" : "pointer";

    if (openOnHover && pinOnClick) {
      setIsPinned((previous) => {
        const next = !previous;
        setOpenState(next);
        return next;
      });
      return;
    }

    setIsPinned(false);
    setOpenState(!isOpen);
  };

  const calculateMenuPosition = React.useCallback(() => {
    if (!rootRef.current) {
      return;
    }

    const rect = rootRef.current.getBoundingClientRect();
    const explicitWidth = menuWidth === "trigger" ? rect.width : menuWidth;
    const resolvedMinWidth =
      explicitWidth ?? (menuWidth === "trigger" ? rect.width : menuMinWidth);
    const measuredWidth =
      explicitWidth ??
      menuRef.current?.getBoundingClientRect().width ??
      resolvedMinWidth;
    const measuredHeight =
      menuRef.current?.scrollHeight ??
      menuRef.current?.getBoundingClientRect().height ??
      0;
    const availableAbove = Math.max(0, rect.top - offset - COLLISION_PADDING);
    const availableBelow = Math.max(
      0,
      window.innerHeight - rect.bottom - offset - COLLISION_PADDING
    );
    const nextSide = resolveDropdownSide({
      preferredSide: side,
      measuredHeight,
      availableAbove,
      availableBelow,
    });
    const availableHeight =
      nextSide === "top" ? availableAbove : availableBelow;
    const constrainedHeight =
      measuredHeight > availableHeight ? availableHeight : undefined;
    const renderedHeight = constrainedHeight ?? measuredHeight;

    setResolvedSide(nextSide);

    if (positionStrategy === "fixed") {
      const viewportWidth = window.innerWidth;
      let left = align === "end" ? rect.right - measuredWidth : rect.left;
      const maxLeft = Math.max(
        COLLISION_PADDING,
        viewportWidth - measuredWidth - COLLISION_PADDING
      );
      left = Math.min(Math.max(left, COLLISION_PADDING), maxLeft);
      const top =
        nextSide === "top"
          ? Math.max(COLLISION_PADDING, rect.top - renderedHeight - offset)
          : Math.max(
              COLLISION_PADDING,
              Math.min(
                rect.bottom + offset,
                window.innerHeight - COLLISION_PADDING - renderedHeight
              )
            );

      setMenuStyle({
        position: "fixed",
        top,
        left,
        zIndex: 90,
        width: explicitWidth,
        minWidth: resolvedMinWidth,
        maxHeight: constrainedHeight,
        overflowY: constrainedHeight === undefined ? undefined : "auto",
      });
      return;
    }

    if (!wrapperRef.current) {
      return;
    }

    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const wrapperWidth = wrapperRect.width;
    const rawLeft =
      align === "end"
        ? rect.right - wrapperRect.left - measuredWidth
        : rect.left - wrapperRect.left;
    const clampedLeft = Math.max(
      0,
      Math.min(rawLeft, Math.max(0, wrapperWidth - measuredWidth))
    );
    const top =
      nextSide === "top" ? undefined : rect.bottom - wrapperRect.top + offset;
    const bottom =
      nextSide === "top"
        ? Math.max(0, wrapperRect.bottom - rect.top + offset)
        : undefined;

    setMenuStyle({
      position: "absolute",
      top,
      bottom,
      left: clampedLeft,
      zIndex: 90,
      width: explicitWidth,
      minWidth: resolvedMinWidth,
      maxHeight: constrainedHeight,
      overflowY: constrainedHeight === undefined ? undefined : "auto",
    });
  }, [align, menuMinWidth, menuWidth, offset, positionStrategy, side]);

  React.useEffect(() => {
    if (isOpen) {
      calculateMenuPosition();
    } else {
      setMenuStyle(undefined);
      setResolvedSide(side);
    }
  }, [isOpen, calculateMenuPosition, side]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (
      autoFocusMenu &&
      menuRef.current &&
      lastOpenMethodRef.current === "keyboard"
    ) {
      const focusTarget = menuRef.current.querySelector<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      focusTarget?.focus({ preventScroll: true });
    }

    const handleResize = () => calculateMenuPosition();
    window.addEventListener("resize", handleResize);

    if (positionStrategy === "fixed") {
      window.addEventListener("scroll", handleResize, true);
    }

    return () => {
      window.removeEventListener("resize", handleResize);

      if (positionStrategy === "fixed") {
        window.removeEventListener("scroll", handleResize, true);
      }
    };
  }, [isOpen, calculateMenuPosition, autoFocusMenu, positionStrategy]);

  React.useEffect(() => {
    if (!isOpen && !isPinned) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        closeMenu({ restoreFocus: false });
      }
    };
    const handleFocusOutside = (event: FocusEvent) => {
      const target = event.target as Node;

      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        closeMenu({ restoreFocus: false });
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu({ restoreFocus: true });
        return;
      }

      if (event.key !== "Tab" || !menuRef.current) {
        return;
      }

      const active = document.activeElement as HTMLElement | null;

      if (!active || !menuRef.current.contains(active)) {
        return;
      }

      const menuFocusables = getMenuFocusableElements();

      if (menuFocusables.length === 0) {
        return;
      }

      const first = menuFocusables[0];
      const last = menuFocusables[menuFocusables.length - 1];

      if (event.shiftKey && active === first) {
        event.preventDefault();
        closeMenu({ restoreFocus: false });
        focusRelativeToTrigger("prev");
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        closeMenu({ restoreFocus: false });
        focusRelativeToTrigger("next");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("focusin", handleFocusOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("focusin", handleFocusOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    closeMenu,
    isOpen,
    isPinned,
    getMenuFocusableElements,
    focusRelativeToTrigger,
  ]);

  const setMenuNode = React.useCallback(
    (node: HTMLDivElement | null) => {
      menuRef.current = node;

      if (node && isOpen) {
        calculateMenuPosition();
      }
    },
    [isOpen, calculateMenuPosition]
  );

  const baseMenuClassName = [
    "min-w-[220px] w-fit rounded-[10px] bg-background border border-border shadow-[2px_4px_15px_-2px_rgba(1,1,3,0.05)] z-[91] overflow-hidden",
    positionStrategy === "fixed" ? "fixed" : "absolute",
  ]
    .filter(Boolean)
    .join(" ");
  const resolvedMenuClassName = [baseMenuClassName, menuClassName]
    .filter(Boolean)
    .join(" ");
  const menuMotionY = resolvedSide === "top" ? 6 : -6;
  const menuNode = motionAllowed ? (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          ref={setMenuNode}
          key="dropdown-menu"
          initial={{ opacity: 0, y: menuMotionY }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: menuMotionY }}
          transition={disclosureTransition}
          style={menuStyle}
          className={resolvedMenuClassName}
          onMouseEnter={clearHoverTimeout}
          onMouseLeave={() => {
            if (!isPinned && openOnHover) {
              scheduleClose();
            }
          }}
        >
          {renderMenu({ close: closeMenu })}
        </motion.div>
      ) : null}
    </AnimatePresence>
  ) : isOpen ? (
    <div
      ref={setMenuNode}
      key="dropdown-menu"
      style={menuStyle}
      className={resolvedMenuClassName}
      onMouseEnter={clearHoverTimeout}
      onMouseLeave={() => {
        if (!isPinned && openOnHover) {
          scheduleClose();
        }
      }}
    >
      {renderMenu({ close: closeMenu })}
    </div>
  ) : null;

  return (
    <div
      ref={wrapperRef}
      className={
        positionStrategy === "absolute" ? "relative max-w-full" : undefined
      }
    >
      {renderTrigger({
        ref: rootRef,
        isOpen,
        isPinned,
        className,
        onRootMouseEnter: handleRootMouseEnter,
        onRootMouseLeave: handleRootMouseLeave,
        onLeftClick: onLeftClick ? handleLeftClick : undefined,
        onRightClick: handleRightClick,
        openMenu,
        closeMenu,
        chevronIcon: <DEFAULT_CHEVRON_ICON isOpen={isOpen} />,
      })}

      {positionStrategy === "fixed" ? (
        <Portal target={portalTargetId}>{menuNode}</Portal>
      ) : (
        menuNode
      )}
    </div>
  );
}

function Portal({
  children,
  target,
}: {
  children: React.ReactNode;
  target?: string;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const defaultTarget = document.body;
  const portalTarget = target
    ? (document.getElementById(target) ?? defaultTarget)
    : defaultTarget;

  return createPortal(children, portalTarget);
}

function useMotionAllowed(disableWhenReduced: boolean) {
  const [allowed, setAllowed] = React.useState(true);

  React.useEffect(() => {
    if (!disableWhenReduced) {
      setAllowed(true);
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & {
        connection?: {
          saveData?: boolean;
          addEventListener?: (type: "change", listener: () => void) => void;
          removeEventListener?: (type: "change", listener: () => void) => void;
        };
      }
    ).connection;

    const compute = () => {
      const prefersReduce = media.matches;
      const saveData = Boolean(connection?.saveData);
      setAllowed(!(prefersReduce || saveData));
    };

    compute();
    media.addEventListener("change", compute);
    connection?.addEventListener?.("change", compute);

    return () => {
      media.removeEventListener("change", compute);
      connection?.removeEventListener?.("change", compute);
    };
  }, [disableWhenReduced]);

  return allowed;
}
