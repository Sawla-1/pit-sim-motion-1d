import { useState, useRef, useSyncExternalStore } from "react";
import SimulationScene from "./components/SimulationScene";
import Charts from "./components/Charts";
import Controls from "./components/Controls";
import ConfirmDialog from "./components/ConfirmDialog";
import PhysicsInput from "./components/PhysicsInput";
import Tabs from "./components/Tabs";
import FormulaPanel from "./components/FormulaPanel";
import InstallButton from "./components/InstallButton";
import { SERIES_COLORS } from "./styles/seriesColors";
import { KAREN_ART, KAREN_BACKDROP, KAREN_SCENE_FIT, KAREN_BANNER, KAREN_PAGE, KAREN_RULER, KAREN_SCENE_PLACEHOLDER, KAREN_TAB, KAREN_TIME, KAREN_TIME_EDGE, KAREN_TOP_ROW, KAREN_INPUT } from "./styles/karenStyles";
import { useSimulationLoop } from "./hooks/useSimulationLoop";
import { resolvePlaybackState } from "./engine/recordPlayback";
import { calculatePhysicsStep, calculateDragStep } from "./engine/kinematics1d";
import { compileFormula } from "./utils/evaluateFormula";
import { calculateFormulaStep } from "./engine/formulaMotion";
import { formatNumber } from "./utils/formatNumber";
import { installMode, watchInstallMode, openInstallBox } from "./offline/installPrompt";

const FRAME_STEP = 0.1; // seconds moved by one Next/Previous frame click
const PIN_TOLERANCE = 0.05; // seconds: "same time" for Unpin (half a frame step)
const FORMULA_TOOK_OVER = "Formula stopped. You took control.";
// Where everything starts: standing still at 0 (meters, m/s, m/s², seconds)
const START_STATE = { position: 0, velocity: 0, acceleration: 0, time: 0 };
// The 3 quantities, in screen order. `key` is the field name in the simulation state.
// hasArrow = it can be shown as an arrow over the man (a tick box turns it on)
const QUANTITIES = [
  { key: "position", label: "Position", symbol: "x", unit: "m" },
  { key: "velocity", label: "Velocity", symbol: "v", unit: "m/s", hasArrow: true },
  { key: "acceleration", label: "Acceleration", symbol: "a", unit: "m/s²", hasArrow: true },
];
// The arrows are hidden at the start (and after Reset All)
const NO_ARROWS = { velocity: false, acceleration: false };

function App() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Core simulation state
  const [simulation, setSimulation] = useState(START_STATE);

  const [playing, setPlaying] = useState(false);
  // Open tab: "intro" (big scene + sliders) or "charts". Both share the same data, like PhET.
  const [tab, setTab] = useState("intro");
  const isCharts = tab === "charts";
  // What the Install button does: "prompt", "hint" or "none" (see offline/installPrompt.js).
  // The answer lives in the browser, not in React, so React reads it and is told when it changes.
  // The last part is for the build-time first screen: no button there.
  const install = useSyncExternalStore(watchInstallMode, installMode, () => "none");
  // Turns true the first time the user opens Playback; stops the "try me" hint
  const [playbackTried, setPlaybackTried] = useState(false);
  // Turns true the first time the user drags a chart; stops the scrub hint
  const [scrubTried, setScrubTried] = useState(false);
  // Which arrows are shown over the man: { velocity, acceleration } (true = shown)
  const [arrows, setArrows] = useState(NO_ARROWS);

  // Data and mode state
  const [data, setData] = useState({
    recordedData: [simulation], // All simulation states
    selectedMode: "record", // 'record' or 'playback'
  });
  // Record: make data (values can change). Playback: only look at it.
  const isRecording = data.selectedMode === "record";

  // The drag of the man that is going on, or null. Only in Record (Playback only looks,
  // so he can't be dragged there): { mouseX, photos, released }
  //   mouseX = where the mouse is right now (meters)
  //   photos = the mouse photos that calculateDragStep keeps
  //   released = he was let go: the loop stops him in its next frame (see onDragStep).
  //     Not in the let-go handler: a change made there could be overwritten by the loop's next frame.
  // A mode switch, Clear Data or Reset All in the middle of a drag (e.g. a second
  // finger tapping a button) ends the drag: they set it back to null (see stopAll).
  const drag = useRef(null);

  // One frame of dragging: the engine does all the maths and hands back its photos
  const onDragStep = (sim, frameTime) => {
    if (drag.current.released) {
      // Let go: he stops where he is, and the drag ends
      drag.current = null;
      return { ...sim, velocity: 0, acceleration: 0, time: sim.time + frameTime };
    }
    const result = calculateDragStep(sim, frameTime, drag.current.mouseX, drag.current.photos);
    drag.current.photos = result.photos;
    return result.simulation;
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
    if (!next) stopFormula(`Formula stopped: it gave no number at t = ${formatNumber(sim.time, 1)} s.`);
    return next;
  };

  // One frame of Record mode. The man is moved by the mouse (drag), by a
  // formula, or by plain physics, checked in this order.
  const onRecordStep = (sim, frameTime) => {
    if (drag.current) return onDragStep(sim, frameTime);
    if (activeFormula) return onFormulaStep(sim, frameTime);
    return calculatePhysicsStep(sim, frameTime);
  };

  // One frame of Playback: move time on a little, and look up that moment
  const onPlaybackStep = (sim, dat, frameTime) => resolvePlaybackState(dat.recordedData, sim.time + frameTime);

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
    onRecordStep,
    onPlaybackStep,
  });

  // ============================================================================
  // CONTROL FUNCTIONS
  // ============================================================================

  // Stop everything that moves him: a formula, a drag, and the play loop.
  // Reset All, a mode switch and Clear Data all start with this.
  const stopAll = () => {
    stopFormula();
    drag.current = null;
    setPlaying(false);
  };

  // Reset everything to initial state
  const reset = () => {
    stopAll();
    setSimulation(START_STATE);
    setPins([]);
    setArrows(NO_ARROWS);
    setData({
      // A copy, not START_STATE itself: a new first point tells the charts
      // "new recording", so they forget the old zoom (see useChartZoom)
      recordedData: [{ ...START_STATE }],
      selectedMode: "record",
    });
  };

  // How long the recording is, for the Reset popup text
  const recordedSeconds = data.recordedData.at(-1).time;

  // Reset All only asks when there is a recording to lose
  const requestReset = () => (data.recordedData.length > 1 ? setConfirmingReset(true) : reset());

  // Toggle play/pause
  const togglePlayPause = () => setPlaying((p) => !p);

  // Switch between Record and Playback modes
  const switchMode = (mode) => {
    stopAll();
    setData((prev) => ({ ...prev, selectedMode: mode }));
    if (mode === "playback") setPlaybackTried(true);
    // Playback starts at the first recorded point. Record continues from the last.
    const points = data.recordedData;
    setSimulation(mode === "playback" ? points[0] : points.at(-1));
  };

  // Clear all recorded data
  const clearRecordedData = () => {
    stopAll();
    setPins([]);
    // Keep the values he has now, and start the clock again at 0
    const start = { ...simulation, time: 0 };
    setData({ recordedData: [start], selectedMode: "record" });
    setSimulation(start);
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

  // Jump to a time in the recording (chart drag, frame buttons, pins)
  const handleSeek = (newTime) => {
    setSimulation(resolvePlaybackState(data.recordedData, newTime).simulation);
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
    if (simulation.time === 0 && isRecording) {
      setData((prev) => ({
        ...prev,
        recordedData: [{ ...prev.recordedData[0], ...changes }],
      }));
    }
  };

  // Dragging the man (Record only: the scene doesn't let him be dragged in Playback)
  const handleManDragStart = () => {
    if (activeFormula) stopFormula(FORMULA_TOOK_OVER);
    // A new note (an old let-go must not stop this drag). Until the mouse moves, he stays where he is.
    drag.current = { mouseX: simulation.position, photos: [], released: false };
    setPlaying(true);
  };

  // Called on every mouse move while dragging. Only remember where the mouse is;
  // onDragStep above takes one photo of it per frame and does the maths.
  // null = the drag was ended already (e.g. a mode switch), so nothing to do.
  const handleManDragSample = (meters) => {
    if (drag.current) drag.current.mouseX = meters;
  };

  const handleManDragEnd = () => {
    const d = drag.current;
    if (d && playing) {
      d.released = true; // the loop stops him in its next frame
      return;
    }
    // Paused (e.g. the 10-minute limit): the loop isn't running, so end the drag here
    drag.current = null;
    if (d) setSimulation((prev) => ({ ...prev, velocity: 0, acceleration: 0 }));
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Charts tab: the 3 inputs are beside their charts (Charts puts each in its row).
  // Intro tab: they sit in one row under the scene.
  const inputs = QUANTITIES.map(({ key, label, symbol, unit, hasArrow }) => (
    <PhysicsInput
      key={key} id={key} label={label} symbol={symbol} unit={unit}
      value={simulation[key]} min={-10} max={10}
      color={SERIES_COLORS[key].color}
      disabled={playing}
      readOnly={!isRecording} // Playback: only look; change things in Record
      horizontal={!isCharts}
      onChange={(v) => handleSimulationChange({ [key]: v })}
      arrowShown={hasArrow ? arrows[key] : undefined}
      onArrowToggle={hasArrow ? (on) => setArrows((prev) => ({ ...prev, [key]: on })) : undefined}
    />
  ));

  // The pulsing dot that shows the mode while playing: red = recording, blue = playing back
  const statusDot = (
    <span aria-hidden="true" className="relative flex h-3 w-3">
      <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping ${
        isRecording ? "bg-red-500" : "bg-blue-500"
      }`} />
      <span className={`relative inline-flex h-3 w-3 rounded-full ${
        isRecording ? "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.7)]" : "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.7)]"
      }`} />
    </span>
  );

  // The panel's message line (an error, if any, is shown first by the panel)
  const formulaStatus = () => {
    if (activeFormula && playing) return { text: `Running: x(t) = ${activeFormula.text}`, running: true };
    if (activeFormula) return { text: "Paused. Press Play to continue.", running: false };
    if (!isRecording) return { text: "Switch to Record to run a formula.", running: false };
    if (formulaNotice) return { text: formulaNotice, running: false };
    return null;
  };

  return (
    <div className={`relative min-h-svh lg:h-svh w-full flex flex-col box-border ${KAREN_PAGE.bg} text-gray-800 overflow-x-clip`}>
      {/* Introduction only: bamboo down both sides of the whole page (hidden on phones, also turned sideways: no room) */}
      {!isCharts && (
        <>
          <img src={KAREN_ART.bambooLeft} alt="" aria-hidden="true" className="hidden sm:block sideways:hidden absolute left-[-12px] top-0 w-[84px] h-full z-[5] pointer-events-none" />
          <img src={KAREN_ART.bambooRight} alt="" aria-hidden="true" className="hidden sm:block sideways:hidden absolute right-[-12px] top-0 w-[84px] h-full z-[5] pointer-events-none" />
        </>
      )}
      {/* Top: the scene (with the time), with the tabs floating on its top-left corner.
          Charts tab: short scene. Intro: tall (laptops: fills the space left). */}
      <div className={`relative w-full flex flex-col ${
        isCharts
          // Tablets held upright: grows 1 part (see the charts area below)
          ? "shrink-0 tablet-upright:flex-[1_0_auto]"
          : "flex-1 min-h-[260px] [@media(max-height:600px)]:min-h-[150px] lg:min-h-0"
      }`}>
        <div className={KAREN_TAB.row}>
          <Tabs
            tabs={[
              { id: "intro", label: "Intro" },
              { id: "charts", label: "Charts" },
            ]}
            selected={tab}
            onSelect={setTab}
          />
          <InstallButton mode={install} onInstall={openInstallBox} />
        </div>
        <div className={`relative w-full rounded-lg ${
          isCharts
            // Phones/tablets: 32px more on top for the tabs (box-content: the padding adds to the height).
            // Tablets: the scene is 1.5 times taller (188px) for the phone-size boy, and the strip on top
            // is 44px, as tall as the time box, so the pin flags never go under it.
            // 1024px tablets turned sideways: 153px, so the boy and the pins (they fill the room above
            // the ruler) come out at 3/4 size, with no empty space above them.
            // Tablets held upright: it also grows (from 188px) into the free space.
            ? "bg-blue-50 h-[125px] [@media(max-height:600px)]:h-[112px] tablet:h-[188px] tablet-1024:h-[153px] tablet-upright:flex-[1_0_auto] box-content max-lg:pt-8 tablet:pt-11"
            : `${KAREN_SCENE_PLACEHOLDER} flex-1 min-h-0`
        }`}>
        {/* Introduction only: the scene picture, and the hanging title sign at the top (behind the boy) */}
        {!isCharts && (
          <>
            <img src={KAREN_ART.scene} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover object-bottom rounded-[inherit]" />
            <img src={KAREN_ART.titleBanner} alt="Karen" className={KAREN_BANNER} />
          </>
        )}
        {/* Fills the scene box. Charts on phones/tablets: below the 32px strip with the tabs.
            Introduction: the ground stands on the picture's meadow (KAREN_BACKDROP),
            with room at the sides for the bamboo (KAREN_SCENE_FIT).
            Phones and tablets (--phone-look): the phone look (see SimulationScene). Laptops keep their normal size. */}
        <div className={`absolute inset-0 rounded-[inherit] max-lg:[--phone-look:1] tablet:[--phone-look:1] ${isCharts ? "max-lg:top-8 tablet:top-11 tablet-upright:[--fill-room:1]" : KAREN_SCENE_FIT}`}>
          <SimulationScene
            position={simulation.position}
            velocity={simulation.velocity}
            acceleration={simulation.acceleration}
            arrows={arrows}
            pins={isCharts ? pins : []}
            tall={!isCharts}
            look={isCharts ? undefined : KAREN_RULER}
            backdrop={isCharts ? undefined : KAREN_BACKDROP}
            canDrag={isRecording}
            onManDragStart={handleManDragStart}
            onManDragSample={handleManDragSample}
            onManDragEnd={handleManDragEnd}
          />
        </div>

        {/* The top row: the mode badge (only while playing) and the time box at the right end */}
        <div className={KAREN_TOP_ROW}>
          {/* Mode badge: laptops left of the time box. Phones and tablets: only for screen readers (the
              words would block the boy or the title sign), so the dot is in the time box instead */}
          {playing && (
            <span role="status" className={`flex items-center gap-2 text-sm font-bold uppercase tracking-widest max-lg:sr-only ${
              isRecording ? "text-red-600" : "text-blue-600"
            }`}>
              {statusDot}
              {isRecording ? "Recording" : "Playing back"}
            </span>
          )}
          <div className={`${KAREN_TIME} ${isRecording ? KAREN_TIME_EDGE.record : KAREN_TIME_EDGE.playback}`}>
            {playing && <span className="hidden max-lg:flex mr-1.5">{statusDot}</span>}
            {formatNumber(simulation.time, 1)} s
          </div>
        </div>
        </div>
      </div>

      {isCharts ? (
        // Middle: charts take all the space that is left (short screens: less padding).
        // Tablets held upright: it shares the free space with the scene, 3 parts to 1 (one part per
        // chart), so the scene and each chart grow the same and there is no empty gap.
        <div className="flex flex-col w-full px-4 pt-4 pb-2 [@media(max-height:600px)]:pt-2.5 max-lg:[@media(max-height:600px)]:pb-1 tablet-upright:flex-[3_0_auto] lg:pb-0 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
          <Charts
            charts={QUANTITIES}
            data={data}
            simulation={simulation}
            pins={pins}
            onSeek={handleScrub}
            showScrubHint={!isRecording && !scrubTried}
            inputs={inputs}
          />
        </div>
      ) : (
        // Middle: the 3 sliders side by side (phones: one line each, see KAREN_INPUT)
        <div className={KAREN_INPUT.area}>{inputs}</div>
      )}

      {/* Bottom: the toolbar. Phones and tablets: full width on the screen's bottom edge.
          Laptops: a pill centered on the page (one row), with a gap under it. */}
      <div className={`relative z-[6] shrink-0 flex justify-center ${KAREN_PAGE.barWrap} max-lg:mt-auto max-lg:sticky max-lg:bottom-0 max-lg:z-20 ${KAREN_PAGE.stickyBg}`}>
        {/* The rice-field strip behind the bar (laptops only) */}
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
          compact={isCharts}
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
          status={formulaStatus()}
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
