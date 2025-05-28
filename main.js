const scene = new THREE.Scene();

// Camera setup: perspective camera starting a bit back and up
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 2, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x333333, 1);

document.body.appendChild(renderer.domElement);

// Add a directional light to create shiny highlights
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Optional: add some ambient light so shadows aren’t too dark
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const loader = new THREE.GLTFLoader();

const digits = {};
const digitMeshes = [];
const digitsGroup = new THREE.Group();
scene.add(digitsGroup);

function loadDigitModels(callback) {
  let loaded = 0;
  for (let i = 0; i < 10; i++) {
    loader.load(
      `assets/${i}.glb`,
      (gltf) => {
        digits[i] = gltf.scene;
        loaded++;
        if (loaded === 10) callback();
      },
      undefined,
      (error) => {
        console.error(`Error loading digit ${i}:`, error);
      }
    );
  }
}

function updateTimeDisplay() {
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");

  // Remove previous digits from group
  digitMeshes.forEach((mesh) => digitsGroup.remove(mesh));
  digitMeshes.length = 0;

  for (let i = 0; i < 6; i++) {
    const digit = timeStr[i];
    const mesh = digits[digit].clone();

    // Scale the digits bigger
    mesh.scale.set(2, 2, 2);

    // Position digits in a row inside the group
    mesh.position.x = i * 1.5;

    digitsGroup.add(mesh);
    digitMeshes.push(mesh);
  }

  // Center the group horizontally
  digitsGroup.position.x = -(1.5 * (6 - 1)) / 2;
  digitsGroup.position.y = 0;
  digitsGroup.position.z = 0;
}

function animate(time) {
  requestAnimationFrame(animate);

  // Slowly orbit camera around Y axis to show 3D effect
  const radius = 10;
  const speed = 0.001; // radians per ms
  const angle = time * speed;
  camera.position.x = Math.sin(angle) * radius;
  camera.position.z = Math.cos(angle) * radius;
  camera.lookAt(scene.position);

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Load models, then start animation and update every second
loadDigitModels(() => {
  updateTimeDisplay();
  setInterval(updateTimeDisplay, 1000);
  animate();
});
