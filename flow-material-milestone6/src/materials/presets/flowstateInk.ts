import * as THREE from 'three';
import { MaterialDefinition } from '../MaterialDefinition';

/**
 * The first concrete Flowstate palette. Near-black base; color exists only
 * where energy is present, and only in proportion to how much. These scale
 * values are tuned against the default Simulation config's force magnitudes
 * (see core/Simulation.ts DEFAULT_SIMULATION_CONFIG) — if splat strength or
 * curl strength changes materially, revisit these by feel.
 */
export const flowstateInk: MaterialDefinition = {
  baseColor: new THREE.Vector3(0.02, 0.02, 0.025),
  velocityColor: new THREE.Vector3(0.05, 0.85, 0.45),
  vorticityColor: new THREE.Vector3(0.05, 0.35, 0.95),
  velocityScale: 10.0,
  vorticityScale: 18.0,
  dyeThreshold: 0.02,
};
