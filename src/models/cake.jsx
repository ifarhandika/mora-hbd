import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function Cake({ children, ...groupProps }) {
  const gltf = useLoader(GLTFLoader, "/the_cake_is_a_lie.glb");
  const cakeScene = useMemo(() => gltf.scene?.clone(true) ?? null, [gltf.scene]);

  if (!cakeScene) {
    return null;
  }

  return (
    <group {...groupProps}>
      <primitive object={cakeScene} />
      {children}
    </group>
  );
}
