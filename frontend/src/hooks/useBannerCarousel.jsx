import { useEffect, useRef, useState } from 'react';

export default function useBannerCarousel(length) {
  const [activeSlide, setActiveSlide] = useState(0), [dragging, setDragging] = useState(false), [offset, setOffset] = useState(0);
  const gesture = useRef(null), suppressClick = useRef(false);
  const move = direction => setActiveSlide(previous => (previous + direction + length) % length);
  useEffect(() => {
    if (dragging || length < 2) return;
    const timer = setInterval(() => move(1), 6000);
    return () => clearInterval(timer);
  }, [activeSlide, dragging, length]);
  const handlers = pointerHandlers({ gesture, suppressClick, setDragging, setOffset, move });
  return { activeSlide, dragging, offset, handlers };
}

function pointerHandlers({ gesture, suppressClick, setDragging, setOffset, move }) {
  const cancel = () => { gesture.current = null; setDragging(false); setOffset(0); };
  const down = event => {
    suppressClick.current = false;
    if (event.button !== 0 || event.target.closest('a,button,input,select')) return;
    gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId); setDragging(true);
    if (event.pointerType === 'mouse') event.preventDefault();
  };
  const up = event => {
    if (!gesture.current || gesture.current.id !== event.pointerId) return;
    const x = event.clientX - gesture.current.x, y = event.clientY - gesture.current.y;
    suppressClick.current = Math.abs(x) > 8;
    if (Math.abs(x) >= 60 && Math.abs(x) > Math.abs(y) * 1.2) move(x < 0 ? 1 : -1);
    cancel();
  };
  return composeHandlers({ gesture, suppressClick, down, up, cancel, setOffset, move });
}

function composeHandlers({ gesture, suppressClick, down, up, cancel, setOffset, move }) {
  return {
    onPointerDown: down, onPointerUp: up, onPointerCancel: cancel, onLostPointerCapture: cancel,
    onPointerMove: event => {
      if (gesture.current?.id !== event.pointerId) return;
      const x = event.clientX - gesture.current.x, y = event.clientY - gesture.current.y;
      if (Math.abs(y) > Math.abs(x) + 12) { cancel(); return; }
      setOffset(Math.max(-180, Math.min(180, x)));
    },
    onClickCapture: event => {
      if (!suppressClick.current) return;
      suppressClick.current = false; event.preventDefault(); event.stopPropagation();
    },
    onKeyDown: event => {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1);
      }
    },
  };
}
