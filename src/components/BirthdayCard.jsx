import { useCursor, useTexture } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DoubleSide, Euler, Quaternion, SRGBColorSpace, Vector3 } from "three"

const CARD_SCALE = 0.25
const CARD_WIDTH = 4 * CARD_SCALE
const CARD_HEIGHT = 3 * CARD_SCALE
const CAMERA_DISTANCE = 0.9
const CAMERA_Y_FLOOR = 0.8
const HOVER_LIFT = 0.04

export function BirthdayCard({
  id,
  image,
  tablePosition,
  tableRotation,
  isActive,
  onToggle,
  children,
}) {
  const groupRef = useRef(null)
  const { camera } = useThree()
  const [isHovered, setIsHovered] = useState(false)

  useCursor(isHovered || isActive, "pointer")

  const texture = useTexture(image)
  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
  }, [texture])

  const defaultPosition = useMemo(
    () => new Vector3(...tablePosition),
    [tablePosition],
  )
  const defaultQuaternion = useMemo(() => {
    const euler = new Euler(...tableRotation)
    return new Quaternion().setFromEuler(euler)
  }, [tableRotation])

  useEffect(() => {
    const group = groupRef.current
    if (!group) {
      return
    }
    group.position.copy(defaultPosition)
    group.quaternion.copy(defaultQuaternion)
  }, [defaultPosition, defaultQuaternion])

  useEffect(() => {
    if (!isActive) {
      setIsHovered(false)
    }
  }, [isActive])

  const tmpPosition = useMemo(() => new Vector3(), [])
  const tmpQuaternion = useMemo(() => new Quaternion(), [])
  const tmpDirection = useMemo(() => new Vector3(), [])
  const cameraOffset = useMemo(() => new Vector3(0, -0.05, 0), [])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) {
      return
    }

    const positionTarget = tmpPosition
    const rotationTarget = tmpQuaternion

    if (isActive) {
      positionTarget.copy(camera.position)
      positionTarget.add(
        tmpDirection
          .copy(camera.getWorldDirection(tmpDirection))
          .multiplyScalar(CAMERA_DISTANCE),
      )
      positionTarget.add(cameraOffset)
      if (positionTarget.y < CAMERA_Y_FLOOR) {
        positionTarget.y = CAMERA_Y_FLOOR
      }

      rotationTarget.copy(camera.quaternion)
    } else {
      positionTarget.copy(defaultPosition)
      if (isHovered) {
        positionTarget.y += HOVER_LIFT
      }
      rotationTarget.copy(defaultQuaternion)
    }

    const lerpAlpha = 1 - Math.exp(-delta * 12)
    const slerpAlpha = 1 - Math.exp(-delta * 10)

    group.position.lerp(positionTarget, lerpAlpha)
    group.quaternion.slerp(rotationTarget, slerpAlpha)
  })

  const handlePointerOver = useCallback(
    (event) => {
      event.stopPropagation()
      if (!isActive) {
        setIsHovered(true)
      }
    },
    [isActive],
  )

  const handlePointerOut = useCallback((event) => {
    event.stopPropagation()
    setIsHovered(false)
  }, [])

  const handlePointerDown = useCallback((event) => {
    event.stopPropagation()
  }, [])

  const handleClick = useCallback(
    (event) => {
      event.stopPropagation()
      onToggle(id)
    },
    [id, onToggle],
  )

  return (
    <group ref={groupRef}>
      <group rotation={[0, 0, 0]}>
        <mesh
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          castShadow
          receiveShadow
        >
          <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
          <meshStandardMaterial
            map={texture}
            roughness={0.35}
            metalness={0.05}
            toneMapped={false}
            emissiveMap={texture}
            emissiveIntensity={1}
          />
        </mesh>
        <mesh position={[0, 0, -0.001]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
          <meshStandardMaterial color="#f7f2ff" />
        </mesh>
        <mesh position={[0, 0, -0.0008]}>
          <planeGeometry args={[CARD_WIDTH * 0.98, CARD_HEIGHT * 0.98]} />
          <meshStandardMaterial
            color="#ffffff"
            side={DoubleSide}
            roughness={1}
            metalness={1}
          />
        </mesh>
        {children}
      </group>
    </group>
  )
}
