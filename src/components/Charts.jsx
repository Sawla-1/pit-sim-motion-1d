import { useMemo, useState } from "react";
import { formatNumber } from "../utils/formatNumber";
import { newItemsStart } from "../utils/newItemsStart";
import { useChartZoom } from "../hooks/useChartZoom";
import { ChartZoomControls, ChartPanel } from "./ChartControls";
import SvgChart from "./SvgChart";
import { SERIES_COLORS } from "../styles/seriesColors";

// Each chart's line as {x, y} points. `old` = the lines for an earlier version
// of the recording: only the new points are turned into {x, y}.
function growSeries(old, recordedData, keys) {
  const from = newItemsStart(old.data, recordedData);
  // Nothing new (like a Play press that trims nothing): keep the same lines,
  // so the charts don't redraw them
  if (from > 0 && from === recordedData.length) return old.byKey;
  const newStates = recordedData.slice(from);
  const result = {};
  for (const key of keys) {
    const added = newStates.map((state) => ({ x: state.time, y: state[key] }));
    result[key] = from > 0 ? old.byKey[key].concat(added) : added;
  }
  return result;
}

// Renders the Position/Velocity/Acceleration line charts, each with its own
// Y-axis zoom/pan and a shared X-axis (time) zoom/pan across all three.
// `inputs` = the 3 input panels (built in App), one shown beside each chart.
// `charts` = [{ key, label }], top to bottom. `key` is the field name in the recorded data.
function Charts({ charts, data, simulation, pins, onSeek, showScrubHint, inputs }) {
  const [hidden, setHidden] = useState({}); // { velocity: true } = that chart is hidden
  // The same array on every render, so the zoom hook can trust it
  const keys = useMemo(() => charts.map((c) => c.key), [charts]);

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
  } = useChartZoom(data, keys);
  const isPlayback = data.selectedMode === "playback";

  // The line for each chart as {x, y} points. Worked out only when the recording
  // changes, and while recording only the new points are added (rebuilding all
  // of them every frame was slow). Same pattern as the ranges in useChartZoom.
  const [lines, setLines] = useState({ data: null, byKey: null });
  let series = lines.byKey;
  if (lines.data !== data.recordedData) {
    series = growSeries(lines, data.recordedData, keys);
    setLines({ data: data.recordedData, byKey: series });
  }

  // Drag on a chart (playback only): seek to the time under the pointer,
  // kept inside the recording.
  const handleScrub = (time) => onSeek(Math.max(0, Math.min(maxTime, time)));

  // All charts share one time axis, so (like PhET) only the lowest visible
  // chart shows the time numbers and time zoom buttons. Before anything is
  // recorded there are no time numbers, so no chart gets the extra room (-1)
  // and all three are the same height.
  const hasRecording = data.recordedData.length > 1;
  const bottomIndex = hasRecording
    ? charts.map(({ key }) => !hidden[key]).lastIndexOf(true)
    : -1;

  // The top visible chart shows the scrub hint
  const topIndex = charts.findIndex(({ key }) => !hidden[key]);

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
        {charts.map(({ key, label }, index) => {
          const yDisabled = getYDisabled(key);
          const isBottom = index === bottomIndex;
          // Record mode always shows the default view (it grows with the data).
          const yWindow = isPlayback ? getYWindow(key) : fitWindow(key);
          return (
            <ChartPanel
              key={key}
              label={label}
              visible={!hidden[key]}
              onShow={() => setHidden({ ...hidden, [key]: false })}
              onHide={() => setHidden({ ...hidden, [key]: true })}
              yControlsProps={{
                onZoomIn: () => handleYZoom(key, 1.2),
                onZoomOut: () => handleYZoom(key, 0.8),
                onPanPositive: () => handleYPan(key, 1),
                onPanNegative: () => handleYPan(key, -1),
                zoomInDisabled: yDisabled.zoomInDisabled,
                zoomOutDisabled: yDisabled.zoomOutDisabled,
                panPositiveDisabled: yDisabled.panUpDisabled,
                panNegativeDisabled: yDisabled.panDownDisabled,
              }}
              showZoomControls={isPlayback}
              xControls={xControls}
              isBottom={isBottom}
              scrubHint={showScrubHint && index === topIndex}
              onReset={() => handleReset(key, isBottom)}
              resetDisabled={isResetDisabled(key, isBottom)}
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
