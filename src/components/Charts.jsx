import { useState, useMemo } from "react";
import { formatNumber } from "../utils/formatNumber";
import { useChartZoom } from "../hooks/useChartZoom";
import { ChartZoomControls, ChartPanel } from "./ChartControls";
import SvgChart from "./SvgChart";
import { SERIES_COLORS } from "../styles/seriesColors";

// The 3 charts, top to bottom. `key` is the field name in the recorded data.
const CHARTS = [
  { key: "position", label: "Position" },
  { key: "velocity", label: "Velocity" },
  { key: "acceleration", label: "Acceleration" },
];
const CHART_KEYS = CHARTS.map((c) => c.key); // made once, so the zoom hook can trust it

// Renders the Position/Velocity/Acceleration line charts, each with its own
// Y-axis zoom/pan and a shared X-axis (time) zoom/pan across all three.
// `inputs` = the 3 input panels (built in App), one shown beside each chart.
function Charts({ data, simulation, pins, onSeek, showScrubHint, inputs }) {
  const [visibility, setVisibility] = useState({
    position: true,
    velocity: true,
    acceleration: true,
  });

  const {
    maxTime,
    xRange,
    getYWindow,
    fitWindow,
    handleXZoom,
    handleXPan,
    xZoomInDisabled,
    xZoomOutDisabled,
    xPanLeftDisabled,
    xPanRightDisabled,
    handleYZoom,
    handleYPan,
    getYDisabled,
    zoomToPins,
    handleReset,
    isResetDisabled,
  } = useChartZoom(data, CHART_KEYS);
  const isPlayback = data.selectedMode === "playback";

  // The line for each chart as {x, y} points. Only rebuilt when the recording
  // changes (in playback that is never), not on every frame.
  const series = useMemo(() => {
    const result = {};
    for (const { key } of CHARTS) {
      result[key] = data.recordedData.map((state) => ({ x: state.time, y: state[key] }));
    }
    return result;
  }, [data.recordedData]);

  // Drag on a chart (playback only): seek to the time under the pointer,
  // kept inside the recording.
  const handleScrub = (time) => onSeek(Math.max(0, Math.min(maxTime, time)));

  // All charts share one time axis, so (like PhET) only the lowest visible
  // chart shows the time numbers and time zoom buttons. Before anything is
  // recorded there are no time numbers, so no chart gets the extra room (-1)
  // and all three are the same height.
  const hasRecording = data.recordedData.length > 1;
  const bottomIndex = hasRecording
    ? CHARTS.map(({ key }) => visibility[key]).lastIndexOf(true)
    : -1;

  // The top visible chart shows the scrub hint
  const topIndex = CHARTS.findIndex(({ key }) => visibility[key]);

  // Identical across all three charts - the x-axis (time) is shared state,
  // not per-chart - so it's built once here instead of repeated 3x below.
  const xControls = (
    <ChartZoomControls
      axis="x"
      onZoomIn={() => handleXZoom(1.2)}
      onZoomOut={() => handleXZoom(0.8)}
      onPanPositive={() => handleXPan(-1)}
      onPanNegative={() => handleXPan(1)}
      zoomInDisabled={xZoomInDisabled}
      zoomOutDisabled={xZoomOutDisabled}
      panPositiveDisabled={xPanLeftDisabled}
      panNegativeDisabled={xPanRightDisabled}
    />
  );

  return (
      <div
        // Playback: a sideways finger drag scrubs, an up/down swipe still scrolls the page
        className={`flex flex-col gap-1 max-lg:[@media(max-height:600px)]:gap-0.5 lg:gap-0 flex-1 min-h-0 min-w-0 text-gray-700 ${
          isPlayback ? "touch-pan-y" : ""
        }`}
      >
        {CHARTS.map(({ key, label }, index) => {
          const yDisabled = getYDisabled(key, index);
          const isBottom = index === bottomIndex;
          // Record mode always shows the default view (it grows with the data).
          const yWindow = isPlayback ? getYWindow(key, index) : fitWindow(key);
          return (
            <ChartPanel
              key={key}
              label={label}
              visible={visibility[key]}
              onShow={() => setVisibility({ ...visibility, [key]: true })}
              onHide={() => setVisibility({ ...visibility, [key]: false })}
              yControlsProps={{
                onZoomIn: () => handleYZoom(key, index, 1.2),
                onZoomOut: () => handleYZoom(key, index, 0.8),
                onPanPositive: () => handleYPan(index, 1),
                onPanNegative: () => handleYPan(index, -1),
                zoomInDisabled: yDisabled.zoomInDisabled,
                zoomOutDisabled: yDisabled.zoomOutDisabled,
                panPositiveDisabled: yDisabled.panUpDisabled,
                panNegativeDisabled: yDisabled.panDownDisabled,
              }}
              showZoomControls={isPlayback}
              xControls={xControls}
              isBottom={isBottom}
              scrubHint={showScrubHint && index === topIndex}
              onReset={() => handleReset(index, isBottom)}
              resetDisabled={isResetDisabled(index, isBottom)}
              onZoomToPins={() => zoomToPins(pins)}
              zoomToPinsDisabled={pins.length < 2}
              input={inputs[index]}
            >
              <SvgChart
                label={label}
                points={series[key]}
                color={SERIES_COLORS[key].color}
                xMin={isPlayback ? xRange?.min ?? 0 : 0}
                xMax={isPlayback ? xRange?.max ?? maxTime : maxTime}
                yMin={yWindow.min}
                yMax={yWindow.max}
                showXNumbers={isBottom}
                nowX={simulation.time}
                pins={pins.map((pin) => ({
                  name: pin.name,
                  x: pin.time,
                  y: pin[key],
                  text: `(${formatNumber(pin.time, 2)}, ${formatNumber(pin[key], 2)})`,
                }))}
                onScrub={isPlayback ? handleScrub : undefined}
              />
            </ChartPanel>
          );
        })}
      </div>
  );
}

export default Charts;
