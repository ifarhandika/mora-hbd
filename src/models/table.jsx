import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function Table({ children, ...groupProps }) {
  const gltf = useLoader(GLTFLoader, "/table.glb");
  const tableScene = useMemo(() => gltf.scene?.clone(true) ?? null, [gltf.scene]);

  if (!tableScene) {
    return null;
  }

  return (
    <group {...groupProps}>
      <primitive object={tableScene} />
      {children}
    </group>
  );
}
