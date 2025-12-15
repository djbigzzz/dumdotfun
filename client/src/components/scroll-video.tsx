import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollVideoProps {
  src: string;
  className?: string;
  containerHeight?: string;
}

export function ScrollVideo({ 
  src, 
  className = "", 
  containerHeight = "300vh" 
}: ScrollVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    
    if (!video || !container) return;

    let animationFrame: number;
    let trigger: ScrollTrigger | null = null;

    const handleLoadedMetadata = () => {
      const duration = video.duration;
      
      trigger = ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          if (animationFrame) {
            cancelAnimationFrame(animationFrame);
          }
          
          animationFrame = requestAnimationFrame(() => {
            const targetTime = self.progress * duration;
            if (Math.abs(video.currentTime - targetTime) > 0.1) {
              video.currentTime = targetTime;
            }
          });
        },
      });
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (trigger) {
        trigger.kill();
      }
    };
  }, [src]);

  return (
    <div 
      ref={containerRef} 
      className="relative"
      style={{ height: containerHeight }}
    >
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src={src}
          className={`w-full h-full object-cover ${className}`}
          muted
          playsInline
          preload="auto"
          data-testid="scroll-video"
        />
      </div>
    </div>
  );
}

export function ScrollVideoPlaceholder({ 
  className = "",
  containerHeight = "300vh"
}: { className?: string; containerHeight?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const progress = progressRef.current;
    
    if (!container || !progress) return;

    const trigger = ScrollTrigger.create({
      trigger: container,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        progress.style.width = `${self.progress * 100}%`;
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative"
      style={{ height: containerHeight }}
    >
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-red-950 to-pink-950">
        <div className={`w-full max-w-4xl mx-auto px-8 ${className}`}>
          <div className="space-y-8 text-center">
            <h2 className="text-4xl md:text-6xl font-black text-white">
              Scroll to Experience
            </h2>
            <p className="text-xl text-gray-300">
              Your video will play here as you scroll
            </p>
            
            <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden border-2 border-black">
              <div 
                ref={progressRef}
                className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-none"
                style={{ width: "0%" }}
              />
            </div>
            
            <p className="text-sm text-gray-500">
              Add your video URL to enable scroll-driven playback
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
