import { useEffect, useRef, useState } from "react";
import { makeSceneView, GROUND_Y, FIT_HALF_WIDTH } from "../utils/sceneMath";

const MAN_HEIGHT_TALL = 1.7; // Introduction: about 8.5% of the ruler's width, like the mockup
const MAN_HEIGHT_SHORT = 1.2; // Charts: the scene is short, so he is smaller

// The scene (ruler, pins and the man) drawn with SVG. It replaces Simulation3D,
// so it takes the same props:
// position, velocity = the man (meters, meters per second)
// pins = [{ name, position }], tall = Introduction size, look = the ruler colours
// onManDragStart / onManDragSample(meters) / onManDragEnd = the man being dragged
// STEP 2 (world → pixel): only test dots. The parts come in step by step.
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

  const manHeight = props.tall ? MAN_HEIGHT_TALL : MAN_HEIGHT_SHORT;
  const ready = size.width > 0 && size.height > 0;
  const view = ready ? makeSceneView(size.width, size.height, manHeight) : null;

  return (
    <svg ref={ref} width="100%" height="100%" className="block rounded-[inherit]">
      {/* TEST ONLY (remove in step 3): the five points the scene must fit around */}
      {view && (
        <g>
          <rect x="1" y="1" width={size.width - 2} height={size.height - 2} fill="none" stroke="#1976d2" strokeDasharray="6 4" />
          {/* red: world (0, ground) = the middle of the ground line */}
          <circle cx={view.toX(0)} cy={view.toY(GROUND_Y)} r="4" fill="#ff4444" />
          {/* blue: the ruler's far left and far right, ±FIT_HALF_WIDTH on the ground line */}
          <circle cx={view.toX(-FIT_HALF_WIDTH)} cy={view.toY(GROUND_Y)} r="4" fill="#1976d2" />
          <circle cx={view.toX(FIT_HALF_WIDTH)} cy={view.toY(GROUND_Y)} r="4" fill="#1976d2" />
          {/* green: the top of the pin flags and the bottom of the ruler numbers */}
          <circle cx={view.toX(0)} cy={view.toY(view.top)} r="4" fill="#2e7d32" />
          <circle cx={view.toX(0)} cy={view.toY(view.bottom)} r="4" fill="#2e7d32" />
        </g>
      )}
    </svg>
  );
}

export default SimulationScene;
