import { useLoader, useThree, useFrame } from "@react-three/fiber"
import { useCursor, useTexture } from "@react-three/drei"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import {
  Box3,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
  Quaternion,
  Euler,
  DoubleSide,
} from "three"

const DEFAULT_IMAGE_SCALE = [0.82, 0.82]
const CAMERA_DISTANCE = 1.8
const CAMERA_Y_FLOOR = 0.8
const HOVER_LIFT = 0.04
// Rotation offset to make the frame face the camera straight (flip 180 on Y, and compensate for frame's internal tilt)
const ACTIVE_ROTATION_OFFSET = new Quaternion().setFromEuler(
  new Euler(0.475, Math.PI, 0),
)

export function PictureFrame({
  id,
  image,
  imageScale = DEFAULT_IMAGE_SCALE,
  imageOffset,
  imageInset = 0.01,
  isActive,
  onToggle,
  children,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  ...groupProps
}) {
  const groupRef = useRef(null)
  const { gl, camera } = useThree()
  const [isHovered, setIsHovered] = useState(false)
  const gltf = useLoader(GLTFLoader, "/picture_frame.glb")
  const pictureTexture = useTexture(image)

  useCursor(isHovered || isActive, "pointer")

  pictureTexture.colorSpace = SRGBColorSpace
  const maxAnisotropy =
    typeof gl.capabilities.getMaxAnisotropy === "function"
      ? gl.capabilities.getMaxAnisotropy()
      : 1
  pictureTexture.anisotropy = maxAnisotropy

  const frameScene = useMemo(() => gltf.scene.clone(true), [gltf.scene])

  const { frameSize, frameCenter } = useMemo(() => {
    const box = new Box3().setFromObject(frameScene)
    const size = new Vector3()
    const center = new Vector3()
    box.getSize(size)
    box.getCenter(center)
    return { frameSize: size, frameCenter: center }
  }, [frameScene])

  const scaledImage = useMemo(() => {
    if (Array.isArray(imageScale)) {
      return imageScale
    }
    return [imageScale, imageScale]
  }, [imageScale])

  const [imageScaleX, imageScaleY] = scaledImage

  const imageWidth = frameSize.x * imageScaleX
  const imageHeight = frameSize.y * imageScaleY

  const [offsetX, offsetY, offsetZ] = imageOffset ?? [0, 0.05, -0.27]

  const imagePosition = [
    frameCenter.x + offsetX,
    frameCenter.y + offsetY,
    frameCenter.z + offsetZ,
  ]

  const pictureMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: pictureTexture,
        roughness: 0.3,
        metalness: 0,
        side: DoubleSide,
        emissive: 0xffffff,
        emissiveMap: pictureTexture,
        emissiveIntensity: 0.3,
      }),
    [pictureTexture],
  )

  // Default position and rotation for returning from active state
  const defaultPosition = useMemo(() => new Vector3(...position), [position])
  const defaultQuaternion = useMemo(() => {
    const euler = new Euler(...rotation)
    return new Quaternion().setFromEuler(euler)
  }, [rotation])
  const scaleValue = useMemo(
    () => (typeof scale === "number" ? [scale, scale, scale] : scale),
    [scale],
  )

  useEffect(() => {
    const group = groupRef.current
    if (!group) {
      return
    }
    group.position.copy(defaultPosition)
    group.quaternion.copy(defaultQuaternion)
    group.scale.set(...scaleValue)
  }, [defaultPosition, defaultQuaternion, scaleValue])

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

      // Apply rotation offset so the image faces the camera
      rotationTarget.copy(camera.quaternion).multiply(ACTIVE_ROTATION_OFFSET)
      // Scale up when active for better viewing
      group.scale.lerp(new Vector3(1, 1, 1), 1 - Math.exp(-delta * 12))
    } else {
      positionTarget.copy(defaultPosition)
      if (isHovered) {
        positionTarget.y += HOVER_LIFT
      }
      rotationTarget.copy(defaultQuaternion)
      // Return to original scale
      group.scale.lerp(new Vector3(...scaleValue), 1 - Math.exp(-delta * 12))
    }

    const lerpAlpha = 1 - Math.exp(-delta * 12)
    const slerpAlpha = 1 - Math.exp(-delta * 10)

    group.position.lerp(positionTarget, lerpAlpha)
    group.quaternion.slerp(rotationTarget, slerpAlpha)
  })

  const handlePointerOver = useCallback(
    (event) => {
      event.stopPropagation()
      if (!isActive && onToggle) {
        setIsHovered(true)
      }
    },
    [isActive, onToggle],
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
      if (onToggle) {
        onToggle(id)
      }
    },
    [id, onToggle],
  )

  return (
    <group ref={groupRef} {...groupProps}>
      <group
        rotation={[0.04, 0, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        <primitive object={frameScene} />
        <mesh
          position={imagePosition}
          rotation={[0.435, Math.PI, 0]}
          material={pictureMaterial}
        >
          <planeGeometry args={[imageWidth, imageHeight]} />
        </mesh>
        {children}
      </group>
    </group>
  )
}
