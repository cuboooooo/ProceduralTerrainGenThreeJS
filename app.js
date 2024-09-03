import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js'

// want to make 2 more canvases and display the noise for height and moisture





//globals
let stats, controls, renderer, camera, scene
var UVmap;

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
window.lenx = 300 // quality of plane (technically zooms it)
window.leny = 300 // quality of plane

// window. makes a global, needed for the noise filler functions
window.noiseLevel = 1.8 // lower for more oceans
window.noiseMulti = 100; // doesnt affect it
window.noiseScale = 0.003; // bigger makes more detailed/chaotic 0.08
window.gridW = 100; // size of plane
window.gridH = 100; // size of plane
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
const wsegs = lenx-1 // I FUCKING FIXED IT I LOOKED FOR LIKE A WHOLE DAY
const hsegs = leny-1 // AND IT WAS CUZ I DIDNT PUT -1 👹👹👹
const planeGeo = new THREE.PlaneGeometry(pw, ph, wsegs, hsegs);

// displace the vertices based on height data
const colors = []



planeGeo.attributes.position.count == lenx*leny // FALSE
console.log(planeGeo.attributes.position.count, lenx*leny)
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

planeGeo.attributes.position.needsUpdate = true;
planeGeo.computeVertexNormals()

const planeMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide // renders both sides, could avoid for more performance
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


// DRAW THE NOISE FUNCTIONS TO THE ADDITIONAL CANVASES
// put under an if(debug) cond if neccesary

// create canvas 1
const canv1 = document.createElement('canvas');
canv1.width = lenx
canv1.height = leny
document.body.appendChild(canv1)
const ctx1 = canv1.getContext('2d');

// create canvas 2
const canv2 = document.createElement('canvas');
canv2.width = lenx
canv2.height = leny
document.body.appendChild(canv2)
const ctx2 = canv2.getContext('2d');

// set Image Data on canvas 1 to heightmap
const imgData1 = ctx1.createImageData(lenx,leny);

for (let y=0; y < leny; y++){
    for (let x=0; x < lenx; x++){
        const index = (x+y*lenx)
        const value = interp(heightMap[index], 0,16,0,1)
        const pixelIndex = index*4
        const color = new THREE.Color().setHSL(0.325, 0.5, value)

        imgData1.data[pixelIndex] = color.r*255
        imgData1.data[pixelIndex+1] = color.g*255
        imgData1.data[pixelIndex+2] = color.b*255
        imgData1.data[pixelIndex+3] = 255
    }
}
ctx1.putImageData(imgData1, 0, 0)

// set Image Data on canvas 2 to moistmap
const imgData2 = ctx2.createImageData(lenx,leny);

for (let y=0; y < leny; y++){
    for (let x=0; x < lenx; x++){
        const index = (x+y*lenx)
        const value = interp(moistureMap[index], 0,16,0,1)
        const pixelIndex = index*4
        const color = new THREE.Color().setHSL(0.616, 0.5, value)

        imgData2.data[pixelIndex] = color.r*255
        imgData2.data[pixelIndex+1] = color.g*255
        imgData2.data[pixelIndex+2] = color.b*255
        imgData2.data[pixelIndex+3] = 255
    }
}
ctx2.putImageData(imgData2, 0, 0)


renderer.setAnimationLoop(loop);
}


function fillHeightWithNoise(){
    noise.seed(Math.random())
    let strength2 = 0.75
    let strength3 = 0.50 // i spelled that wrong
    let strength4 = 0.25

    let offset = 0.01 // somehow fixes simplex
    for (let x = 0; x < lenx; x++) {
        for (let y = 0; y < leny; y++) {
        let e = noiseLevel * noise.simplex2((x+offset) * noiseScale, (y+offset) * noiseScale)+1 +
              noiseLevel*strength2 * (noise.simplex2((x+offset) * noiseScale/strength2, (y+offset) * noiseScale/strength2)+1) +
              noiseLevel*strength2 * (noise.simplex2((x+offset) * noiseScale/strength3, (y+offset) * noiseScale/strength3)+1) +
              noiseLevel*strength4 * (noise.simplex2((x+offset) * noiseScale/strength4, (y+offset) * noiseScale/strength4)+1);
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
            let e = noiseLevel * noise.simplex2(x * noiseScale, y * noiseScale) +
                  noiseLevel*strength2 * (noise.simplex2(x * noiseScale/strength2, y * noiseScale/strength2)+1) +
                  noiseLevel*strength2 * (noise.simplex2(x * noiseScale/strength3, y * noiseScale/strength3)+1) +
                  noiseLevel*strength4 * (noise.simplex2(x * noiseScale/strength4, y * noiseScale/strength4)+1);
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

    y = y<0 ? 0 : y
    x = x<0 ? 0 : x
    y = y>99 ? 99 : y
    x = x>99 ? 99 : x

    if (x>100 || x<0 || y < 0 || y>100){
        console.log(x,y)
    }

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

    
    let idxG = idxR+1
    let idxB = idxR+2
    
    return [UVmap[idxR],UVmap[idxG],UVmap[idxB]]
}



loadImage() // runs setup upon completion.
