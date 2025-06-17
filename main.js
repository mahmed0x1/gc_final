import * as THREE from "three";
import { initOrbitControls } from "./util.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Sky } from "./assets/Sky.js";

// global variables
let dropParticles = null;
let dropTexture = null;

let timeMeshes = [];
let font = null;
let maxDigitWidth = 0; // Will store the width of the widest digit (0-9)
let sky = null;
let sun = null;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(-5, 0, 20);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Text parameters
const textParams = {
  size: 5,
  height: 1,
  normalColor: 0x0079ff,
  warningColor: 0xff0060,
  separatorColor: 0xffffff,
  colonSpacing: 1.2,
  fixedDigitWidth: 3.5, // Fixed width for each digit (adjust based on your font)
  colonWidth: 1.5, // Fixed width for colons
};

// Load font
const fontLoader = new FontLoader();
fontLoader.load("./assets/Cherry_Bomb_One_Regular.json", function (loadedFont) {
  font = loadedFont;
  // Calculate maximum digit width once font is loaded
  calculateMaxDigitWidth();
  updateTimeText();
  setInterval(updateTimeText, 1000);
});

// Add lights
const light = new THREE.DirectionalLight(0xffffff, 15);
light.position.set(10, 20, 10);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

initOrbitControls(camera, renderer);

function calculateMaxDigitWidth() {
  // Create all digits to find the widest one
  const digits = [];
  for (let i = 0; i < 10; i++) {
    digits.push(createTextPart(i.toString(), textParams.normalColor));
  }

  // Find maximum width
  digits.forEach((mesh) => {
    mesh.geometry.computeBoundingBox();
    const width =
      mesh.geometry.boundingBox.max.x - mesh.geometry.boundingBox.min.x;
    if (width > maxDigitWidth) maxDigitWidth = width;
  });

  // Clean up
  digits.forEach((mesh) => {
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
}

function createTextPart(text, color) {
  const geometry = new TextGeometry(text, {
    font: font,
    size: textParams.size,
    height: textParams.height,
  });

  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.5,
    roughness: 0.3,
  });

  return new THREE.Mesh(geometry, material);
}

function updateTimeText() {
  if (!font || maxDigitWidth === 0) return;

  // Clear previous time meshes
  timeMeshes.forEach((mesh) => {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  timeMeshes = [];

  // Get current time components
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds();
  const secondsFormatted = seconds.toString().padStart(2, "0");

  // Determine if seconds are in warning range (>= 50)
  const isWarning = seconds >= 50;
  const secondsColor = isWarning
    ? textParams.warningColor
    : textParams.normalColor;

  // Create text parts
  const hoursMesh = createTextPart(hours, textParams.normalColor);
  const colon1Mesh = createTextPart(":", textParams.separatorColor);
  const minutesMesh = createTextPart(minutes, textParams.normalColor);
  const colon2Mesh = createTextPart(":", textParams.separatorColor);
  const secondsMesh = createTextPart(secondsFormatted, secondsColor);

  // Use fixed widths instead of measured widths
  const hoursWidth = 2 * textParams.fixedDigitWidth; // Two digits
  const colonWidth = textParams.colonWidth;
  const minutesWidth = 2 * textParams.fixedDigitWidth;
  const secondsWidth = 2 * textParams.fixedDigitWidth;

  // Calculate total width
  const totalWidth =
    hoursWidth +
    minutesWidth +
    secondsWidth +
    2 * colonWidth +
    4 * textParams.colonSpacing;

  // Position elements with perfect centering using fixed widths
  let currentX = -totalWidth / 2;

  // Hours (centered in their fixed width)
  hoursMesh.position.x = currentX + hoursWidth / 2;
  currentX += hoursWidth + textParams.colonSpacing;

  // First colon
  colon1Mesh.position.x = currentX + 2.5 + colonWidth / 2;
  currentX += colonWidth + textParams.colonSpacing;

  // Minutes
  minutesMesh.position.x = currentX + minutesWidth / 2;
  currentX += minutesWidth + textParams.colonSpacing;

  // Second colon
  colon2Mesh.position.x = currentX + 2.5 + colonWidth / 2;
  currentX += colonWidth + textParams.colonSpacing;

  // Seconds
  secondsMesh.position.x = currentX + secondsWidth / 2;

  // Add all to scene and timeMeshes array
  timeMeshes = [hoursMesh, colon1Mesh, minutesMesh, colon2Mesh, secondsMesh];
  timeMeshes.forEach((mesh) => scene.add(mesh));
}

function render() {
  requestAnimationFrame(render);
  updateParticles();
  renderer.render(scene, camera);
}

render();

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

document.addEventListener("DOMContentLoaded", function () {
  // First, get the user's location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success callback - we have location
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        console.log(
          `Location obtained: Latitude ${latitude}, Longitude ${longitude}`
        );

        // Now get weather for this location
        getWeatherData(latitude, longitude);
      },
      (error) => {
        // Error callback - couldn't get location
        console.error("Error getting location:", error.message);

        getWeatherData(40.7128, -74.006); // Default to New York
      }
    );
  } else {
    console.error("Geolocation is not supported by this browser.");

    getWeatherData(40.7128, -74.006); // Default to New York
  }
});

function getWeatherData(latitude, longitude) {
  console.log(`Fetching weather for coordinates: ${latitude}, ${longitude}`);
  const apiKey = "52e78b09630c40a982454759250106";
  const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${latitude},${longitude}`;
  fetch(url)
    .then((response) => response.json())
    .then((data) => processWeatherData(data))
    .catch((error) => console.error("Error fetching weather:", error));
}

function processWeatherData(data) {
  const { name, country } = data.location;
  const { temp_c } = data.current;
  const weather_info = `📍 Location: ${name}, ${country} <br/>
  🌡️ Temperature: ${temp_c}°C
   <br/>
  ☀️ Weather: ${data.current.condition.text}  
  `;
  document.querySelector("#weather").innerHTML = weather_info;

  const condition = data.current.condition.text.toLowerCase();
  let final_condition = "";

  // 더 세분화된 날씨 조건 처리
  if (condition.includes("clear") || condition.includes("sunny")) {
    final_condition = "sunny";
  } else if (condition.includes("partly cloudy")) {
    final_condition = "partly_cloudy";
  } else if (condition.includes("cloudy")) {
    final_condition = "cloudy";
  } else if (condition.includes("overcast")) {
    final_condition = "overcast";
  } else if (
    condition.includes("light rain") ||
    condition.includes("drizzle")
  ) {
    final_condition = "light_rain";
  } else if (condition.includes("heavy rain") || condition.includes("shower")) {
    final_condition = "heavy_rain";
  } else if (condition.includes("light snow") || condition.includes("sleet")) {
    final_condition = "light_snow";
  } else if (
    condition.includes("heavy snow") ||
    condition.includes("blizzard")
  ) {
    final_condition = "heavy_snow";
  } else {
    final_condition = "sunny"; // 기본값
  }

  renderWeather(final_condition);
}

// condition: sunny, cloudy, rainy, snowy
function renderWeather(condition) {
  console.log(condition);
  if (condition === "sunny") {
    setupSunnySky();
  } else {
    removeSky();
    initParticles(condition);
  }
}

// Add keyboard event listener for weather control
document.addEventListener("keydown", (event) => {
  if (dropParticles) {
    scene.remove(dropParticles);
  }

  switch (event.key) {
    case "1":
      renderWeather("sunny");
      break;
    case "2":
      renderWeather("partly_cloudy");
      break;
    case "3":
      renderWeather("cloudy");
      break;
    case "4":
      renderWeather("overcast");
      break;
    case "5":
      renderWeather("light_rain");
      break;
    case "6":
      renderWeather("heavy_rain");
      break;
    case "7":
      renderWeather("light_snow");
      break;
    case "8":
      renderWeather("heavy_snow");
      break;
    case "r": // 'r' 키를 눌러 실제 날씨로 리프레시
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            getWeatherData(latitude, longitude);
          },
          (error) => {
            console.error("Error getting location:", error.message);
            getWeatherData(40.7128, -74.006); // Default to New York
          }
        );
      }
      break;
  }
});

// condition: rainy, snowy
function initParticles(condition) {
  // Remove existing particles if any
  if (dropParticles) {
    scene.remove(dropParticles);
    dropParticles.geometry.dispose();
    dropParticles.material.dispose();
    dropParticles = null;
  }

  // Create particles for rain and snow conditions
  if (condition.includes("rain") || condition.includes("snow")) {
    // Load texture
    const textureLoader = new THREE.TextureLoader();
    dropTexture = textureLoader.load(
      `./assets/${condition.includes("rain") ? "raindrop" : "snowflake"}.png`
    );

    // Create particle system
    const particleCount = condition.includes("heavy") ? 3000 : 1500; // 더 많은 파티클 for heavy conditions
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    // Fill buffers
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = Math.random() * 100 - 50; // x
      positions[i * 3 + 1] = Math.random() * 100 - 10; // y (start above view)
      positions[i * 3 + 2] = Math.random() * 50 - 25; // z

      sizes[i] = 0.1 + Math.random() * 0.3; // Random size
    }

    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particles.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Create material
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.5,
      map: dropTexture,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthTest: false,
    });

    // Create particle system
    dropParticles = new THREE.Points(particles, particleMaterial);
    dropParticles.position.y = 0;
    scene.add(dropParticles);
  }

  // Update scene background color based on weather condition
  switch (condition) {
    case "sunny":
      scene.background = new THREE.Color(0x87ceeb); // Sky blue
      break;
    case "partly_cloudy":
      scene.background = new THREE.Color(0xadd8e6); // Light blue
      break;
    case "cloudy":
      scene.background = new THREE.Color(0x708090); // Slate gray
      break;
    case "overcast":
      scene.background = new THREE.Color(0x4b4b4b); // Dark gray
      break;
    case "light_rain":
      scene.background = new THREE.Color(0x696969); // Dim gray
      break;
    case "heavy_rain":
      scene.background = new THREE.Color(0x2f4f4f); // Dark slate gray
      break;
    case "light_snow":
      scene.background = new THREE.Color(0xf0f8ff); // Alice blue
      break;
    case "heavy_snow":
      scene.background = new THREE.Color(0xe0ffff); // Light cyan
      break;
  }
}

function updateParticles() {
  if (!dropParticles) return;

  const positions = dropParticles.geometry.attributes.position.array;
  const isRain =
    dropParticles.material.map === dropTexture &&
    dropTexture.image.src.includes("raindrop");

  // Different speeds for different conditions
  let speed;
  if (isRain) {
    speed = dropParticles.material.map.image.src.includes("heavy") ? 0.3 : 0.15;
  } else {
    speed = dropParticles.material.map.image.src.includes("heavy")
      ? 0.08
      : 0.04;
  }

  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] -= speed; // Move downward

    // Reset particles that fall below view
    if (positions[i + 1] < -20) {
      positions[i] = Math.random() * 100 - 50;
      positions[i + 1] = Math.random() * 30 + 20;
      positions[i + 2] = Math.random() * 50 - 25;
    }
  }

  dropParticles.geometry.attributes.position.needsUpdate = true;
}

function setupSunnySky() {
  if (sky) return; // 이미 sky가 있으면 중복 추가 방지
  sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);

  // Sky 파라미터 설정 (맑은 날씨)
  const skyUniforms = sky.material.uniforms;
  skyUniforms["turbidity"].value = 10;
  skyUniforms["rayleigh"].value = 3;
  skyUniforms["mieCoefficient"].value = 0.005;
  skyUniforms["mieDirectionalG"].value = 0.7;

  // // 태양 위치 설정
  sun = new THREE.Vector3();
  const effectController = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
    exposure: renderer.toneMappingExposure,
  };

  const phi = THREE.MathUtils.degToRad(90 - effectController.elevation); // 고도
  const theta = THREE.MathUtils.degToRad(effectController.azimuth); // 방위각

  sun.setFromSphericalCoords(1, phi, theta);

  skyUniforms["sunPosition"].value.copy(sun);

  renderer.toneMappingExposure = effectController.exposure;
  renderer.render(scene, camera);
}

function removeSky() {
  if (sky) {
    scene.remove(sky);
    sky.material.dispose();
    sky.geometry.dispose();
    sky = null;
  }
}
