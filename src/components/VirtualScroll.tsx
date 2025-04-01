import React, { useState, useEffect, useRef } from 'react';

interface VirtualScrollProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  className?: string;
}

export function VirtualScroll<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 5,
  onEndReached,
  endReachedThreshold = 200,
  className = '',
}: VirtualScrollProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [prevItems, setPrevItems] = useState<T[]>([]);
  
  // Detect when items array changes
  useEffect(() => {
    if (items !== prevItems) {
      setPrevItems(items);
    }
  }, [items]);

  // Handle scroll event
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    setScrollTop(currentScrollTop);
    
    // Check if we're near the end to trigger loading more
    if (onEndReached) {
      const scrollHeight = e.currentTarget.scrollHeight;
      const clientHeight = e.currentTarget.clientHeight;
      
      if (scrollHeight - currentScrollTop - clientHeight < endReachedThreshold) {
        onEndReached();
      }
    }
  };
  
  // Calculate visible items for rendering
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + height) / itemHeight) + overscan
  );
  
  // Create an array of only the visible items
  const visibleItems = items.slice(startIndex, endIndex + 1);
  
  // Calculate appropriate padding to maintain scroll position
  const paddingTop = startIndex * itemHeight;
  const paddingBottom = totalHeight - (endIndex + 1) * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height,
        overflow: 'auto',
        position: 'relative',
      }}
      className={`virtual-scroll-container ${className}`}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: paddingTop,
          }}
        />
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: paddingBottom,
          }}
        />
      </div>
    </div>
  );
}