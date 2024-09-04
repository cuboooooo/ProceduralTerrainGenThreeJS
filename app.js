import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js'

// to add:
// moving (should only need to update (height+width) # of noise values, not too intensive. do NOT refresh the whole array, push and pop.)
// island bias? (make the borders water)
// climate? (poles are colder, mountaintops are colder)
// tree placement? use higher frequency noise mixed with the moisture map





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
window.moistMap = []
window.lenx = 1200 // quality of plane (technically zooms it)
window.leny = 1200 // quality of plane

// window. makes a global, needed for the noise filler functions
window.noiseLevel = 20 // how much to draw out the 0-1 values in 3d
window.noiseScale = 0.003; // bigger makes more detailed/chaotic 0.08
window.gridW = 100; // size of plane
window.gridH = 100; // size of plane
window.noiseCurve = 2; // makes higher highs and lower lows 2.3

let waterPlaneLevel = noiseLevel*0.21// sets the hieght of the water plane.
// waterLevel COULD be calculated if I make the UV interp functions with variables
window.debugClipping = false

let moving = false; // makes the world infinitely generate!
let timeScale = 0.2; // Speed at which world moves, 0.2


camera.position.z = 60
camera.position.x = 60
camera.position.y = 35

// CREATE MAP GEOMETRY

createAndDrawPlane()

// heightMap = new Array(lenx*leny)
// moistMap = new Array(lenx*leny)
// fillHeightWithNoise()
// fillMoistureWithNoise()

// const pw = gridW
// const ph = gridH
// const wsegs = lenx-1 // I FUCKING FIXED IT I LOOKED FOR LIKE A WHOLE DAY
// const hsegs = leny-1 // AND IT WAS CUZ I DIDNT PUT -1 👹👹👹
// const planeGeo = new THREE.PlaneGeometry(pw, ph, wsegs, hsegs);

// // displace the vertices based on height data
// const colors = []


// planeGeo.attributes.position.count == lenx*leny // FALSE
// for (let i = 0; i < planeGeo.attributes.position.count; i++) {
   
//     const vertex = new THREE.Vector3()
//     vertex.fromBufferAttribute(planeGeo.attributes.position, i);
    
//     vertex.z = noiseLevel * heightMap[i]

//     planeGeo.attributes.position.setXYZ(i, vertex.x, vertex.y, vertex.z);
   
//     //assign vertex color
//     let waterBumpVal = 40 // what these do, is force the noise values into a wider range, 
//     let peakBumpVal = 100 // so that even if the noise never hits 1, it still draws some peaks.
//                         // turn window.debugClipping = true to see its work.
//     let UVheight = Math.floor(interp(heightMap[i], 0, 1, 0-waterBumpVal, 100+peakBumpVal)) // 0-1 doesnt actaully hit 1 very often, meaning you dont get fun snowy mountain peaks.
//     let UVmoist = Math.floor(interp(moistMap[i], 0, 1, 0, 100))
//     let UVPixel = getPixel(100-UVmoist, 100-UVheight)
//     let r = interp(UVPixel[0], 0,255,0,1)
//     let g = interp(UVPixel[1], 0,255,0,1)
//     let b = interp(UVPixel[2], 0,255,0,1)
//     const color = new THREE.Color(r,g,b);
//     colors.push(color.r, color.g, color.b)
// }

// planeGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors,3))

// planeGeo.attributes.position.needsUpdate = true;
// planeGeo.computeVertexNormals()

// const planeMat = new THREE.MeshLambertMaterial({
//     vertexColors: true,
//     side: THREE.DoubleSide // renders both sides, could avoid for more performance
// })
//  window.wholeMap = new THREE.Mesh(planeGeo, planeMat)

// wholeMap.rotation.x = -Math.PI /2

// scene.add(wholeMap)

createNoiseCanvases()


// draw water level
// since three.js is actually competent, i can make this water way cooler later
const waterGeo = new THREE.PlaneGeometry(gridW, gridH, 1,1)
const waterMat = new THREE.MeshLambertMaterial({
    color: 0x0000ff,
    transparent:true,
    opacity: 0.3,
}) // Lambertian Materials are much faster tho

// This could look sick if i figure it out
// const waterMat = new THREE.MeshPhysicalMaterial({
//     color: 0x0000ff,
//     transparent: true,
//     opacity: 0.3
//     // transmission: 0.1,
//     // thickness: 1.5,
//     // roughness: 0.3
// })
const water = new THREE.Mesh(waterGeo, waterMat);
water.rotation.x = -Math.PI/2
water.position.y = waterPlaneLevel
scene.add(water)

renderer.setAnimationLoop(loop);
}


function fillHeightWithNoise(){
    // these noise functions return [-1,1], so i need to +1 then /2
    noise.seed(Math.random())
    // 0-1
    let strength1 = 1
    let strength2 = 0.50
    let strength3 = 0.25
    let strength4 = 0.12

    for (let x = 0; x < lenx; x++) {
        for (let y = 0; y < leny; y++) {
        let e = strength1 * (noise.simplex2(x * noiseScale, y * noiseScale)+1)/2 +
                strength2 * (noise.simplex2(x * 2*noiseScale, y * 2*noiseScale)+1)/2 +
                strength3 * (noise.simplex2(x * 4*noiseScale, y * 4*noiseScale)+1)/2 +
                strength3/2 * (noise.simplex2(x * 8*noiseScale, y * 8*noiseScale)+1)/2 +
                strength3/4 * (noise.simplex2(x * 16*noiseScale, y * 16*noiseScale)+1)/2 +
                strength4/8 * (noise.simplex2(x * 32*noiseScale, y * 32*noiseScale)+1)/2;
          e = (e / (strength1 + strength2 + strength3 + strength4));
          e = Math.pow(e, noiseCurve)
          heightMap[x + y * lenx] = e
          }
      }
}
function fillMoistureWithNoise(){
    // these noise functions return [-1,1], so i need to +1 then /2
    // could copy from HeightMap filler, but i prefer big blobby biomes
    noise.seed(Math.random())
    let strength1 = 1
    let strength2 = 0.50
    let strength3 = 0.25
    let strength4 = 0.12

    for (let x = 0; x < lenx; x++) {
        for (let y = 0; y < leny; y++) {
            let e = strength1 * (noise.simplex2(x * noiseScale/2, y * noiseScale/2)+1)/2 +
            strength2 * (noise.simplex2(x * noiseScale, y * noiseScale)+1)/2;
          e = Math.pow(e, noiseCurve+1)
          moistMap[x + y * lenx] = e
          }
      }
}


function loop() {
    stats.update()
    controls.update()

    renderer.render(scene, camera);
}

function interp(val, min, max, newMin, newMax){
    return ( (val - min)/ (max - min) ) * (newMax - newMin) + newMin
  }

function getPixel(x,y){
    let idxR = 0

    // DEBUGGING, shows clipping
    if(debugClipping){
        idxR = 4*(x + y*100)

        if (idxR < 0){
            return [255,0,0]
        }
        if (idxR > 40000){
            return [0,255,0]
        }
    } else {
        y = y<0 ? 0 : y
        x = x<0 ? 0 : x
        y = y>99 ? 99 : y
        x = x>99 ? 99 : x

        idxR = 4*(x + y*100)
    }

    
    let idxG = idxR+1
    let idxB = idxR+2
    
    return [UVmap[idxR],UVmap[idxG],UVmap[idxB]]
}

document.addEventListener("keydown", onDocumentKeyDown, false);
function onDocumentKeyDown(event){
    var keyCode = event.which;
    if (keyCode == 82){
        scene.remove(wholeMap)
        createAndDrawPlane()
        updateNoiseCanvases()
    }
}

function createAndDrawPlane(){
        
    heightMap = new Array(lenx*leny)
    moistMap = new Array(lenx*leny)
    fillHeightWithNoise()
    fillMoistureWithNoise()
    
    const pw = gridW
    const ph = gridH
    const wsegs = lenx-1 // I FUCKING FIXED IT I LOOKED FOR LIKE A WHOLE DAY
    const hsegs = leny-1 // AND IT WAS CUZ I DIDNT PUT -1 👹👹👹
    const planeGeo = new THREE.PlaneGeometry(pw, ph, wsegs, hsegs);
    
    // displace the vertices based on height data
    const colors = []
    
    
    planeGeo.attributes.position.count == lenx*leny // FALSE
    for (let i = 0; i < planeGeo.attributes.position.count; i++) {
       
        const vertex = new THREE.Vector3()
        vertex.fromBufferAttribute(planeGeo.attributes.position, i);
        
        vertex.z = noiseLevel * heightMap[i]
    
        planeGeo.attributes.position.setXYZ(i, vertex.x, vertex.y, vertex.z);
       
        //assign vertex color
        let waterBumpVal = 40 // what these do, is force the noise values into a wider range, 
        let peakBumpVal = 100 // so that even if the noise never hits 1, it still draws some peaks.
                            // turn window.debugClipping = true to see its work.
        let UVheight = Math.floor(interp(heightMap[i], 0, 1, 0-waterBumpVal, 100+peakBumpVal)) // 0-1 doesnt actaully hit 1 very often, meaning you dont get fun snowy mountain peaks.
        let UVmoist = Math.floor(interp(moistMap[i], 0, 1, 0, 100))
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
     window.wholeMap = new THREE.Mesh(planeGeo, planeMat)
    
    wholeMap.rotation.x = -Math.PI /2
    
    scene.add(wholeMap)
    
    
    // water drawing only needs to happen in the main loop. 
    // since it doesnt change position on a map refresh, it can just stay.
    
}

function createNoiseCanvases() {
            // create canvas 1
        const canv1 = document.createElement('canvas');
        canv1.id = "height"
        canv1.width = 180
        canv1.height = 180
        document.body.appendChild(canv1)
        const ctx1 = canv1.getContext('2d');

        // create canvas 2
        const canv2 = document.createElement('canvas');
        canv2.id = "moist"
        canv2.width = 180
        canv2.height = 180
        document.body.appendChild(canv2)
        const ctx2 = canv2.getContext('2d');

        // set Image Data on canvas 1 to heightmap
        const imgData1 = ctx1.createImageData(canv1.width,canv1.height);

        for (let y=0; y < canv1.height; y++){
            for (let x=0; x < canv1.width; x++){
                let tx = Math.floor(interp(x,0,canv1.width,0,lenx)) // scale down the image
                let ty = Math.floor(interp(y,0,canv1.height,0,leny))
                const index = (tx+ty*lenx) 
                const value = heightMap[index]
                const pixelIndex = (x+y*canv1.height)*4
                const color = new THREE.Color().setHSL(0.325, 0.5, value)

                imgData1.data[pixelIndex] = color.r*255
                imgData1.data[pixelIndex+1] = color.g*255
                imgData1.data[pixelIndex+2] = color.b*255
                imgData1.data[pixelIndex+3] = 255
            }
        }
        ctx1.putImageData(imgData1, 0, 0)

        // set Image Data on canvas 2 to moistmap
        const imgData2 = ctx2.createImageData(canv2.width,canv2.height);

        for (let y=0; y < canv2.height; y++){
            for (let x=0; x < canv2.width; x++){
                let tx = Math.floor(interp(x,0,canv2.width,0,lenx)) // scale down the image
                let ty = Math.floor(interp(y,0,canv2.height,0,leny))
                const index = (tx+ty*lenx) 
                const value = moistMap[index]
                const pixelIndex = (x+y*canv2.height)*4
                const color = new THREE.Color().setHSL(0.616, 0.5, value)

                imgData2.data[pixelIndex] = color.r*255
                imgData2.data[pixelIndex+1] = color.g*255
                imgData2.data[pixelIndex+2] = color.b*255
                imgData2.data[pixelIndex+3] = 255
            }
        }
        ctx2.putImageData(imgData2, 0, 0)
}

function updateNoiseCanvases() {
            // create canvas 1
        const canv1 = document.getElementById('height');
        const ctx1 = canv1.getContext('2d');

        // create canvas 2
        const canv2 = document.getElementById('moist');
        const ctx2 = canv2.getContext('2d');

        // set Image Data on canvas 1 to heightmap
        const imgData1 = ctx1.createImageData(canv1.width,canv1.height);

        for (let y=0; y < canv1.height; y++){
            for (let x=0; x < canv1.width; x++){
                let tx = Math.floor(interp(x,0,canv1.width,0,lenx)) // scale down the image
                let ty = Math.floor(interp(y,0,canv1.height,0,leny))
                const index = (tx+ty*lenx) 
                const value = heightMap[index]
                const pixelIndex = (x+y*canv1.height)*4
                const color = new THREE.Color().setHSL(0.325, 0.5, value)

                imgData1.data[pixelIndex] = color.r*255
                imgData1.data[pixelIndex+1] = color.g*255
                imgData1.data[pixelIndex+2] = color.b*255
                imgData1.data[pixelIndex+3] = 255
            }
        }
        ctx1.putImageData(imgData1, 0, 0)

        // set Image Data on canvas 2 to moistmap
        const imgData2 = ctx2.createImageData(canv2.width,canv2.height);

        for (let y=0; y < canv2.height; y++){
            for (let x=0; x < canv2.width; x++){
                let tx = Math.floor(interp(x,0,canv2.width,0,lenx)) // scale down the image
                let ty = Math.floor(interp(y,0,canv2.height,0,leny))
                const index = (tx+ty*lenx) 
                const value = moistMap[index]
                const pixelIndex = (x+y*canv2.height)*4
                const color = new THREE.Color().setHSL(0.616, 0.5, value)

                imgData2.data[pixelIndex] = color.r*255
                imgData2.data[pixelIndex+1] = color.g*255
                imgData2.data[pixelIndex+2] = color.b*255
                imgData2.data[pixelIndex+3] = 255
            }
        }
        ctx2.putImageData(imgData2, 0, 0)
}



function loadImage(){
    const loader = new THREE.TextureLoader() 
    // biomeDiscrete.png for discrete biomes
    // biome.png for smooth/gradient biomes
    loader.load('biomeDiscrete.png', function(texture){
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



loadImage() // runs setup upon completion.
