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

// 💥 Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let exploded = false;
let explosionProgress = 0;
let explosionCenter = new THREE.Vector3();

new THREE.OBJLoader().load(
  "https://assets.codepen.io/127738/heart_2.obj",
  (obj) => {
    heart = obj.children[0];
    heart.geometry.rotateX(-Math.PI * 0.5);
    heart.geometry.scale(0.04, 0.04, 0.04);
    heart.geometry.translate(0, -0.4, 0);
    group.add(heart);

    heart.material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("rgb(0,0,0)"),
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
    this.color = palette[Math.floor(Math.random() * palette.length)];
    this.rand = Math.random() * 0.03;
    this.pos = pos.clone();
    this.one = null;
    this.two = null;
  }

  update(a) {
    if (exploded) {
      const dir = this.pos.clone().sub(explosionCenter).normalize();
      const force = 0.5 + Math.random() * 1.5;

      this.one = this.pos.clone().add(
        dir.multiplyScalar(force * explosionProgress)
      );
      this.two = this.one.clone();
    } else {
      const noise =
        simplex.noise4D(this.pos.x, this.pos.y, this.pos.z, 0.1) + 1.5;

      const noise2 =
        simplex.noise4D(
          this.pos.x * 500,
          this.pos.y * 500,
          this.pos.z * 500,
          1
        ) + 1;

      this.one = this.pos
        .clone()
        .multiplyScalar(1.01 + noise * 0.15 * beat.a);

      this.two = this.pos
        .clone()
        .multiplyScalar(1 + noise2 * (beat.a + 0.3) - beat.a * 1.2);
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

// ---------------- CLICK EXPLOSION ----------------

window.addEventListener("click", (event) => {
  if (!heart || exploded) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(heart);

  if (intersects.length > 0) {
    explode();
  }
});

function explode() {
  exploded = true;
  explosionProgress = 0;

  heart.geometry.computeBoundingBox();
  heart.geometry.boundingBox.getCenter(explosionCenter);

  setTimeout(() => {
    exploded = false;
  }, 2000);
}

// ---------------- RENDER ----------------

function render(a) {
  if (exploded) {
    explosionProgress += 0.05;
  } else {
    explosionProgress *= 0.9;
  }

  positions = [];
  colors = [];

  spikes.forEach((g) => {
    g.update(a);
    const rand = g.rand;
    const color = g.color;

    if (g.one) {
      positions.push(g.one.x, g.one.y, g.one.z);
      colors.push(color.r, color.g, color.b);
    }

    if (g.two) {
      positions.push(g.two.x, g.two.y, g.two.z);
      colors.push(color.r, color.g, color.b);
    }
  });

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3)
  );

  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(colors), 3)
  );

  // деформация меша
  const vs = heart.geometry.attributes.position.array;

  for (let i = 0; i < vs.length; i += 3) {
    const v = new THREE.Vector3(
      originHeart[i],
      originHeart[i + 1],
      originHeart[i + 2]
    );

    const noise =
      simplex.noise4D(
        originHeart[i] * 1.5,
        originHeart[i + 1] * 1.5,
        originHeart[i + 2] * 1.5,
        a * 0.0005
      ) + 1;

    v.multiplyScalar(noise * 0.15 * beat.a);
    vs[i] = v.x;
    vs[i + 1] = v.y;
    vs[i + 2] = v.z;
  }

  heart.geometry.attributes.position.needsUpdate = true;

  controls.update();
  renderer.render(scene, camera);
}

// ---------------- RESIZE ----------------

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
