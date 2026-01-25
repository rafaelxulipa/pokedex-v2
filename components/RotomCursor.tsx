import React, { useEffect, useRef } from 'react';

const RotomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Only activate on devices with a mouse (not touch)
    if (window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    const moveCursor = (e: MouseEvent) => {
      if (cursorRef.current) {
        // Adding a slight offset so it doesn't cover the exact click point
        const x = e.clientX + 15;
        const y = e.clientY + 15;
        
        // Direct DOM manipulation for performance (avoiding React render loop)
        cursorRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    };

    window.addEventListener('mousemove', moveCursor);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
    };
  }, []);

  return (
    <img
      ref={cursorRef}
      src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/479.png"
      alt="Rotom Cursor"
      className="fixed top-0 left-0 w-16 h-16 pointer-events-none z-[9999] hidden md:block transition-transform duration-100 ease-out filter drop-shadow-lg"
      style={{ willChange: 'transform' }}
    />
  );
};

export default RotomCursor;
