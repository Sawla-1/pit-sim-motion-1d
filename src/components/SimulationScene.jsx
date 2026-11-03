import { useEffect, useRef, useState } from "react";

// The scene (ruler, pins and the man) drawn with SVG. It replaces Simulation3D,
// so it takes the same props:
// position, velocity = the man (meters, meters per second)
// pins = [{ name, position }], tall = Introduction size, look = the ruler colours
// onManDragStart / onManDragSample(meters) / onManDragEnd = the man being dragged
// STEP 1 (skeleton): only the empty SVG and a test line. The parts come in step by step.
function SimulationScene(props) {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Keep `size` equal to the real size on screen (needed to turn meters into pixels)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <svg ref={ref} width="100%" height="100%" className="block rounded-[inherit]">
      {/* TEST ONLY (remove in step 2): a dashed frame and the numbers we measured */}
      <rect x="1" y="1" width={Math.max(size.width - 2, 0)} height={Math.max(size.height - 2, 0)} fill="none" stroke="#1976d2" strokeDasharray="6 4" />
      <text x="8" y="20" fontSize="13" fill="#1976d2">
        {Math.round(size.width)} x {Math.round(size.height)} px, man at {props.position.toFixed(2)} m
      </text>
    </svg>
  );
}

export default SimulationScene;
