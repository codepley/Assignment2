import * as THREE from "three";
import * as CANNON from "https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js";

// --- Basic Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("bowling-canvas"),
  antialias: true,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true; // Enable shadows

// --- Physics World Setup ---
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0), // Standard gravity
});

// UI Elements
const scoreElement = document.getElementById("score");
const instructionsElement = document.getElementById("instructions");
const resetButton = document.getElementById("reset-button");

// Game state variables
let score = 0;
let isThrowing = false;
let pins = [];
let pinBodies = [];
const pinInitialPositions = [];
let standingPins = []; // true = standing, false = knocked

// Bowling game state
let currentFrame = 1; // 1..10
let rollInFrame = 1; // 1,2 or 3 (tenth frame)
const frames = []; // array of { rolls: number[] }
for (let i = 0; i < 10; i++) frames.push({ rolls: [] });
// Pin settling/monitoring for continuous scoring
let monitoringPins = false;
let standingAtThrow = [];
let lastPinChangeTime = 0;
const pinSettleDelay = 700; // ms with no changes -> settled

// --- Game Objects ---

// Materials
const laneMaterial = new THREE.MeshStandardMaterial({
  color: 0x8b4513,
  roughness: 0.4,
});
const ballMaterial = new THREE.MeshStandardMaterial({
  color: 0x222222,
  metalness: 0.8,
  roughness: 0.1,
});
const pinMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.2,
});
const headPinMaterial = new THREE.MeshStandardMaterial({
  color: 0xff4500,
  roughness: 0.2,
}); // For the red stripe

// Physics materials
const groundPhysMaterial = new CANNON.Material("ground");
const ballPhysMaterial = new CANNON.Material("ball");
const pinPhysMaterial = new CANNON.Material("pin");

const ballPinContactMaterial = new CANNON.ContactMaterial(
  ballPhysMaterial,
  pinPhysMaterial,
  {
    friction: 0.1,
    restitution: 0.4, // Bounciness
  }
);
world.addContactMaterial(ballPinContactMaterial);

const ballGroundContactMaterial = new CANNON.ContactMaterial(
  ballPhysMaterial,
  groundPhysMaterial,
  {
    friction: 0.3,
    restitution: 0.1,
  }
);
world.addContactMaterial(ballGroundContactMaterial);

const pinGroundContactMaterial = new CANNON.ContactMaterial(
  pinPhysMaterial,
  groundPhysMaterial,
  {
    friction: 0.2,
    restitution: 0.5,
  }
);
world.addContactMaterial(pinGroundContactMaterial);

// 1. The Lane
function createLane() {
  const laneShape = new THREE.BoxGeometry(4, 0.2, 60);
  const lane = new THREE.Mesh(laneShape, laneMaterial);
  lane.position.set(0, 0, -20);
  lane.receiveShadow = true;
  scene.add(lane);

  // Physics for the lane (a static plane)
  const groundBody = new CANNON.Body({
    mass: 0, // mass = 0 makes it static
    shape: new CANNON.Plane(),
    material: groundPhysMaterial,
  });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotate it to be flat
  world.addBody(groundBody);
}

// 2. The Bowling Ball
const ballRadius = 0.5;
const ballStartPos = new THREE.Vector3(0, ballRadius, 8);
const ballMesh = new THREE.Mesh(
  new THREE.SphereGeometry(ballRadius),
  ballMaterial
);
ballMesh.castShadow = true;
ballMesh.position.copy(ballStartPos);
scene.add(ballMesh);

const ballBody = new CANNON.Body({
  mass: 2, // kg
  shape: new CANNON.Sphere(ballRadius),
  position: new CANNON.Vec3().copy(ballStartPos),
  material: ballPhysMaterial,
});
world.addBody(ballBody);

// 3. The Pins
function createPin(x, z) {
  const pinHeight = 1.5;
  const pinRadius = 0.2;

  const pinGroup = new THREE.Group();

  // Create a more realistic pin shape
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(pinRadius / 2, pinRadius, pinHeight * 0.8, 16),
    pinMaterial
  );
  body.castShadow = true;
  body.position.y = (pinHeight * 0.8) / 2;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(pinRadius, 16, 16),
    pinMaterial
  );
  head.castShadow = true;
  head.position.y = pinHeight * 0.8;

  // Red stripe on the head
  const stripe = new THREE.Mesh(
    new THREE.TorusGeometry(pinRadius * 0.8, 0.05, 16, 100),
    headPinMaterial
  );
  stripe.rotation.x = Math.PI / 2;
  stripe.position.y = pinHeight * 0.7;

  pinGroup.add(body, head, stripe);
  pinGroup.position.set(x, pinHeight / 2, z);
  scene.add(pinGroup);
  pins.push(pinGroup);

  // Physics body for the pin (simplified as a cylinder)
  const pinShape = new CANNON.Cylinder(pinRadius, pinRadius, pinHeight, 16);
  const pinBody = new CANNON.Body({
    mass: 1.5,
    position: new CANNON.Vec3(x, pinHeight / 2, z),
    shape: pinShape,
    material: pinPhysMaterial,
  });
  pinBodies.push(pinBody);
  world.addBody(pinBody);

  // Store initial position for resetting
  pinInitialPositions.push(new CANNON.Vec3(x, pinHeight / 2, z));
  standingPins.push(true);
}

function setupPins() {
  const pinPositions = [
    [0, -18],
    [-0.7, -19],
    [0.7, -19],
    [-1.4, -20],
    [0, -20],
    [1.4, -20],
    [-2.1, -21],
    [-0.7, -21],
    [0.7, -21],
    [2.1, -21],
  ];
  pinPositions.forEach((pos) => createPin(pos[0], pos[1]));
}

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 20, 15);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// --- Camera ---
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, -10); // Look towards the pins

// --- Mouse Controls for Throwing ---
let mouseStart = null;
const aimLineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
let aimLine;

window.addEventListener("mousedown", (event) => {
  if (isThrowing) return;
  mouseStart = { x: event.clientX, y: event.clientY };
});

window.addEventListener("mouseup", (event) => {
  if (!mouseStart || isThrowing) return;

  const mouseEnd = { x: event.clientX, y: event.clientY };
  const diffX = mouseEnd.x - mouseStart.x;
  const diffY = mouseEnd.y - mouseStart.y;

  // Calculate force based on drag distance
  const forceMagnitude =
    Math.min(Math.sqrt(diffX ** 2 + diffY ** 2), 200) * 0.2;
  const forceDirection = new CANNON.Vec3(diffX * 0.1, 0, diffY * 0.1).unit();

  const impulse = forceDirection.scale(forceMagnitude);

  ballBody.applyImpulse(impulse, ballBody.position);
  isThrowing = true;
  instructionsElement.innerText = "Good luck!";

  mouseStart = null;
  // Start continuous monitoring of pins to detect when they settle
  monitoringPins = true;
  // capture standing snapshot right after the throw
  standingAtThrow = standingPins.slice();
  lastPinChangeTime = performance.now();
});

// --- Game Logic Functions ---
// Determine which pins fell after a throw and record roll
function checkFallenPins() {
  const up = new CANNON.Vec3(0, 1, 0);
  // detect which pins are currently standing
  const currentlyStanding = [];
  for (let i = 0; i < pinBodies.length; i++) {
    const b = pinBodies[i];
    // Consider pin fallen if tilted > ~45 deg OR y position is low
    let fallen = false;
    try {
      const axisAngle = b.quaternion.toAxisAngle(up);
      const angle = axisAngle ? axisAngle[1] : 0;
      if (Math.abs(angle) > Math.PI / 4) fallen = true;
    } catch (e) {
      // fallback: use position
      if (b.position.y < 0.5) fallen = true;
    }
    currentlyStanding.push(!fallen);
  }

  // Compare to previous standingPins to find newly knocked pins
  const newlyKnocked = [];
  for (let i = 0; i < standingPins.length; i++) {
    const wasStanding = standingPins[i];
    const isStandingNow = currentlyStanding[i];
    if (wasStanding && !isStandingNow) newlyKnocked.push(i);
    // update standingPins to current
    standingPins[i] = isStandingNow;
  }

  const knockedThisRoll = newlyKnocked.length;

  // Record the roll into frames
  recordRoll(knockedThisRoll);
  isThrowing = false;
}

function recordRoll(knockedDown) {
  // Cap knockedDown to remaining pins in current frame
  const pinsDownSoFar = frames[currentFrame - 1].rolls.reduce(
    (s, r) => s + r,
    0
  );
  const remaining = Math.max(0, 10 - pinsDownSoFar);
  const actualKnocked = Math.min(knockedDown, remaining);

  frames[currentFrame - 1].rolls.push(actualKnocked);

  // After recording, update score display
  const total = computeScore();
  scoreElement.innerText = total;

  // Decide whether to advance frame / reset pins
  if (currentFrame < 10) {
    // frames 1-9
    if (rollInFrame === 1) {
      if (actualKnocked === 10) {
        // strike -> frame over
        advanceFrame();
      } else {
        // go to second roll
        rollInFrame = 2;
        instructionsElement.innerText = `Frame ${currentFrame} - Roll 2`;
      }
    } else {
      // second roll -> frame over
      advanceFrame();
    }
  } else {
    // 10th frame rules
    const rolls = frames[9].rolls;
    if (rollInFrame === 1) {
      if (actualKnocked === 10) {
        // strike in first roll -> allow two more rolls
        rollInFrame = 2;
        resetPinsForTenthExtra();
        instructionsElement.innerText = `Frame 10 - Bonus Roll 1`;
      } else {
        rollInFrame = 2;
        instructionsElement.innerText = `Frame 10 - Roll 2`;
      }
    } else if (rollInFrame === 2) {
      const first = rolls[0] || 0;
      const second = rolls[1] || 0;
      if (first === 10) {
        // first was strike -> we are in bonus roll sequence
        rollInFrame = 3;
        instructionsElement.innerText = `Frame 10 - Bonus Roll 2`;
      } else if (first + second === 10) {
        // spare -> one extra roll
        rollInFrame = 3;
        resetPinsForTenthExtra();
        instructionsElement.innerText = `Frame 10 - Bonus Roll`;
      } else {
        // no spare/strike -> game over
        endGame();
      }
    } else {
      // third roll -> end game
      endGame();
    }
  }
}

function advanceFrame() {
  // Reset pins for next frame
  resetPinsBetweenFrames();
  currentFrame++;
  rollInFrame = 1;
  if (currentFrame > 10) {
    endGame();
  } else {
    instructionsElement.innerText = `Frame ${currentFrame} - Roll 1`;
  }
}

function resetPinsForTenthExtra() {
  // On tenth frame extra roll(s) where pins should be reset
  for (let i = 0; i < pinBodies.length; i++) {
    const p = pinBodies[i];
    const pos = pinInitialPositions[i];
    p.position.copy(pos);
    p.velocity.set(0, 0, 0);
    p.angularVelocity.set(0, 0, 0);
    p.quaternion.set(0, 0, 0, 1);
    standingPins[i] = true;
  }
}

function resetPinsBetweenFrames() {
  for (let i = 0; i < pinBodies.length; i++) {
    const p = pinBodies[i];
    const pos = pinInitialPositions[i];
    p.position.copy(pos);
    p.velocity.set(0, 0, 0);
    p.angularVelocity.set(0, 0, 0);
    p.quaternion.set(0, 0, 0, 1);
    standingPins[i] = true;
  }
}

function endGame() {
  instructionsElement.innerText = `Game over! Final score: ${computeScore()}. Press Reset to play again.`;
}

// Compute score according to bowling rules
function computeScore() {
  let total = 0;
  // helper to get next rolls as a flat list
  const flat = [];
  for (let f = 0; f < frames.length; f++) {
    for (const r of frames[f].rolls) flat.push(r);
  }

  // iterate frames 0..9
  let idx = 0; // index into flat
  for (let f = 0; f < 10; f++) {
    const fr = frames[f].rolls;
    if (!fr || fr.length === 0) break;

    if (f < 9) {
      // frames 1-9
      if (fr[0] === 10) {
        // strike
        const bonus = (flat[idx + 1] || 0) + (flat[idx + 2] || 0);
        total += 10 + bonus;
        idx += 1; // strike consumes one roll in flat
      } else if ((fr[0] || 0) + (fr[1] || 0) === 10) {
        // spare
        const bonus = flat[idx + 2] || 0;
        total += 10 + bonus;
        idx += 2;
      } else {
        total += (fr[0] || 0) + (fr[1] || 0);
        idx += 2;
      }
    } else {
      // 10th frame: sum all rolls recorded
      total += fr.reduce((s, r) => s + r, 0);
    }
  }

  return total;
}

function resetGame() {
  isThrowing = false;
  score = 0;
  scoreElement.innerText = "0";
  instructionsElement.innerText = "Click and drag to aim and shoot!";

  // Reset ball
  ballBody.position.copy(ballStartPos);
  ballBody.velocity.set(0, 0, 0);
  ballBody.angularVelocity.set(0, 0, 0);
  ballBody.quaternion.set(0, 0, 0, 1);

  // Reset pins
  for (let i = 0; i < pinBodies.length; i++) {
    const pinBody = pinBodies[i];
    const initialPos = pinInitialPositions[i];

    pinBody.position.copy(initialPos);
    pinBody.velocity.set(0, 0, 0);
    pinBody.angularVelocity.set(0, 0, 0);
    pinBody.quaternion.set(0, 0, 0, 1);
    standingPins[i] = true;
  }

  // Reset scoring/frame state
  currentFrame = 1;
  rollInFrame = 1;
  for (let i = 0; i < frames.length; i++) frames[i].rolls = [];
  // Clear pin monitoring state
  monitoringPins = false;
  standingAtThrow = [];
  lastPinChangeTime = 0;
  // Reset UI to first frame
  instructionsElement.innerText = `Frame ${currentFrame} - Roll ${rollInFrame}`;
}

resetButton.addEventListener("click", resetGame);

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();

  // Step the physics world
  world.step(1 / 60, deltaTime, 3);

  // Update THREE.js meshes with physics body positions
  ballMesh.position.copy(ballBody.position);
  ballMesh.quaternion.copy(ballBody.quaternion);

  for (let i = 0; i < pins.length; i++) {
    pins[i].position.copy(pinBodies[i].position);
    pins[i].quaternion.copy(pinBodies[i].quaternion);
  }

  // Continuous pin monitoring: check for settling after a throw
  if (monitoringPins) {
    const now = performance.now();
    let anyChange = false;
    const up = new CANNON.Vec3(0, 1, 0);
    for (let i = 0; i < pinBodies.length; i++) {
      const b = pinBodies[i];
      let fallen = false;
      try {
        const axisAngle = b.quaternion.toAxisAngle(up);
        const angle = axisAngle ? axisAngle[1] : 0;
        if (Math.abs(angle) > Math.PI / 4) fallen = true;
      } catch (e) {
        if (b.position.y < 0.5) fallen = true;
      }
      const isStandingNow = !fallen;
      if (standingPins[i] !== isStandingNow) {
        // immediate update of standing state for ongoing checks
        standingPins[i] = isStandingNow;
        anyChange = true;
      }
    }

    if (anyChange) {
      lastPinChangeTime = now;
    }

    // If no pin changes for pinSettleDelay, consider pins settled
    if (now - lastPinChangeTime > pinSettleDelay) {
      monitoringPins = false;
      // Determine knocked pins by comparing standingAtThrow -> standingPins
      let knockedCount = 0;
      for (let i = 0; i < standingAtThrow.length; i++) {
        if (standingAtThrow[i] && !standingPins[i]) knockedCount++;
      }
      // If for some reason standingAtThrow is empty, fallback to counting all fallen
      if (standingAtThrow.length === 0) {
        knockedCount = standingPins.reduce((s, v) => s + (v ? 0 : 1), 0);
      }
      recordRoll(knockedCount);
      isThrowing = false;
    }
  }

  renderer.render(scene, camera);
}

// --- Initialisation ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

createLane();
setupPins();
animate();
// Initial UI
scoreElement.innerText = "0";
instructionsElement.innerText = `Frame ${currentFrame} - Roll ${rollInFrame}`;
