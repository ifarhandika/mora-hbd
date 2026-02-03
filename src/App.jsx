import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Environment, OrbitControls } from "@react-three/drei"
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Vector3 } from "three"
import { Candle } from "./models/candle"
import { Cake } from "./models/cake"
import { Table } from "./models/table"
import { PictureFrame } from "./models/pictureFrame"
import { Fireworks } from "./components/Fireworks"
import { BirthdayCard } from "./components/BirthdayCard"

import "./App.css"

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const lerp = (from, to, t) => from + (to - from) * t

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

const CAKE_START_Y = 10
const CAKE_END_Y = 0
const CAKE_DESCENT_DURATION = 3

const TABLE_START_Z = 30
const TABLE_END_Z = 0
const TABLE_SLIDE_DURATION = 0.7
const TABLE_SLIDE_START = CAKE_DESCENT_DURATION - TABLE_SLIDE_DURATION - 0.1

const CANDLE_START_Y = 5
const CANDLE_END_Y = 0
const CANDLE_DROP_DURATION = 1.2
const CANDLE_DROP_START =
  Math.max(CAKE_DESCENT_DURATION, TABLE_SLIDE_START + TABLE_SLIDE_DURATION) +
  1.0

const totalAnimationTime = CANDLE_DROP_START + CANDLE_DROP_DURATION

const ORBIT_TARGET = new Vector3(0, 1, 0)
const ORBIT_INITIAL_RADIUS = 3
const ORBIT_INITIAL_HEIGHT = 1
const ORBIT_INITIAL_AZIMUTH = Math.PI / 2
const ORBIT_MIN_DISTANCE = 2
const ORBIT_MAX_DISTANCE = 8
const ORBIT_MIN_POLAR = Math.PI * 0
const ORBIT_MAX_POLAR = Math.PI / 2

const BACKGROUND_FADE_DURATION = 1
const BACKGROUND_FADE_OFFSET = 0
const BACKGROUND_FADE_END = Math.max(
  CANDLE_DROP_START - BACKGROUND_FADE_OFFSET,
  BACKGROUND_FADE_DURATION,
)
const BACKGROUND_FADE_START = Math.max(
  BACKGROUND_FADE_END - BACKGROUND_FADE_DURATION,
  0,
)

const TYPED_LINES = [
  "✨ hi ✨",
  "",
  "💝 today is your birthday 💝",
  "",
  "🎂 so i made you this",
  "hope you like it 🎁",
  "",
  "💖 ٩(◕‿◕)۶ 💖",
]
const TYPED_CHAR_DELAY = 100
const POST_TYPING_SCENE_DELAY = 1000
const CURSOR_BLINK_INTERVAL = 480

const BIRTHDAY_CARDS = [
  {
    id: "confetti",
    image: "/birthdaycard.png",
    position: [1, 0.081, -2],
    rotation: [-Math.PI / 2, 0, Math.PI / 3],
  },
]

const PICTURE_FRAMES = [
  {
    id: "frame1",
    image: "/image1.jpeg",
    position: [0, 0.735, 3],
    rotation: [0, 5.6, 0],
    scale: 0.75,
  },
  {
    id: "frame2",
    image: "/image2.jpeg",
    position: [0, 0.735, -3],
    rotation: [0, 4.0, 0],
    scale: 0.75,
  },
  {
    id: "frame3",
    image: "/image3.jpeg",
    position: [-1.5, 0.735, 2.5],
    rotation: [0, 5.4, 0],
    scale: 0.75,
  },
  {
    id: "frame4",
    image: "/image4.jpeg",
    position: [-1.5, 0.735, -2.5],
    rotation: [0, 4.2, 0],
    scale: 0.75,
  },
]

function AnimatedScene({
  isPlaying,
  onBackgroundFadeChange,
  onEnvironmentProgressChange,
  candleLit,
  onAnimationComplete,
  cards,
  activeCardId,
  onToggleCard,
  pictureFrames,
  activePictureFrameId,
  onTogglePictureFrame,
}) {
  const cakeGroup = useRef(null)
  const tableGroup = useRef(null)
  const candleGroup = useRef(null)
  const animationStartRef = useRef(null)
  const hasPrimedRef = useRef(false)
  const hasCompletedRef = useRef(false)
  const completionNotifiedRef = useRef(false)
  const backgroundOpacityRef = useRef(1)
  const environmentProgressRef = useRef(0)

  useEffect(() => {
    onBackgroundFadeChange?.(backgroundOpacityRef.current)
    onEnvironmentProgressChange?.(environmentProgressRef.current)
  }, [onBackgroundFadeChange, onEnvironmentProgressChange])

  const emitBackgroundOpacity = (value) => {
    const clamped = clamp(value, 0, 1)
    if (Math.abs(clamped - backgroundOpacityRef.current) > 0.005) {
      backgroundOpacityRef.current = clamped
      onBackgroundFadeChange?.(clamped)
    }
  }

  const emitEnvironmentProgress = (value) => {
    const clamped = clamp(value, 0, 1)
    if (Math.abs(clamped - environmentProgressRef.current) > 0.005) {
      environmentProgressRef.current = clamped
      onEnvironmentProgressChange?.(clamped)
    }
  }

  useFrame(({ clock }) => {
    const cake = cakeGroup.current
    const table = tableGroup.current
    const candle = candleGroup.current

    if (!cake || !table || !candle) {
      return
    }

    if (!hasPrimedRef.current) {
      cake.position.set(0, CAKE_START_Y, 0)
      cake.rotation.set(0, 0, 0)
      table.position.set(0, 0, TABLE_START_Z)
      table.rotation.set(0, 0, 0)
      candle.position.set(0, CANDLE_START_Y, 0)
      candle.visible = false
      hasPrimedRef.current = true
    }

    if (!isPlaying) {
      emitBackgroundOpacity(1)
      emitEnvironmentProgress(0)
      animationStartRef.current = null
      hasCompletedRef.current = false
      completionNotifiedRef.current = false
      return
    }

    if (hasCompletedRef.current) {
      emitBackgroundOpacity(0)
      emitEnvironmentProgress(1)
      if (!completionNotifiedRef.current) {
        completionNotifiedRef.current = true
        onAnimationComplete?.()
      }
      return
    }

    if (animationStartRef.current === null) {
      animationStartRef.current = clock.elapsedTime
    }

    const elapsed = clock.elapsedTime - animationStartRef.current
    const clampedElapsed = clamp(elapsed, 0, totalAnimationTime)

    const cakeProgress = clamp(clampedElapsed / CAKE_DESCENT_DURATION, 0, 1)
    const cakeEase = easeOutCubic(cakeProgress)
    cake.position.y = lerp(CAKE_START_Y, CAKE_END_Y, cakeEase)
    cake.position.x = 0
    cake.position.z = 0
    cake.rotation.y = cakeEase * Math.PI * 2
    cake.rotation.x = 0
    cake.rotation.z = 0

    let tableZ = TABLE_START_Z
    if (clampedElapsed >= TABLE_SLIDE_START) {
      const tableProgress = clamp(
        (clampedElapsed - TABLE_SLIDE_START) / TABLE_SLIDE_DURATION,
        0,
        1,
      )
      const tableEase = easeOutCubic(tableProgress)
      tableZ = lerp(TABLE_START_Z, TABLE_END_Z, tableEase)
    }
    table.position.set(0, 0, tableZ)
    table.rotation.set(0, 0, 0)

    // Candle is always visible with no animation
    candle.visible = true
    candle.position.set(0, CANDLE_END_Y, 0)

    if (clampedElapsed < BACKGROUND_FADE_START) {
      emitBackgroundOpacity(1)
      emitEnvironmentProgress(0)
    } else {
      const fadeProgress = clamp(
        (clampedElapsed - BACKGROUND_FADE_START) / BACKGROUND_FADE_DURATION,
        0,
        1,
      )
      const eased = easeOutCubic(fadeProgress)
      const backgroundOpacity = 1 - eased
      emitBackgroundOpacity(backgroundOpacity)
      emitEnvironmentProgress(1 - backgroundOpacity)
    }

    const animationDone = clampedElapsed >= totalAnimationTime
    if (animationDone) {
      cake.position.set(0, CAKE_END_Y, 0)
      cake.rotation.set(0, 0, 0)
      table.position.set(0, 0, TABLE_END_Z)
      candle.position.set(0, CANDLE_END_Y, 0)
      candle.visible = true
      emitBackgroundOpacity(0)
      emitEnvironmentProgress(1)
      hasCompletedRef.current = true
      if (!completionNotifiedRef.current) {
        completionNotifiedRef.current = true
        onAnimationComplete?.()
      }
    }
  })

  return (
    <>
      <group ref={tableGroup}>
        <Table />
        {pictureFrames.map((frame) => (
          <PictureFrame
            key={frame.id}
            id={frame.id}
            image={frame.image}
            position={frame.position}
            rotation={frame.rotation}
            scale={frame.scale}
            isActive={activePictureFrameId === frame.id}
            onToggle={onTogglePictureFrame}
          />
        ))}
        {cards.map((card) => (
          <BirthdayCard
            key={card.id}
            id={card.id}
            image={card.image}
            tablePosition={card.position}
            tableRotation={card.rotation}
            isActive={activeCardId === card.id}
            onToggle={onToggleCard}
          />
        ))}
      </group>
      <group ref={cakeGroup}>
        <Cake />
        <PictureFrame
          id="cakeFrame"
          image="/image5.jpeg"
          position={[0, 0.45, 0.42]}
          rotation={[0, 0, 0]}
          scale={0.25}
          isActive={activePictureFrameId === "cakeFrame"}
          onToggle={onTogglePictureFrame}
        />
        <Candle isLit={candleLit} scale={0.25} position={[0, 1.1, 0]} />
      </group>
      <group ref={candleGroup}></group>
    </>
  )
}

function ConfiguredOrbitControls() {
  const controlsRef = useRef(null)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    const offset = new Vector3(
      Math.sin(ORBIT_INITIAL_AZIMUTH) * ORBIT_INITIAL_RADIUS,
      ORBIT_INITIAL_HEIGHT,
      Math.cos(ORBIT_INITIAL_AZIMUTH) * ORBIT_INITIAL_RADIUS,
    )
    const cameraPosition = ORBIT_TARGET.clone().add(offset)
    camera.position.copy(cameraPosition)
    camera.lookAt(ORBIT_TARGET)

    const controls = controlsRef.current
    if (controls) {
      controls.target.copy(ORBIT_TARGET)
      controls.update()
    }
  }, [camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={ORBIT_MIN_DISTANCE}
      maxDistance={ORBIT_MAX_DISTANCE}
      minPolarAngle={ORBIT_MIN_POLAR}
      maxPolarAngle={ORBIT_MAX_POLAR}
    />
  )
}

function EnvironmentBackgroundController({ intensity }) {
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    if ("backgroundIntensity" in scene) {
      scene.backgroundIntensity = intensity
    }
  }, [scene, intensity])

  return null
}

export default function App() {
  const [hasStarted, setHasStarted] = useState(false)
  const [backgroundOpacity, setBackgroundOpacity] = useState(1)
  const [environmentProgress, setEnvironmentProgress] = useState(0)
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [sceneStarted, setSceneStarted] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(true)
  const [hasAnimationCompleted, setHasAnimationCompleted] = useState(false)
  const [isCandleLit, setIsCandleLit] = useState(true)
  const [fireworksActive, setFireworksActive] = useState(false)
  const [activeCardId, setActiveCardId] = useState(null)
  const [activePictureFrameId, setActivePictureFrameId] = useState(null)
  const [showReadyQuestion, setShowReadyQuestion] = useState(false)
  const [noClickCount, setNoClickCount] = useState(0)
  const [waitingForSpaceToShowQuestion, setWaitingForSpaceToShowQuestion] =
    useState(false)
  const backgroundAudioRef = useRef(null)

  const NO_CLICK_MESSAGES = [
    "please click yes 🥺",
    "kok kamu ga siap?",
    "ayolah... 🥺",
    "please please please 🙏",
    "tombol no nya aku ilangin dehh biar yes aja 😤",
  ]

  useEffect(() => {
    // const audio = new Audio()
    const audio = new Audio("/PREP - Cheapest Flight.mp3")
    audio.loop = true
    audio.preload = "auto"
    backgroundAudioRef.current = audio
    return () => {
      audio.pause()
      backgroundAudioRef.current = null
    }
  }, [])

  const playBackgroundMusic = useCallback(() => {
    const audio = backgroundAudioRef.current
    if (!audio) {
      return
    }
    if (!audio.paused) {
      return
    }
    audio.currentTime = 0
    void audio.play().catch(() => {
      // ignore play errors (browser might block)
    })
  }, [])

  const typingComplete = currentLineIndex >= TYPED_LINES.length
  const typedLines = useMemo(() => {
    if (TYPED_LINES.length === 0) {
      return [""]
    }

    return TYPED_LINES.map((line, index) => {
      if (typingComplete || index < currentLineIndex) {
        return line
      }
      if (index === currentLineIndex) {
        return line.slice(0, Math.min(currentCharIndex, line.length))
      }
      return ""
    })
  }, [currentCharIndex, currentLineIndex, typingComplete])

  const cursorLineIndex = typingComplete
    ? Math.max(typedLines.length - 1, 0)
    : currentLineIndex
  const cursorTargetIndex = Math.max(
    Math.min(cursorLineIndex, typedLines.length - 1),
    0,
  )

  useEffect(() => {
    if (!hasStarted) {
      setCurrentLineIndex(0)
      setCurrentCharIndex(0)
      setSceneStarted(false)
      setShowReadyQuestion(false)
      setNoClickCount(0)
      setWaitingForSpaceToShowQuestion(false)
      setIsCandleLit(true)
      setFireworksActive(false)
      setHasAnimationCompleted(false)
      return
    }

    if (typingComplete) {
      if (
        !sceneStarted &&
        !showReadyQuestion &&
        !waitingForSpaceToShowQuestion
      ) {
        const handle = window.setTimeout(() => {
          setWaitingForSpaceToShowQuestion(true)
        }, POST_TYPING_SCENE_DELAY)
        return () => window.clearTimeout(handle)
      }
      return
    }

    const currentLine = TYPED_LINES[currentLineIndex] ?? ""
    const handle = window.setTimeout(() => {
      if (currentCharIndex < currentLine.length) {
        setCurrentCharIndex((prev) => prev + 1)
        return
      }

      let nextLineIndex = currentLineIndex + 1
      while (
        nextLineIndex < TYPED_LINES.length &&
        TYPED_LINES[nextLineIndex].length === 0
      ) {
        nextLineIndex += 1
      }

      setCurrentLineIndex(nextLineIndex)
      setCurrentCharIndex(0)
    }, TYPED_CHAR_DELAY)

    return () => window.clearTimeout(handle)
  }, [
    hasStarted,
    currentCharIndex,
    currentLineIndex,
    typingComplete,
    sceneStarted,
    showReadyQuestion,
    waitingForSpaceToShowQuestion,
  ])

  useEffect(() => {
    const handle = window.setInterval(() => {
      setCursorVisible((prev) => !prev)
    }, CURSOR_BLINK_INTERVAL)
    return () => window.clearInterval(handle)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code !== "Space" && event.key !== " ") {
        return
      }
      event.preventDefault()
      if (!hasStarted) {
        playBackgroundMusic()
        setHasStarted(true)
        return
      }
      if (waitingForSpaceToShowQuestion && !showReadyQuestion) {
        setShowReadyQuestion(true)
        return
      }
      if (hasAnimationCompleted && isCandleLit) {
        setIsCandleLit(false)
        setFireworksActive(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    hasStarted,
    hasAnimationCompleted,
    isCandleLit,
    playBackgroundMusic,
    waitingForSpaceToShowQuestion,
    showReadyQuestion,
  ])

  const handleCardToggle = useCallback((id) => {
    setActiveCardId((current) => (current === id ? null : id))
  }, [])

  const handlePictureFrameToggle = useCallback((id) => {
    setActivePictureFrameId((current) => (current === id ? null : id))
  }, [])

  const handleYesClick = useCallback(() => {
    setShowReadyQuestion(false)
    setSceneStarted(true)
  }, [])

  const handleNoClick = useCallback(() => {
    setNoClickCount((prev) => Math.min(prev + 1, NO_CLICK_MESSAGES.length))
  }, [NO_CLICK_MESSAGES.length])

  const isScenePlaying = hasStarted && sceneStarted

  return (
    <div className="App">
      <div
        className="background-overlay"
        style={{
          opacity: showReadyQuestion || sceneStarted ? 0 : backgroundOpacity,
        }}
      >
        <div className="typed-text">
          {typedLines.map((line, index) => {
            const showCursor =
              cursorVisible &&
              index === cursorTargetIndex &&
              (!typingComplete || !sceneStarted)
            return (
              <span className="typed-line" key={`typed-line-${index}`}>
                {line || "\u00a0"}
                {showCursor && (
                  <span aria-hidden="true" className="typed-cursor">
                    _
                  </span>
                )}
              </span>
            )
          })}
        </div>
        {waitingForSpaceToShowQuestion && !showReadyQuestion && (
          <div className="space-hint">press space to continue</div>
        )}
      </div>
      {showReadyQuestion && !sceneStarted && (
        <div className="ready-question-overlay">
          <div className="ready-question-container">
            <h1 className="ready-question-title">
              Are you ready for what's next?
            </h1>
            <div className="ready-question-options">
              <button
                className="ready-option ready-option-yes"
                onClick={handleYesClick}
              >
                <span className="option-emoji">✨</span>
                <span className="option-text">Yes</span>
              </button>
              {noClickCount < NO_CLICK_MESSAGES.length && (
                <>
                  <span className="ready-vs">v.s.</span>
                  <button
                    className="ready-option ready-option-no"
                    onClick={handleNoClick}
                  >
                    <span className="option-emoji">🤔</span>
                    <span className="option-text">No</span>
                  </button>
                </>
              )}
            </div>
            {noClickCount > 0 && (
              <div className="no-click-messages">
                {NO_CLICK_MESSAGES.slice(0, noClickCount).map((msg, idx) => (
                  <p key={idx} className="please-click-yes">
                    {msg}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {hasAnimationCompleted && isCandleLit && (
        <div className="hint-overlay">press space to blow out the candle</div>
      )}
      <Canvas
        gl={{ alpha: true }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#000000", 0)
        }}
      >
        <Suspense fallback={null}>
          <AnimatedScene
            isPlaying={isScenePlaying}
            candleLit={isCandleLit}
            onBackgroundFadeChange={setBackgroundOpacity}
            onEnvironmentProgressChange={setEnvironmentProgress}
            onAnimationComplete={() => setHasAnimationCompleted(true)}
            cards={BIRTHDAY_CARDS}
            activeCardId={activeCardId}
            onToggleCard={handleCardToggle}
            pictureFrames={PICTURE_FRAMES}
            activePictureFrameId={activePictureFrameId}
            onTogglePictureFrame={handlePictureFrameToggle}
          />
          <ambientLight intensity={(1 - environmentProgress) * 0.8} />
          <directionalLight
            intensity={0.5}
            position={[2, 10, 0]}
            color={[1, 0.9, 0.95]}
          />
          <Environment
            files={["/bush_restaurant_4k.exr"]}
            backgroundRotation={[0, 3.3, 0]}
            environmentRotation={[0, 3.3, 0]}
            background
            environmentIntensity={0.1 * environmentProgress}
            backgroundIntensity={0.05 * environmentProgress}
          />
          <EnvironmentBackgroundController
            intensity={0.05 * environmentProgress}
          />
          <Fireworks isActive={fireworksActive} origin={[0, 10, 0]} />
          <ConfiguredOrbitControls />
        </Suspense>
      </Canvas>
    </div>
  )
}
