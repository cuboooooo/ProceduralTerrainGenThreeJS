import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js'

//globals
let stats, controls, renderer, camera, scene
var UVmap;

// may want to manip that later

function setup() {
   
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
renderer = new THREE.WebGLRenderer({
    antialias: true
});
stats = Stats(); document.body.appendChild(stats.dom);

renderer.setSize(400, 400);
document.body.appendChild(renderer.domElement)
renderer.shadowMap.enabled = true;

controls = new OrbitControls( camera, renderer.domElement );

scene.background = new THREE.Color().setHSL( 0, 0, 0.3 );

const ambLight = new THREE.AmbientLight(new THREE.Color("rgb(253,251,211)"))
ambLight.intensity = 0.4
scene.add(ambLight)   


// add sunlight 

const dirLight = new THREE.DirectionalLight(new THREE.Color("rgb(255,255,255)"), 1)
dirLight.position.set(10,10,10)
dirLight.target.position.set(0,0,0)
scene.add(dirLight)
scene.add(dirLight.target)

// add a sphere at 10 10 10?


// SETUP COMPLETE, MOVE TO REAL SHIT

window.heightMap = []
window.moistureMap = []
window.lenx = 600
window.leny = 600

// window. makes a global, needed for the noise filler functions
window.noiseLevel = 5 // lower for more oceans
window.noiseMulti = 100; // doesnt affect it
window.noiseScale = 0.01; // bigger makes more detailed/chaotic 0.08
window.gridW = 100;
window.gridH = 100;
window.noiseCurve = 2.6; // makes higher highs and lower lows 2.3

let waterLevel = 2.7 // sets the hieght of the water plane.
// waterLevel COULD be calculated if I make the UV interp functions with variables
let noiseLowerBound = 2
let noiseUpperBound = 12
window.debugClipping = false

let moving = false; // makes the world infinitely generate!
let timeScale = 0.2; // Speed at which world moves, 0.2

heightMap = new Array(lenx*leny)
moistureMap = new Array(lenx*leny)
console.log(heightMap)
fillHeightWithNoise()
fillMoistureWithNoise()

camera.position.z = 60
camera.position.x = 60
camera.position.y = 35

// CREATE RECTS
const pw = gridW
const ph = gridH
const wsegs = lenx
const hsegs = leny
const planeGeo = new THREE.PlaneGeometry(pw, ph, wsegs, hsegs);

// displace the vertices based on height data
const colors = []

for (let i = 0; i < planeGeo.attributes.position.count; i++) {
   
    const vertex = new THREE.Vector3()
    vertex.fromBufferAttribute(planeGeo.attributes.position, i);
    
    vertex.z = heightMap[i]

    planeGeo.attributes.position.setXYZ(i, vertex.x, vertex.y, vertex.z);
   
    //assign vertex color
    let UVheight = Math.floor(interp(heightMap[i], noiseLowerBound, noiseUpperBound, 0, 100))
    let UVmoist = Math.floor(interp(moistureMap[i], noiseLowerBound, noiseUpperBound, 0, 100))
    let UVPixel = getPixel(100-UVmoist, 100-UVheight)
    let r = interp(UVPixel[0], 0,255,0,1)
    let g = interp(UVPixel[1], 0,255,0,1)
    let b = interp(UVPixel[2], 0,255,0,1)
    const color = new THREE.Color(r,g,b);
    colors.push(color.r, color.g, color.b)
}

planeGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors,3))

planeGeo.computeVertexNormals()
planeGeo.attributes.position.needsUpdate = true;

const planeMat = new THREE.MeshLambertMaterial({
    vertexColors: true
    // side: THREE.DoubleSide // renders both sides
})
const wholeMap = new THREE.Mesh(planeGeo, planeMat)

wholeMap.rotation.x = -Math.PI /2

scene.add(wholeMap)

// draw water level
// since three.js is actually competent, i can make this water way cooler later
const waterGeo = new THREE.PlaneGeometry(pw, ph, 1,1)
// const waterMat = new THREE.MeshLambertMaterial({
//     color: 0x0000ff,
//     transparent:true,
//     opacity: 0.3,
// }) // Lambertian Materials are much faster tho

const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x0000ff,
    transparent: true,
    opacity: 0.3
    // transmission: 0.1,
    // thickness: 1.5,
    // roughness: 0.3
})
const water = new THREE.Mesh(waterGeo, waterMat);
water.rotation.x = -Math.PI/2
water.position.y = waterLevel
scene.add(water)


// END RECTS



renderer.setAnimationLoop(loop);
}


function fillHeightWithNoise(){
    noise.seed(Math.random())
    let strength2 = 0.75
    let strength3 = 0.50 // i spelled that wrong
    let strength4 = 0.25
    for (let x = 0; x < lenx; x++) {
        for (let y = 0; y < leny; y++) {
        let e = noiseLevel * noise.perlin2(x * noiseScale, y * noiseScale)+1 //+
              //noiseLevel*strength2 * (noise.perlin2(x * noiseScale/strength2, y * noiseScale/strength2)+1) +
              // noiseLevel*strength2 * (noise.perlin2(x * noiseScale/strength3, y * noiseScale/strength3)+1) +
              // noiseLevel*strength4 * (noise.perlin2(x * noiseScale/strength4, y * noiseScale/strength4)+1);
          e = (e / (1 + strength2 + strength3 + strength4));
          e = Math.pow(e, noiseCurve)
          heightMap[x + y * lenx] = e
          }
      }
}
function fillMoistureWithNoise(){
    noise.seed(Math.random())
    let strength2 = 0.75
    let strength3 = 0.50 // i spelled that wrong
    let strength4 = 0.25
    for (let x = 0; x < lenx; x++) {
        for (let y = 0; y < leny; y++) {
            let e = noiseLevel * noise.perlin2(x * noiseScale, y * noiseScale) +
                  noiseLevel*strength2 * (noise.perlin2(x * noiseScale/strength2, y * noiseScale/strength2)+1) +
                  noiseLevel*strength2 * (noise.perlin2(x * noiseScale/strength3, y * noiseScale/strength3)+1) +
                  noiseLevel*strength4 * (noise.perlin2(x * noiseScale/strength4, y * noiseScale/strength4)+1);
              e = (e / (1 + strength2 + strength3 + strength4));
              e = Math.pow(e, noiseCurve)
          moistureMap[x + y * lenx] = e
          }
      }
}


function loop() {
    stats.update()
    controls.update()

    renderer.render(scene, camera);
}

function loadImage(){
    const loader = new THREE.TextureLoader()
    loader.load('biome.png', function(texture){
        const image = texture.image;
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height

        const context = canvas.getContext('2d')
        context.drawImage(image,0,0)

        const imageData = context.getImageData(0,0,canvas.width,canvas.height)
        UVmap = imageData.data
        

        setup()

        
    })
}

function interp(val, min, max, newMin, newMax){
    return ( (val - min)/ (max - min) ) * (newMax - newMin) + newMin
  }

function getPixel(x,y){
    let idxR = 4*(x + y*100)

    // DEBUGGING, shows clipping
    if(debugClipping){
        if (idxR < 0){
            return [255,0,0]
        }
        if (idxR > 40000){
            return [0,255,0]
        }
    }

    if (idxR < 0){ // snowy mountains?
        return [255,255,255]
    }

    idxR = idxR < 0 ? 0 : idxR
    idxR = idxR > 40000 ? 40000-4 : idxR
    
    let idxG = idxR+1
    let idxB = idxR+2
    
    return [UVmap[idxR],UVmap[idxG],UVmap[idxB]]
}



loadImage() // runs setup upon completion.
