import React, { useState, useRef, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function SwipeableRow({
    children,
    onDelete,
    onClick,
}: {
    children: React.ReactNode;
    onDelete: () => void;
    onClick: () => void;
}) {
    const [translateX, setTranslateX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const startX = useRef(0);
    const startY = useRef(0);
    const currentX = useRef(0);
    const isHorizontalSwipe = useRef<boolean | null>(null);
    const DELETE_THRESHOLD = 80;

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        currentX.current = 0;
        isHorizontalSwipe.current = null;
        setIsSwiping(true);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isSwiping) return;
        const diffX = e.touches[0].clientX - startX.current;
        const diffY = e.touches[0].clientY - startY.current;

        if (isHorizontalSwipe.current === null) {
            if (Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
                isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
            }
            return;
        }

        if (!isHorizontalSwipe.current) return;

        const clampedX = Math.min(0, Math.max(diffX, -120));
        currentX.current = clampedX;
        setTranslateX(clampedX);
    }, [isSwiping]);

    const handleTouchEnd = useCallback(() => {
        setIsSwiping(false);
        if (currentX.current < -DELETE_THRESHOLD) {
            setTranslateX(-100);
        } else {
            setTranslateX(0);
        }
    }, []);

    const handleRowClick = useCallback(() => {
        if (translateX < 0) {
            setTranslateX(0);
        } else {
            onClick();
        }
    }, [translateX, onClick]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            style={{ position: 'relative', overflow: 'hidden' }}
        >
            <div
                style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    zIndex: 0,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
            >
                <Trash2 className="w-5 h-5 mr-1" />
                Eliminar
            </div>
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleRowClick}
                style={{
                    transform: `translateX(${translateX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.3s ease',
                    position: 'relative',
                    zIndex: 1,
                    backgroundColor: 'white',
                }}
            >
                {children}
            </div>
        </motion.div>
    );
}
