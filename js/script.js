console.clear();

const textElement = document.getElementById('heart-text');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setClearColor(new THREE.Color("rgb(20, 20, 20)"));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 1.8;

const controls = new THREE.TrackballControls(camera, renderer.domElement);
controls.noPan = true;
controls.maxDistance = 3;
controls.minDistance = 0.7;

const group = new THREE.Group();
scene.add(group);

let sampler = null;
let exploded = false;
let explosionProgress = 0;
const beat = { a: 0 };

// ---------------- PARTICLES SETUP ----------------

const geometry = new THREE.BufferGeometry();
const material = new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.01,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.9
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
        this.trail = [];
    }

    update(time) {
        const dir = this.base.clone().normalize();
        const noise = simplex.noise4D(
            this.base.x * 1.5,
            this.base.y * 1.5,
            this.base.z * 1.5,
            time * 0.0005
        ) + 1;

        // Оновлення шлейфу
        this.trail.push(this.pos.clone());
        if (this.trail.length > 6) this.trail.shift();

        // Основна позиція: База + Вибух + Пульсація
        this.pos = this.base.clone()
            .add(dir.multiplyScalar(explosionProgress * (1 + this.rand)))
            .multiplyScalar(1 + noise * 0.15 * beat.a);
    }
}

let spikes = [];

// Завантаження моделі
new THREE.OBJLoader().load(
    "https://assets.codepen.io/127738/heart_2.obj",
    (obj) => {
        const heartMesh = obj.children[0];
        heartMesh.geometry.rotateX(-Math.PI * 0.5);
        heartMesh.geometry.scale(0.04, 0.04, 0.04);
        heartMesh.geometry.translate(0, -0.4, 0);

        sampler = new THREE.MeshSurfaceSampler(heartMesh).build();

        for (let i = 0; i < 8000; i++) {
            spikes.push(new SparkPoint());
        }

        renderer.setAnimationLoop(render);
    }
);

// ---------------- ANIMATION & INTERACTION ----------------

gsap.timeline({ repeat: -1, repeatDelay: 0.3 })
    .to(beat, { a: 0.5, duration: 0.6, ease: "power2.in" })
    .to(beat, { a: 0.0, duration: 0.6, ease: "power3.out" });

window.addEventListener("pointerdown", () => {
    if (!exploded) explode();
});

function explode() {
    exploded = true;
    setTimeout(() => { exploded = false; }, 2000);
}

// ---------------- RENDER LOOP ----------------

function render(time) {
    if (exploded) {
        explosionProgress += 0.05;
        if (explosionProgress > 3) explosionProgress = 3;

        // Поява тексту при розльоті
        if (explosionProgress > 0.6) {
            textElement.style.opacity = "1";
            textElement.style.transform = `translate(-50%, -50%) scale(${1 + beat.a * 0.2})`;
        }
    } else {
        explosionProgress *= 0.94;
        if (explosionProgress < 0.005) explosionProgress = 0;

        // Зникнення тексту при поверненні
        if (explosionProgress < 1.2) {
            textElement.style.opacity = "0";
        }
    }

    material.size = 0.008 + explosionProgress * 0.006;

    const allPositions = [];
    const allColors = [];

    spikes.forEach((p) => {
        p.update(time);

        allPositions.push(p.pos.x, p.pos.y, p.pos.z);
        allColors.push(p.color.r, p.color.g, p.color.b);

        if (explosionProgress > 0.1) {
            p.trail.forEach((tPos, index) => {
                const ratio = index / p.trail.length;
                allPositions.push(tPos.x, tPos.y, tPos.z);
                allColors.push(p.color.r * ratio * 0.5, p.color.g * ratio * 0.5, p.color.b * ratio * 0.5);
            });
        }
    });

    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(allPositions), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(allColors), 3));

    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
