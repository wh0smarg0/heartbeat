console.clear();

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(new THREE.Color("rgb(26, 25, 25)"));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 1.8;

const controls = new THREE.TrackballControls(camera, renderer.domElement);
controls.noPan = true;
controls.maxDistance = 3;
controls.minDistance = 0.7;

const group = new THREE.Group();
scene.add(group);

let heart = null;
let sampler = null;
let originHeart = null;

let exploded = false;
let explosionProgress = 0;

new THREE.OBJLoader().load(
  "https://assets.codepen.io/127738/heart_2.obj",
  (obj) => {
    heart = obj.children[0];
    heart.geometry.rotateX(-Math.PI * 0.5);
    heart.geometry.scale(0.04, 0.04, 0.04);
    heart.geometry.translate(0, -0.4, 0);
    group.add(heart);

    heart.material = new THREE.MeshBasicMaterial({
      visible: false // прячем меш, оставляем только частицы
    });

    originHeart = Array.from(heart.geometry.attributes.position.array);
    sampler = new THREE.MeshSurfaceSampler(heart).build();

    init();
    renderer.setAnimationLoop(render);
  }
);

// ---------------- PARTICLES ----------------

let positions = [];
let colors = [];
const geometry = new THREE.BufferGeometry();

const material = new THREE.PointsMaterial({
  vertexColors: true,
  size: 0.009,
});

const particles = new THREE.Points(geometry, material);
group.add(particles);

const simplex = new SimplexNoise();
const pos = new THREE.Vector3();

const palette = [
  new THREE.Color("#ffd4ee"),
  new THREE.Color("#ff77fc"),
  new THREE.Color("#ff77ae"),
  new THREE.Color("#ff1775"),
];

class SparkPoint {
  constructor() {
    sampler.sample(pos);
    this.base = pos.clone();
    this.pos = pos.clone();
    this.color = palette[Math.floor(Math.random() * palette.length)];
    this.rand = Math.random() * 0.5;
  }

  update(time) {
    if (exploded) {
      const dir = this.base.clone().normalize();
      this.pos = this.base.clone().add(
        dir.multiplyScalar(explosionProgress * (1 + this.rand))
      );
    } else {
      const noise =
        simplex.noise4D(
          this.base.x * 1.5,
          this.base.y * 1.5,
          this.base.z * 1.5,
          time * 0.0005
        ) + 1;

      this.pos = this.base
        .clone()
        .multiplyScalar(1 + noise * 0.15 * beat.a);
    }
  }
}

let spikes = [];

function init() {
  for (let i = 0; i < 10000; i++) {
    spikes.push(new SparkPoint());
  }
}

// ---------------- BEAT ----------------

const beat = { a: 0 };

gsap
  .timeline({ repeat: -1, repeatDelay: 0.3 })
  .to(beat, {
    a: 0.5,
    duration: 0.6,
    ease: "power2.in",
  })
  .to(beat, {
    a: 0.0,
    duration: 0.6,
    ease: "power3.out",
  });

// ---------------- CLICK ----------------

window.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (!exploded) explode();
});

function explode() {
  exploded = true;
  explosionProgress = 0;

  setTimeout(() => {
    exploded = false;
  }, 2000);
}

// ---------------- RENDER ----------------

function render(time) {

  if (exploded) {
    explosionProgress += 0.05;
  } else {
    explosionProgress *= 0.92; // плавная сборка
  }

  positions = [];
  colors = [];

  spikes.forEach((p) => {
    p.update(time);
    positions.push(p.pos.x, p.pos.y, p.pos.z);
    colors.push(p.color.r, p.color.g, p.color.b);
  });

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3)
  );

  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(colors), 3)
  );

  controls.update();
  renderer.render(scene, camera);
}

// ---------------- RESIZE ----------------

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
