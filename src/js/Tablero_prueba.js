import * as CANNON from "https://cdn.skypack.dev/cannon-es";
import * as THREE from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.18.2/+esm"

import { propiedades } from "./casillas.js";

const containerEl = document.querySelector(".container");
const canvasEl = document.querySelector("#canvas");

let renderer, scene, camera, diceMesh, physicsRender, simulation;

let simulationOn = true;
let currentResult = [0, 0];

const params = {

    // dice
    segments: 40,
    edgeRadius: .08,
    notchRadius: .15,
    notchDepth: .17,

    // physics
    restitution: .3,
    friction: .1,

    // ux
    desiredResult: 7,
    throw: throwMe,
};

function throwMe() {
    simulationOn = true;
    throwDice();
}


const diceArray = [];
const floorPlanesArray = [];
let throwBtn;

initPhysics();
initScene();


createFloor();
diceMesh = createDiceMesh();
for (let i = 0; i < 2; i++) {
    diceArray.push(createDice());
    addDiceEvents(diceArray[i], i);
}

createControls();

throwMe();
render();

window.addEventListener("resize", updateSceneSize);
window.addEventListener("click", () => {
});

function initScene() {
    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas: canvasEl
    });
    renderer.shadowMap.enabled = true
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, containerEl.clientWidth / containerEl.clientHeight, .1, 100)
    camera.position.set(0, 9, 12);
    camera.lookAt(0, 4, 0);
    updateSceneSize();

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const light = new THREE.PointLight(0xffffff, 1000.);
    light.position.set(10, 20, 5);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    scene.add(light);
}

function initPhysics() {

    const gravity = new CANNON.Vec3(0, -50, 0);
    const allowSleep = true;
    physicsRender = new CANNON.World({
        allowSleep, gravity
    })
    simulation = new CANNON.World({
        allowSleep, gravity
    })
    physicsRender.defaultContactMaterial.restitution = params.restitution;
    simulation.defaultContactMaterial.restitution = params.restitution;
    physicsRender.defaultContactMaterial.friction = params.friction;
    simulation.defaultContactMaterial.friction = params.friction;

}

function createFloor() {
    for (let i = 0; i < 4; i++) {

        const body = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
        });
        physicsRender.addBody(body);
        simulation.addBody(body);

        let mesh;
        if (i === 0) {
            mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(100, 100, 100, 100),
                new THREE.ShadowMaterial({
                    opacity: .1
                })
            )
            scene.add(mesh);
            mesh.receiveShadow = true;
        }

        floorPlanesArray.push({
            body, mesh
        })
    }

    floorPositionUpdate();
}

function floorPositionUpdate() {
    floorPlanesArray.forEach((f, fIdx) => {
        if (fIdx === 0) {
            f.body.position.y = 0;
            f.body.quaternion.setFromEuler(-.5 * Math.PI, 0, 0);
        } else if (fIdx === 1) {
            f.body.quaternion.setFromEuler(0, .5 * Math.PI, 0);
            f.body.position.x = -6 * containerEl.clientWidth / containerEl.clientHeight;
        } else if (fIdx === 2) {
            f.body.quaternion.setFromEuler(0, -.5 * Math.PI, 0);
            f.body.position.x = 6 * containerEl.clientWidth / containerEl.clientHeight;
        } else if (fIdx === 3) {
            f.body.quaternion.setFromEuler(0, Math.PI, 0);
            f.body.position.z = 3;
        }

        if (f.mesh) {
            f.mesh.position.copy(f.body.position);
            f.mesh.quaternion.copy(f.body.quaternion);
        }
    })
}


function createDiceMesh() {
    const boxMaterialOuter = new THREE.MeshStandardMaterial({
        color: 0xffffff,
    })
    const boxMaterialInner = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0,
        metalness: 1,
    })

    const g = new THREE.Group();
    const innerSide = 1 - params.edgeRadius;
    const innerMesh = new THREE.Mesh(
        new THREE.BoxGeometry(innerSide, innerSide, innerSide),
        boxMaterialInner
    );
    const outerMesh = new THREE.Mesh(
        createBoxGeometry(),
        boxMaterialOuter
    );
    outerMesh.castShadow = true;
    g.add(innerMesh, outerMesh);

    return g;
}

function createDice() {
    const mesh = diceMesh.clone();
    scene.add(mesh);

    const shape = new CANNON.Box(new CANNON.Vec3(.5, .5, .5));
    const mass = 1;
    const sleepTimeLimit = .02;

    const body = new CANNON.Body({
        mass, shape, sleepTimeLimit
    });
    physicsRender.addBody(body);

    const simulationBody = new CANNON.Body({
        mass, shape, sleepTimeLimit
    });
    simulation.addBody(simulationBody);

    return {
        mesh,
        body: [body, simulationBody],
        startPos: [null, null, null]
    };
}

function createBoxGeometry() {1

    let boxGeometry = new THREE.BoxGeometry(1, 1, 1, params.segments, params.segments, params.segments);

    const positionAttr = boxGeometry.attributes.position;
    const subCubeHalfSize = .5 - params.edgeRadius;

    const notchWave = (v) => {
        v = (1 / params.notchRadius) * v;
        v = Math.PI * Math.max(-1, Math.min(1, v));
        return params.notchDepth * (Math.cos(v) + 1.);
    }
    const notch = (pos) => notchWave(pos[0]) * notchWave(pos[1]);

    for (let i = 0; i < positionAttr.count; i++) {

        let position = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
        const subCube = new THREE.Vector3(Math.sign(position.x), Math.sign(position.y), Math.sign(position.z)).multiplyScalar(subCubeHalfSize);
        const addition = new THREE.Vector3().subVectors(position, subCube);

        if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.normalize().multiplyScalar(params.edgeRadius);
            position = subCube.add(addition);
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize) {
            addition.z = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.x = subCube.x + addition.x;
            position.y = subCube.y + addition.y;
        } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.y = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.x = subCube.x + addition.x;
            position.z = subCube.z + addition.z;
        } else if (Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
            addition.x = 0;
            addition.normalize().multiplyScalar(params.edgeRadius);
            position.y = subCube.y + addition.y;
            position.z = subCube.z + addition.z;
        }

        const offset = .23;
        if (position.y === .5) {
            position.y -= notch([position.x, position.z]);
        } else if (position.x === .5) {
            position.x -= notch([position.y + offset, position.z + offset]);
            position.x -= notch([position.y - offset, position.z - offset]);
        } else if (position.z === .5) {
            position.z -= notch([position.x - offset, position.y + offset]);
            position.z -= notch([position.x, position.y]);
            position.z -= notch([position.x + offset, position.y - offset]);
        } else if (position.z === -.5) {
            position.z += notch([position.x + offset, position.y + offset]);
            position.z += notch([position.x + offset, position.y - offset]);
            position.z += notch([position.x - offset, position.y + offset]);
            position.z += notch([position.x - offset, position.y - offset]);
        } else if (position.x === -.5) {
            position.x += notch([position.y + offset, position.z + offset]);
            position.x += notch([position.y + offset, position.z - offset]);
            position.x += notch([position.y, position.z]);
            position.x += notch([position.y - offset, position.z + offset]);
            position.x += notch([position.y - offset, position.z - offset]);
        } else if (position.y === -.5) {
            position.y += notch([position.x + offset, position.z + offset]);
            position.y += notch([position.x + offset, position.z]);
            position.y += notch([position.x + offset, position.z - offset]);
            position.y += notch([position.x - offset, position.z + offset]);
            position.y += notch([position.x - offset, position.z]);
            position.y += notch([position.x - offset, position.z - offset]);
        }

        positionAttr.setXYZ(i, position.x, position.y, position.z);
    }

    boxGeometry.deleteAttribute("normal");
    boxGeometry.deleteAttribute("uv");
    boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry);
    boxGeometry.computeVertexNormals();

    return boxGeometry;
}

function addDiceEvents(dice, diceIdx) {
    dice.body.forEach(b => {
        b.addEventListener("sleep", (e) => {

            b.allowSleep = false;

            // dice fall while simulating => check the results
            if (simulationOn) {
                const euler = new CANNON.Vec3();
                e.target.quaternion.toEuler(euler);

                const eps = .1;
                let isZero = (angle) => Math.abs(angle) < eps;
                let isHalfPi = (angle) => Math.abs(angle - .5 * Math.PI) < eps;
                let isMinusHalfPi = (angle) => Math.abs(.5 * Math.PI + angle) < eps;
                let isPiOrMinusPi = (angle) => (Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps);

                if (isZero(euler.z)) {
                    if (isZero(euler.x)) {
                        currentResult[diceIdx] = 1;
                    } else if (isHalfPi(euler.x)) {
                        currentResult[diceIdx] = 4;
                    } else if (isMinusHalfPi(euler.x)) {
                        currentResult[diceIdx] = 3;
                    } else if (isPiOrMinusPi(euler.x)) {
                        currentResult[diceIdx] = 6;
                    } else {
                        // landed on edge => wait to fall on side and fire the event again
                        b.allowSleep = true;
                        throwDice();
                    }
                } else if (isHalfPi(euler.z)) {
                    currentResult[diceIdx] = 2;
                } else if (isMinusHalfPi(euler.z)) {
                    currentResult[diceIdx] = 5;
                } else {
                    // landed on edge => wait to fall on side and fire the event again
                    b.allowSleep = true;
                    throwDice();
                }

                const thisDiceRes = currentResult[diceIdx];
                const anotherDiceRes = currentResult[diceIdx ? 0 : 1];
                const currentSum = currentResult.reduce((a, v) => a + v, 0);

                if (anotherDiceRes === 0 && thisDiceRes >= params.desiredResult) {
                    // throw again as the first one is already landed bad
                    throwDice();
                } else if (anotherDiceRes !== 0) {
                    if (params.desiredResult !== currentSum) {
                        // throw again until having a match
                        throwDice();
                    } else {
                        // match found => render using current startPos
                        simulationOn = false;
                        throwBtn.innerHTML = "throw!";
                        throwDice();
                    }
                }
            }

        });

    })
}


function render() {
    if (simulationOn) {
        simulation.step(1 / 60, 5000, 60);
    } else {
        physicsRender.fixedStep();
        for (const dice of diceArray) {
            dice.mesh.position.copy(dice.body[0].position)
            dice.mesh.quaternion.copy(dice.body[0].quaternion)
        }
        renderer.render(scene, camera);
    }
    requestAnimationFrame(render);
}

function updateSceneSize() {
    camera.aspect = containerEl.clientWidth / containerEl.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
    floorPositionUpdate();
}


function throwDice() {
    const quaternion = new THREE.Quaternion();

    if (simulationOn) {
        throwBtn.innerHTML = "calculating a throw...";
        currentResult = [0, 0];
        diceArray.forEach(d => {
            d.startPos = [Math.random(), Math.random(), Math.random()];
        });
    }

    diceArray.forEach((d, dIdx) => {
        quaternion.setFromEuler(new THREE.Euler(2 * Math.PI * d.startPos[0], 0, 2 * Math.PI * d.startPos[1]));
        const force = 6 + 3 * d.startPos[2];

        const b = simulationOn ? d.body[1] : d.body[0];
        b.position = new CANNON.Vec3(3, 5 + dIdx, 2);
        b.velocity.setZero();
        b.angularVelocity.setZero();
        b.applyImpulse(
            new CANNON.Vec3(-force, force, 0),
            new CANNON.Vec3(0, 0, -.5)
        );
        b.quaternion.copy(quaternion);
        b.allowSleep = true;
    });

}

function createControls() {
    const gui = new GUI();
    gui
        .add(params, "desiredResult", 2, 12, 1)
        .name("result")
    const btnControl = gui
        .add(params, "throw")
        .name("throw!")
    throwBtn = btnControl.domElement.querySelector("button > .name");
}

//crear tablero
const tableroGeometry = new THREE.PlaneGeometry(20, 20);
const tableroMaterial = new THREE.MeshBasicMaterial({ color: 0x008000, side: THREE.DoubleSide });
const tablero = new THREE.Mesh(tableroGeometry, tableroMaterial);
tablero.rotation.x = -Math.PI / 2; // Girar para que quede plano
scene.add(tablero);

// Datos de las casillas
const casillasNombres = [
    "Inicio", "Mediterranean Ave", "Comunidad 1", "Baltic Ave", "Impuesto 1",
    "Estación 1", "Oriental Ave", "Suerte 1", "Vermont Ave", "Connecticut Ave",
    "Cárcel", "St. Charles Place", "Electricidad", "States Ave", "Virginia Ave",
    "Estación 2", "St. James Place", "Comunidad 2", "Tennessee Ave", "Nueva York Ave",
    "Parking Libre", "Kentucky Ave", "Suerte 2", "Indiana Ave", "Illinois Ave",
    "Estación 3", "Atlantic Ave", "Ventnor Ave", "Agua", "Marvin Gardens",
    "Ve a la Cárcel", "Pacific Ave", "North Carolina Ave", "Comunidad 3", "Pennsylvania Ave",
    "Estación 4", "Suerte 3", "Park Place", "Impuesto 2", "Boardwalk"
];

// Crear las casillas
const casillas = [];
const casillasGroup = new THREE.Group();
const casillaSize = 2;
let index = 0;
const boardSize = 20; // Tamaño del tablero (20x20)

for (let i = 0; i < propiedades.length; i++) {
    crearCasilla(i * casillaSize - boardSize / 2, -boardSize / 2, propiedades[i]);
}

//trabajar solo con la primera fila para mas precision
/*for (let i = 1; i < 11; i++) {
    // Lado derecho
    crearCasilla(boardSize / 2, i * casillaSize - boardSize / 2, casillasNombres[index++]);
}
for (let i = 1; i < 11; i++) {
    // Parte superior
    crearCasilla(boardSize / 2 - i * casillaSize, boardSize / 2, casillasNombres[index++]);
}
for (let i = 1; i < 10; i++) {
    // Lado izquierdo (sin repetir esquina)
    crearCasilla(-boardSize / 2, boardSize / 2 - i * casillaSize, casillasNombres[index++]);
}
*/
// Agregar las casillas a la escena
scene.add(casillasGroup);

function crearCasilla(x, y, propiedad) {
    const geometry = new THREE.BoxGeometry(casillaSize, 0.2, casillaSize);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const casilla = new THREE.Mesh(geometry, material);
    casilla.position.set(x, 0.1, y);
    
    // Asociar la propiedad a la casilla
    casilla.userData = { propiedad };
    
    casillas.push(casilla);
    casillasGroup.add(casilla);
}

// Raycaster para detectar clics
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(casillas);

    if (intersects.length > 0) {
        const casillaSeleccionada = intersects[0].object;
        const propiedad = casillaSeleccionada.userData.propiedad;

        if (propiedad) {
            propiedad.mostrarInfo(); // Muestra la info en la consola
            alert(`📍 ${propiedad.nombre}\n💰 Precio de compra: $${propiedad.precioCompra}\n🏠 Precio de alquiler: $${propiedad.precioAlquiler}`);
            casillaSeleccionada.material.color.set(0xff0000);
        }
    }
});
// Variables para la rotación de la cámara con el mouse
let isMouseDown = false;
let previousMousePosition = { x: 0, y: 0 };

// Eventos para detectar cuándo el mouse está presionado
window.addEventListener("mousedown", () => isMouseDown = true);
window.addEventListener("mouseup", () => isMouseDown = false);

// Evento para rotar la cámara con el mouse
window.addEventListener("mousemove", (event) => {
    if (isMouseDown) {
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;

        // Rotación horizontal (eje Y)
        camera.rotation.y -= deltaX * 0.002;

        // Rotación vertical (eje X)
        camera.rotation.x -= deltaY * 0.002;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x)); // Limitar rotación vertical
    }

    previousMousePosition = { x: event.clientX, y: event.clientY };
});

// Movimiento de la cámara relativo a su orientación
const moveSpeed = 0.5;
const keys = { w: false, a: false, s: false, d: false };

// Eventos de teclado (sin cambios)
window.addEventListener("keydown", (event) => {
    if (event.key === 'w') keys.w = true;
    if (event.key === 'a') keys.a = true;
    if (event.key === 's') keys.s = true;
    if (event.key === 'd') keys.d = true;
});

window.addEventListener("keyup", (event) => {
    if (event.key === 'w') keys.w = false;
    if (event.key === 'a') keys.a = false;
    if (event.key === 's') keys.s = false;
    if (event.key === 'd') keys.d = false;
});

// Función para mover la cámara (CORREGIDA)
function moveCamera() {
    // Obtener vectores de dirección desde la matriz de la cámara
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    // Extraer direcciones desde la matriz de la cámara
    camera.matrixWorld.extractBasis(right, new THREE.Vector3(), forward);
    forward.normalize();
    right.normalize();

    // Aplicar movimiento
    if (keys.w) camera.position.add(forward.multiplyScalar(-moveSpeed)); // Adelante
    if (keys.s) camera.position.add(forward.multiplyScalar(moveSpeed));  // Atrás
    if (keys.a) camera.position.add(right.multiplyScalar(-moveSpeed));   // Izquierda
    if (keys.d) camera.position.add(right.multiplyScalar(moveSpeed));    // Derecha
}

// Animación (sin cambios)
function animate() {
    requestAnimationFrame(animate);
    moveCamera();
    renderer.render(scene, camera);
}
animate();