import { useEffect } from "react";

export function useReveal() {
  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    reveals.forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, []);
}
