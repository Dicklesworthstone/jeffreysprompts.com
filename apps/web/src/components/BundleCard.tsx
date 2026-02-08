"use client";

import { useState, useCallback, useEffect, useRef, type ComponentType, type MouseEvent } from "react";
import Link from "next/link";
import { Copy, Check, Sparkles, Rocket, Code, FileText, Brain, Zap, Package, Star, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion, useSpring, useMotionTemplate } from "framer-motion";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import type { Bundle, BundleIcon } from "@jeffreysprompts/core/prompts/bundles";
import { useMousePosition } from "@/hooks/useMousePosition";
import { FeaturedContentBadge } from "@/components/featured/staff-pick-badge";

// ============================================================================
// Icon Mapping
// ============================================================================

const iconMap: Record<BundleIcon, ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  rocket: Rocket,
  code: Code,
  "file-text": FileText,
  brain: Brain,
  zap: Zap,
  package: Package,
  star: Star,
};

const buildInstallCommand = (promptIds: string[]) => {
  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://jeffreysprompts.com";
  const params = new URLSearchParams();
  if (promptIds.length > 0) {
    params.set("ids", promptIds.join(","));
  }
  const query = params.toString();
  const url = query ? `${baseUrl}/install.sh?${query}` : `${baseUrl}/install.sh`;
  return `curl -fsSL "${url}" | bash`;
};

interface BundleCardProps {
  bundle: Bundle;
  index?: number;
}

export function BundleCard({ bundle, index = 0 }: BundleCardProps) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { success, error } = useToast();
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  
  const { motionPercentageX, motionPercentageY, handleMouseMove, resetMousePosition } = useMousePosition();

  // Spring configuration for smooth tilt
  const springConfig = { stiffness: 150, damping: 20 };
  const rotateX = useSpring(0, springConfig);
  const rotateY = useSpring(0, springConfig);

  const glowBackground = useMotionTemplate`radial-gradient(circle at ${motionPercentageX}% ${motionPercentageY}%, rgba(139, 92, 246, 0.1), transparent 70%)`;

  useEffect(() => {
    if (!isHovered || prefersReducedMotion) {
      rotateX.set(0);
      rotateY.set(0);
      return;
    }

    const unsubX = motionPercentageX.on("change", () => {
      const rX = (motionPercentageY.get() - 50) / -12;
      const rY = (motionPercentageX.get() - 50) / 12;
      rotateX.set(rX);
      rotateY.set(rY);
    });
    const unsubY = motionPercentageY.on("change", () => {
      const rX = (motionPercentageY.get() - 50) / -12;
      const rY = (motionPercentageX.get() - 50) / 12;
      rotateX.set(rX);
      rotateY.set(rY);
    });

    return () => { unsubX(); unsubY(); };
  }, [isHovered, rotateX, rotateY, motionPercentageX, motionPercentageY, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const IconComponent = bundle.icon ? iconMap[bundle.icon] : Package;

  const handleCopyInstall = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const command = buildInstallCommand(bundle.promptIds);
        const result = await copyToClipboard(command);
        if (!result.success) {
          throw result.error ?? new Error("Clipboard copy failed");
        }
        setCopied(true);
        success("Install command copied", "Ready to paste in your terminal", { duration: 3000 });
        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
        }
        resetTimerRef.current = setTimeout(() => {
          setCopied(false);
          resetTimerRef.current = null;
        }, 2000);
      } catch {
        error("Failed to copy", "Please try again");
      }
    },
    [bundle.promptIds, success, error]
  );

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: prefersReducedMotion ? 0 : Math.min(index * 0.05, 0.25),
        ease: [0.23, 1, 0.32, 1],
      }}
      className="h-full perspective-1000"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        resetMousePosition();
      }}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="h-full"
      >
        <Card
          className={cn(
            "group relative flex flex-col h-full overflow-hidden border-2",
            "bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm",
            "border-neutral-200/50 dark:border-neutral-800/50",
            "transition-all duration-300",
            isHovered ? "shadow-2xl border-violet-500/20 dark:border-violet-400/20" : "shadow-md"
          )}
        >
          {/* Dynamic Glow */}
          {!prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 pointer-events-none z-0"
              style={{ background: glowBackground }}
              animate={{ opacity: isHovered ? 1 : 0 }}
            />
          )}

          <CardHeader className="pb-3 pt-6 relative z-10">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-3">
                <motion.div 
                  animate={isHovered ? { rotate: [0, -10, 10, 0], scale: 1.1 } : { scale: 1, rotate: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="p-3 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shadow-inner"
                >
                  <IconComponent className="w-5 h-5" />
                </motion.div>
                {bundle.featured && (
                  <FeaturedContentBadge size="sm" />
                )}
              </div>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                {bundle.promptIds.length} Prompts
              </Badge>
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors leading-tight">
              {bundle.title}
            </h3>
          </CardHeader>

          <CardContent className="flex-1 pb-4 relative z-10">
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-5 leading-relaxed">
              {bundle.description}
            </p>

            <div className="flex flex-wrap gap-2">
              {bundle.promptIds.slice(0, 3).map((id) => (
                <motion.span
                  key={id}
                  whileHover={{ scale: 1.05 }}
                  className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700"
                >
                  {id}
                </motion.span>
              ))}
              {bundle.promptIds.length > 3 && (
                <span className="text-[10px] font-bold text-neutral-400 px-1 pt-1">
                  +{bundle.promptIds.length - 3} more
                </span>
              )}
            </div>
          </CardContent>

          <CardFooter className="pt-4 pb-6 px-6 mt-auto border-t border-neutral-100 dark:border-neutral-800 relative z-10">
            <div className="w-full space-y-5">
              {bundle.workflow && (
                <div className="relative rounded-xl overflow-hidden bg-neutral-50 dark:bg-black/20 border border-neutral-200/30 dark:border-neutral-800/30 p-4">
                  <p className="font-mono text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap line-clamp-3">
                    {bundle.workflow}
                  </p>
                  <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-neutral-50 dark:from-neutral-900/50 to-transparent pointer-events-none" />
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Version {bundle.version}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 px-4 rounded-full text-xs font-bold transition-all"
                    onClick={handleCopyInstall}
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center">
                          <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                          Copied
                        </motion.div>
                      ) : (
                        <motion.div key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center">
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          Install
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 px-4 rounded-full text-xs font-bold bg-neutral-900 text-white hover:bg-black dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 shadow-lg shadow-neutral-200 dark:shadow-black"
                    asChild
                  >
                    <Link href={"/bundles/" + bundle.id}>
                      View
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default BundleCard;
