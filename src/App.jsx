import { useState,useRef } from "react";
import Simulation3D from "./components/Simulation3D";
import Charts from "./components/Charts";
import Controls from "./components/Controls";
import ConfirmDialog from "./components/ConfirmDialog";
import PhysicsInput from "./components/PhysicsInput";
import Tabs from "./components/Tabs";
import FormulaPanel from "./components/FormulaPanel";
import { SERIES_COLORS } from "./styles/seriesColors";
import { KAREN_ART, KAREN_BANNER, KAREN_PAGE, KAREN_RULER, KAREN_TIME } from "./styles/karenStyles";
import { useSimulationLoop } from "./hooks/useSimulationLoop";
import {
  handleRecordingStep,
  handlePlaybackStep,
  handlePlaybackSeek,
  trimRecordedDataAfter,
} from "./engine/recordPlayback";
import { calculateDragStep, NUMBER_MOUSE_POINTS_TO_AVERAGE } from "./engine/kinematics1d";
import { compileFormula } from "./engine/evaluateFormula";
import { calculateFormulaStep } from "./engine/formulaMotion";
import { formatNumber } from "./utils/formatNumber";

const FRAME_STEP = 0.1; // seconds moved by one Next/Previous frame click
const PIN_TOLERANCE = 0.05; // seconds: "same time" for Unpin (half a frame step)
const FORMULA_TOOK_OVER = "Formula stopped. You took control.";

function App() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Core simulation state
  const [simulation, setSimulation] = useState({
    position: 0, // Current position (meters)
    velocity: 0, // Current velocity (m/s)
    acceleration: 0, // Current acceleration (m/s²)
    time: 0, // Current simulation time (seconds)
  });

  const [playing, setPlaying] = useState(false);
  // Open tab: "intro" (big scene + sliders) or "charts". Both share the same data, like PhET.
  const [tab, setTab] = useState("intro");
  const isCharts = tab === "charts";
  // Turns true the first time the user opens Playback; stops the "try me" hint
  const [playbackTried, setPlaybackTried] = useState(false);
  // Turns true the first time the user drags a chart; stops the scrub hint
  const [scrubTried, setScrubTried] = useState(false);

  // Data and mode state
  const [data, setData] = useState({
    recordedData: [simulation], // All simulation states
    selectedMode: "record", // 'record' or 'playback'
  });

  // null = not dragging; array of { x: meters, t: wallClockMs } while dragging
  const dragSamples = useRef(null);

  const onDragStep = (sim, frameTime) => {
    const next = calculateDragStep(sim, frameTime, dragSamples.current);
    return {
      simulation: next,
      recordedState: {
        time: next.time,
        position: next.position,
        velocity: next.velocity,
        acceleration: next.acceleration,
      },
    };
  };

  // Is the "Reset everything?" popup open
  const [confirmingReset, setConfirmingReset] = useState(false);

  // The formula panel: open or closed (it stays open in every mode until the user
  // closes it), and the typed text (kept here so it is still there after closing)
  const [formulaPanelOpen, setFormulaPanelOpen] = useState(false);
  const [formulaText, setFormulaText] = useState("");
  // The formula that drives the motion right now: null, or { text, evaluate }.
  // Closing the panel does not stop it. Taking control (drag, typing a value) does.
  const [activeFormula, setActiveFormula] = useState(null);
  const [formulaError, setFormulaError] = useState(null); // why Run did not start
  const [formulaNotice, setFormulaNotice] = useState(null); // why a formula stopped

  const stopFormula = (notice = null) => {
    setActiveFormula(null);
    setFormulaNotice(notice);
    setFormulaError(null);
  };

  // Run: the formula takes over from the current time (the man jumps to where the
  // formula says he is at this time), and the simulation plays.
  const handleFormulaRun = () => {
    const compiled = compileFormula(formulaText);
    if (!compiled.ok) {
      setFormulaError(compiled.error);
      return;
    }
    if (!Number.isFinite(compiled.evaluate(simulation.time))) {
      setFormulaError(`This formula gives no number at t = ${formatNumber(simulation.time, 1)} s.`);
      return;
    }
    setFormulaError(null);
    setFormulaNotice(null);
    trimRecordingToNow();
    setActiveFormula({ text: formulaText.trim(), evaluate: compiled.evaluate });
    setPlaying(true);
  };

  // Stop: the formula ends and the simulation pauses where it is (the recording stays)
  const handleFormulaStop = () => {
    stopFormula("Formula stopped.");
    setPlaying(false);
  };

  // One frame of formula motion. null = the formula gave no number, so it stops.
  const onFormulaStep = (sim, frameTime) => {
    const next = calculateFormulaStep(activeFormula.evaluate, sim, frameTime);
    if (!next) {
      stopFormula(`Formula stopped: it gave no number at t = ${formatNumber(sim.time, 1)} s.`);
      return null;
    }
    return { simulation: next, recordedState: next };
  };

  // Pinned snapshots { name, time, position, velocity, acceleration }: [] / [A] / [A, B]
  const [pins, setPins] = useState([]);
  const pinAtNow = pins.find((p) => Math.abs(p.time - simulation.time) < PIN_TOLERANCE);
  const isPinned = pinAtNow !== undefined;

  useSimulationLoop({
    playing,
    simulation,
    data,
    setSimulation,
    setData,
    setPlaying,
    onRecordStep: handleRecordingStep,
    onPlaybackStep: handlePlaybackStep,
    onDragStep,
    dragSamplesRef: dragSamples,
    formulaActive: activeFormula !== null,
    onFormulaStep,
  });

  // ============================================================================
  // CONTROL FUNCTIONS
  // ============================================================================

  // Reset everything to initial state
  const reset = () => {
    stopFormula();
    setSimulation({
      position: 0,
      velocity: 0,
      acceleration: 0,
      time: 0,
    });
    setPlaying(false);
    setPins([]);
    setData((prev) => ({
      ...prev,
      recordedData: [{ time: 0, position: 0, velocity: 0, acceleration: 0 }],
      selectedMode: "record",
    }));
  };

  // Recording from a past time (after scrubbing back) replaces everything after it, like PhET
  const trimRecordingToNow = () => {
    setData((prev) => ({
      ...prev,
      recordedData: trimRecordedDataAfter(prev.recordedData, simulation.time),
    }));
  };

  // How long the recording is, for the Reset popup text
  const recordedSeconds = data.recordedData[data.recordedData.length - 1].time;

  // Reset All only asks when there is a recording to lose
  const requestReset = () => (data.recordedData.length > 1 ? setConfirmingReset(true) : reset());

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!playing && data.selectedMode === "record") trimRecordingToNow();
    setPlaying(p => !p);
  };

  // Switch between Record and Playback modes
  const switchMode = (mode) => {
    stopFormula();
    setData((prev) => ({ ...prev, selectedMode: mode }));

    if (mode === "playback") {
      setPlaybackTried(true);
      // Switch to playback: reset playback time
      setSimulation(() => ({
        time: 0,
        position: data.recordedData[0].position,
        velocity: data.recordedData[0].velocity,
        acceleration: data.recordedData[0].acceleration,
      }));
      setPlaying(false);
    } else {
      // Switch to record: continue from latest recorded data
      const lastState = data.recordedData[data.recordedData.length - 1];
      setSimulation({
        position: lastState.position,
        velocity: lastState.velocity,
        acceleration: lastState.acceleration,
        time: lastState.time,
      });
      setPlaying(false);
    }
  };

  // Clear all recorded data
  const clearRecordedData = () => {
    stopFormula();
    setPlaying(false);
    setPins([]);
    setData((prev) => ({
      ...prev,
      recordedData: [{ time: 0, position: simulation.position, velocity: simulation.velocity, acceleration: simulation.acceleration }],
      selectedMode: "record",
    }));
    setSimulation((prev) => ({ ...prev, time: 0 }));
  };

  // Press 1: pin A. Press 2: pin B. Press 3: clear both.
  const togglePin = () => {
    if (pins.length < 2) {
      setPins([...pins, { ...simulation, name: pins.length === 0 ? "A" : "B" }]);
    } else {
      setPins([]);
    }
  };

  // On A: go to B. Anywhere else: go to A (same seek as the frame buttons)
  const goToPin = () => {
    const target = pinAtNow === pins[0] && pins[1] ? pins[1] : pins[0];
    handleSeek(target.time);
  };
  // There is some pin that we are not standing on
  const canGoToPin = pins.some((p) => p !== pinAtNow);

  // Handle timeline scrubbing from charts
  const handleSeek = (newTime) => {
    const result = handlePlaybackSeek(data.recordedData, newTime);
    setSimulation(result.simulation);
  };

  // Dragging on a chart: remember it (the hint goes away), then move the time
  const handleScrub = (newTime) => {
    setScrubTried(true);
    handleSeek(newTime);
  };

  // Step playback one frame forward / back (clamped so time never goes below 0)
  const handleNextFrame = () => handleSeek(simulation.time + FRAME_STEP);
  const handlePrevFrame = () => handleSeek(Math.max(0, simulation.time - FRAME_STEP));

  // Handler for simulation parameter changes
  const handleSimulationChange = (changes) => {
    if (activeFormula) stopFormula(FORMULA_TOOK_OVER);
    setSimulation((prev) => ({ ...prev, ...changes }));
    if (simulation.time === 0 && data.selectedMode === 'record') {
      setData((prev) => ({
        ...prev,
        recordedData: [{ ...prev.recordedData[0], ...changes }],
      }));
    }
  };

  const handleManDragStart = () => {
    if (activeFormula) stopFormula(FORMULA_TOOK_OVER);
    dragSamples.current = [];
    trimRecordingToNow();
    setData((prev) => ({ ...prev, selectedMode: "record" }));
    setPlaying(true);
  };

  // Called on every raw mouse reading while dragging. Just records the
  // reading — the smoothing and the actual position/velocity math happen
  // once per frame in onDragStep above, not here.
  const handleManDragSample = (meters) => {
    if (!dragSamples.current) return;
    const next = [...dragSamples.current, { x: meters, t: performance.now() }];
    dragSamples.current = next.slice(-NUMBER_MOUSE_POINTS_TO_AVERAGE);
  };

  const handleManDragEnd = () => {
    dragSamples.current = null;
    setSimulation((prev) => ({ ...prev, velocity: 0, acceleration: 0 }));
  };


  // ============================================================================
  // RENDER - Using refactored components
  // ============================================================================

  // Charts tab: the 3 inputs are beside their charts (Charts puts each in its row).
  // Intro tab: they sit in one row under the scene.
  const inputs = [
    { key: "position", label: "Position", unit: "m" },
    { key: "velocity", label: "Velocity", unit: "m/s" },
    { key: "acceleration", label: "Acceleration", unit: "m/s²" },
  ].map(({ key, label, unit }) => (
    <PhysicsInput
      key={key} id={key} label={label} unit={unit}
      value={simulation[key]} min={-10} max={10}
      color={SERIES_COLORS[key].color} track={SERIES_COLORS[key].track}
      disabled={playing}
      horizontal={!isCharts}
      onChange={(v) => handleSimulationChange({ [key]: v })}
    />
  ));

  const isRecording = data.selectedMode === "record";

  // The panel's message line (an error, if any, is shown first by the panel)
  const formulaStatus = activeFormula
    ? { text: playing ? `Running: x(t) = ${activeFormula.text}` : "Paused. Press Play to continue.", running: playing }
    : !isRecording
      ? { text: "Switch to Record to run a formula.", running: false }
      : formulaNotice
        ? { text: formulaNotice, running: false }
        : null;

  return (
    <div className={`relative min-h-screen lg:h-screen w-full flex flex-col box-border ${KAREN_PAGE.bg} text-gray-800 overflow-x-clip`}>
      {/* Introduction only: bamboo down both sides of the whole page (hidden on phones: no room) */}
      {!isCharts && (
        <>
          <img src={KAREN_ART.bambooLeft} alt="" aria-hidden="true" className="hidden sm:block absolute left-[-12px] top-0 w-[84px] h-full z-[5] pointer-events-none" />
          <img src={KAREN_ART.bambooRight} alt="" aria-hidden="true" className="hidden sm:block absolute right-[-12px] top-0 w-[84px] h-full z-[5] pointer-events-none" />
        </>
      )}
      {/* Top: tab row, then the 3D scene (with the time). Charts tab: short scene. Intro: tall
          (laptops: fills the space left). Phones/tablets: the tab row is above the scene, so its top-left corner
          is square. Laptops: the tabs float on the scene's corner. */}
      <div className={`w-full flex flex-col lg:relative ${
        isCharts
          ? "shrink-0"
          : "flex-1 min-h-[260px] [@media(max-height:600px)]:min-h-[150px] lg:min-h-0"
      }`}>
        <Tabs
          tabs={[
            { id: "intro", label: "Introduction" },
            { id: "charts", label: "Charts" },
          ]}
          selected={tab}
          onSelect={setTab}
        />
        <div className={`relative w-full bg-blue-50 rounded-b-lg rounded-tr-lg lg:rounded-lg ${
          isCharts
            ? "h-[125px] [@media(max-height:600px)]:h-[112px]"
            : "flex-1 min-h-0"
        }`}>
        {/* Introduction only: the scene picture, and the hanging title sign at the top (behind the boy) */}
        {!isCharts && (
          <>
            <img src={KAREN_ART.scene} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover object-bottom rounded-[inherit]" />
            <img src={KAREN_ART.titleBanner} alt="Karen" className={KAREN_BANNER} />
          </>
        )}
        {/* Fills the scene box, so the canvas always gets a real height (Introduction: side room for the bamboo) */}
        <div className={`absolute rounded-[inherit] ${isCharts ? "inset-0" : "inset-x-6 sm:inset-x-[72px] top-[50%] [@media(max-height:600px)]:top-[25%] bottom-[2%]"}`}>
          <Simulation3D
            position={simulation.position}
            velocity={simulation.velocity}
            pins={isCharts ? pins : []}
            tall={!isCharts}
            look={isCharts ? undefined : KAREN_RULER}
            onManDragStart={handleManDragStart}
            onManDragSample={handleManDragSample}
            onManDragEnd={handleManDragEnd}
          />
        </div>

        {/* Time on a woven mat in the scene's top corner: phones/tablets top-left (mat flipped), laptops top-right */}
        <div className={KAREN_TIME.box}>
          <img src={KAREN_ART.timeBackground} alt="" aria-hidden="true" className={KAREN_TIME.mat} />
          <div className={KAREN_TIME.text}>{formatNumber(simulation.time, 1)} s</div>
        </div>

        {/* Mode badge, only while playing: phones/tablets top-right, laptops middle */}
        {playing && (
          <span role="status" className={`absolute top-3 right-8 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 z-10 flex items-center gap-2 text-sm font-bold uppercase tracking-widest ${
            isRecording ? "text-red-600" : "text-blue-600"
          }`}>
            <span className="relative flex h-3 w-3">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping ${
                isRecording ? "bg-red-500" : "bg-blue-500"
              }`} />
              <span className={`relative inline-flex h-3 w-3 rounded-full ${
                isRecording ? "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.7)]" : "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.7)]"
              }`} />
            </span>
            {isRecording ? "Recording" : "Playing back"}
          </span>
        )}
        </div>
      </div>

      {isCharts ? (
        // Middle: charts take all the space that is left (short screens: less padding)
        <div className="flex flex-col w-full px-4 pt-4 pb-2 [@media(max-height:600px)]:pt-2.5 max-lg:[@media(max-height:600px)]:pb-1 lg:pb-0 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
          <Charts
            data={data}
            simulation={simulation}
            pins={pins}
            onSeek={handleScrub}
            showScrubHint={data.selectedMode === "playback" && !scrubTried}
            inputs={inputs}
          />
        </div>
      ) : (
        // Middle: the 3 sliders side by side (phones: one under the other)
        <div className="shrink-0 flex flex-col sm:flex-row gap-2 px-4 sm:px-[72px] py-2">{inputs}</div>
      )}

      {/* Bottom: the toolbar pill, 8px gap under it. Charts: centered under the charts (laptops).
          Introduction: centered on the page. */}
      <div className={`relative z-[6] shrink-0 flex justify-center px-2 sm:px-4 ${isCharts ? "lg:pl-[212px] lg:pr-[64px]" : ""} pb-2 [@media(min-height:700px)]:pb-8 max-lg:mt-auto max-lg:sticky max-lg:bottom-0 max-lg:z-20 ${KAREN_PAGE.stickyBg}`}>
        {/* The rice-field strip behind the bar (it sticks with the bar on phones) */}
        <img src={KAREN_ART.bottomStrip} alt="" aria-hidden="true" className={KAREN_PAGE.strip} />
        <Controls
          simulation={simulation}
          playing={playing}
          data={data}
          playbackTried={playbackTried}
          formulaOpen={formulaPanelOpen}
          isPinned={isPinned}
          pinCount={pins.length}
          canGoToPin={canGoToPin}
          onTogglePin={togglePin}
          onGoToPin={goToPin}
          onModeChange={switchMode}
          onTogglePlayPause={togglePlayPause}
          onNextFrame={handleNextFrame}
          onPrevFrame={handlePrevFrame}
          onReset={requestReset}
          onClearRecordedData={clearRecordedData}
          showPins={isCharts}
          onFormulaClick={() => setFormulaPanelOpen((open) => !open)}
        />
      </div>

      {formulaPanelOpen && (
        <FormulaPanel
          title="Position Formula"
          label="x(t) ="
          example="7 * sin(t) + 2"
          text={formulaText}
          error={formulaError}
          status={formulaStatus}
          running={activeFormula !== null}
          runDisabled={!isRecording}
          onTextChange={(value) => {
            setFormulaText(value);
            setFormulaError(null);
          }}
          onRun={handleFormulaRun}
          onStop={handleFormulaStop}
          onClose={() => setFormulaPanelOpen(false)}
        />
      )}

      {confirmingReset && (
        <ConfirmDialog
          title="Reset all settings?"
          message={
            <>
              Your {formatNumber(recordedSeconds, 1)} s recording will be deleted.
              <span className="block font-semibold text-rose-700">This cannot be undone.</span>
            </>
          }
          confirmLabel="Reset All"
          onConfirm={() => {
            reset();
            setConfirmingReset(false);
          }}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </div>
  );
}

export default App;
