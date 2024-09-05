import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js'


// v5 plans:
// // make UI elements for all variables, no need for live yet, just on the next refresh.
// // // (or warn that for live variable editing, a lower resolution is needed)

// // make it so that when you scale down the resolution, it still looks good. scale down to 200 to see what i mean.
// // // (mostly has to do with noiseScale, islandBias, and noiseCurve)

// // create many different CSS UV maps to choose from
// // // strictly elevation, strictly humidity, etc.
// // // like try turning the discrete one into a smooth by blurring it

// // Elevation noise artifacts
// // // If you turn up the noiseScale to like 0.01 theres all these funny little
// // // islands. Its like the islandBias function ignores the like 8th octave or something funny

// // Water plane calulation
// // // the water plane height is currently hardcoded and it breaks when you change the noise level
// // // i think if you reverse engineer the noise to uv function, you can find the height at which the 
// // // UV starts sampling water, and you can just use that to figure out the height.



// Future plans:
// // **LIVE** CUSTOMIZATION
// // // instead of recalculating all values, you could find a way to keep 
// // // a copy of the original noise? and then if you change the power you 
// // // just redo the power function??? idk.

// // Moving terrain
// // // (should only need to update (height+width) # of noise values, 
// // // not too intensive. do NOT refresh the whole array, push and pop.)

// // Climate? 
// // // (poles are colder, mountaintops are colder) (requires a rectangular big map i feel like)

// // Partial rendering
// // // Generate a MASSIVE map. HUGE. then render it to a 2d minimap, 
// // // wherever you hover over, a 3d render of that part is displayed.

// // Trees?
// // // So many approaches to this, also depends on scale, difficult, but doable
// // //  Higher frequency noise mixed with the moisture map

// // Moving water??? (or physical)
// // // So much more intensive but man would it be sick
// // // Or just use a physical material and make it 
// // // reflective and rough and whatnot. (thickness too for refraction)



// // // // // // // // // // // //
//       CUSTOM VARIABLES        //
// // // // // // // // // // // //

let stats, controls, renderer, camera, scene
var UVmap;

// DEBUG SWITCHES
window.debugClipping = false
window.debugNoiseFunctions = true // honestly just cool, i keep it on
window.debugUVMap = true
window.debugPlane = false

// UV MAP VARIABLES
window.UVwidth = 200 // change for more detailed UV values
window.UVheight = 200
window.discrete = false // discrete vs smooth biomes
window.css = true // css vs png UVmap (css is just better though...)
window.waterBumpVal = 0.4 // Forces the noise values into a wider range, 
window.peakBumpVal = 1  // so that even if the noise never hits 1, it still draws some white peaks.
                        // turn window.debugClipping = true to see its work.
                        // or just edit the gradient now that its css 🤪

// PLANE VARIABLES
window.lenx = 1200 // quality of plane
window.leny = 1200 // quality of plane
window.gridW = 100; // size of plane in world (doesnt really change anything if you do...)
window.gridH = 100; // size of plane in world (mostly just flattens it, which kinda looks nice tbh) 
window.waterPlaneLevel = 20*0.252// sets the hieght of the water plane.

// CANVAS ELEMENT VARIABLES
window.canvasW = 400 // size of canvas element
window.canvasH = 400 // size of canvas element

// NOISE VARIABLES
window.noiseLevel = 20 // how much to draw out the 0-1 values in 3d
window.noiseScale = 0.003; // bigger values = more detailed/more map 

// Strengths of the different octaves of noise
window.strength1 = 1
window.strength2 = 0.50
window.strength4 = 0.25
window.strength8 = 0.12
window.strength16 = 0.06
window.strength32 = 0.03
window.noiseCurve = 2; // makes higher highs and lower lows 

// ISLAND BIAS VARIABLES
window.islandBias = true
window.EuclideanSquared = true // else, SquareBump
window.islandBiasMix = 0.5 // value for how much to emphasise the island bias. 0 is original, 1 is max.
window.edgeClearance = 1.37 // 1 is regular, higher gives more water around edges



// loadImage() is called first, and setup() is called after that
function setup() {
   
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
renderer = new THREE.WebGLRenderer({
    antialias: true
});
stats = Stats(); document.body.appendChild(stats.dom);

renderer.setSize(canvasW, canvasH);
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

// let moving = false; // makes the world infinitely generate!
// let timeScale = 0.2; // Speed at which world moves, 0.2


camera.position.z = 60
camera.position.x = 60
camera.position.y = 35

// CREATE MAP GEOMETRY

createAndDrawPlane()

if (debugNoiseFunctions) createNoiseCanvases();


// draw water level (ONLY HAPPENS IN THIS SETUP FUNCTION)
if (!debugPlane) {
    // since three.js is actually competent(COUGH P5JS), i can make this water way cooler later
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
}

renderer.setAnimationLoop(loop);
}


function fillHeightWithNoise(){
    noise.seed(Math.random())

    // strengths 1-6 declared in header
    
    
    for (let x = 0; x < lenx; x++) {
        for (let y = 0; y < leny; y++) {
        let e = strength1 * (noise.simplex2(x * noiseScale, y * noiseScale)+1)/2 + // noise func return [-1,1] and i need [0,1] so (noise+1)/2 😁
                strength2 * (noise.simplex2(x * 2*noiseScale, y * 2*noiseScale)+1)/2 +
                strength4 * (noise.simplex2(x * 4*noiseScale, y * 4*noiseScale)+1)/2 +
                strength8 * (noise.simplex2(x * 8*noiseScale, y * 8*noiseScale)+1)/2 +
                strength16 * (noise.simplex2(x * 16*noiseScale, y * 16*noiseScale)+1)/2 +
                strength32 * (noise.simplex2(x * 32*noiseScale, y * 32*noiseScale)+1)/2;
          e = (e / (strength1 + strength2 + strength4 + strength8 + strength16 + strength32));
          e = Math.pow(e, noiseCurve)
         
          // mix declared in header
          // edgeClearence declared in header
          let nx = (2*edgeClearance)*x/(lenx)- edgeClearance
          let ny = (2*edgeClearance)*y/(leny)-edgeClearance
          if(islandBias){
            let d
            if(EuclideanSquared){
                //Euclidean Squared
                d = Math.min(1, ((nx)**2 + (ny)**2)/(2**0.5), )
            } else {
                // Square Bump
                d = 1 - (1 - (nx)**2 * (ny)**2)
            }
            e = lerp(e, 1-d, islandBiasMix)
          }
          heightMap[x + y * lenx] = e
          }
      }
}
function fillMoistureWithNoise(){
    // these noise functions return [-1,1], so i need to +1 then /2
    // could copy from HeightMap filler, but i prefer big blobby biomes
    noise.seed(Math.random())


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

  function lerp( a, b, alpha ) {
    return a + alpha * ( b - a )
}

function getPixel(x,y){
    let idxR = 0

    // DEBUGGING, shows clipping
    if(debugClipping){
        idxR = 4*(x + y*UVCanvas.height)

        if (idxR < 0){
            return [255,0,0]
        }
        if (idxR > UVCanvas.height*UVCanvas.width*4){
            return [0,255,0]
        }
    } else {
        y = y<0 ? 0 : y
        x = x<0 ? 0 : x
        y = y>UVCanvas.height-1 ? UVCanvas.height-1 : y
        x = x>UVCanvas.width-1 ? UVCanvas.width-1 : x

        idxR = 4*(x + y*UVCanvas.height)
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
        if(debugNoiseFunctions)updateNoiseCanvases();
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
        if (!debugPlane){
        // waterBumpVal and peakBumpVal declared in header
        let UVheight = Math.floor(interp(heightMap[i], 0, 1, 0-UVCanvas.width*waterBumpVal, UVCanvas.height+UVCanvas.height*peakBumpVal)) // 0-1 doesnt actaully hit 1 very often, meaning you dont get fun snowy mountain peaks.
        let UVmoist = Math.floor(interp(moistMap[i], 0, 1, 0, UVCanvas.width))
        let UVPixel = getPixel(UVCanvas.width-UVmoist, UVCanvas.height-UVheight)
        let r = interp(UVPixel[0], 0,255,0,1)
        let g = interp(UVPixel[1], 0,255,0,1)
        let b = interp(UVPixel[2], 0,255,0,1)
        const color = new THREE.Color(r,g,b);
        colors.push(color.r, color.g, color.b)
        } else { // debugging plane vertices
            let idx = i
            if (Math.floor(i/leny) % 2 == 0) {idx+=1};
            if ((idx)%3==0){
                const color = new THREE.Color(1,0,0)
                colors.push(color.r, color.g, color.b)
            } else if (idx%3==1) {
                const color = new THREE.Color(0,1,0)
                colors.push(color.r, color.g, color.b)
            } else {
                const color = new THREE.Color(0,0,1)
                colors.push(color.r, color.g, color.b)
            }
        }
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
        canv1.width = 200
        canv1.height = 200
        document.body.appendChild(canv1)
        const ctx1 = canv1.getContext('2d');

        // create canvas 2
        const canv2 = document.createElement('canvas');
        canv2.id = "moist"
        canv2.width = 200
        canv2.height = 200
        document.body.appendChild(canv2)
        const ctx2 = canv2.getContext('2d');


        // DRAW UV CANVAS (yes i know this is in a weird place but its to preserve the page layout)
        // hook up to a debug conditional 

        if (debugUVMap) document.body.appendChild(UVCanvas);

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
    // biomeDiscrete.png for discrete biomes
    // biome.png for smooth/gradient biomes
    if (!css){
        let file
        const loader = new THREE.TextureLoader() 
        if (window.discrete) {file = "biomeDiscrete.png"}
        else {file = "biome.png"}
        loader.load(file, function(texture){
            const image = texture.image;
            window.UVCanvas = document.createElement('canvas')
            UVCanvas.width = image.width
            UVCanvas.height = image.height

            const context = UVCanvas.getContext('2d')
            context.drawImage(image,0,0)

            const imageData = context.getImageData(0,0,UVCanvas.width,UVCanvas.height)
            UVmap = imageData.data

            setup()

            
        })
    }
    else { // use CSS
        if (!window.discrete){
            window.UVCanvas = document.createElement('canvas')
            UVCanvas.width = UVwidth 
            UVCanvas.height = UVheight
            let ctx = UVCanvas.getContext('2d')

            let css = `background-size: 100% 100%;
                        background-position: 0px 0px,0px 0px,0px 0px;
                        background-image: linear-gradient(0deg, #070041FF 0%, #00000000 20%, #5C7EFFFF 20%, #FFFFFF00 99%),linear-gradient(0deg, #0000008C 20%, #FFFFFF00 60%, #FFFFFFFF 95%),linear-gradient(90deg, #FFFBBDFF 20%, #007900FF 100%);`
            // completely uneccesary parsing of CSS data so that I can keep using this tool https://colorgradient.dev/gradient-generator/
            // I use a lot of hard stops (e.g. two colors at one percent stop to switch colors) and that breaks things.
            // to fix this, lets say ur going black->blue->hardstop->white. order the colors like black -> hardstop ->blue ->white. just works
            css = css.split('\n')[2] // background-image line
            css = css.split("linear-gradient(")
            css.shift()
            for (let i = 0; i<css.length; i++){
                css[i] = css[i].split(",")
                if (i<css.length-1){
                    css[i].pop()
                }
            }
            for (let i = css.length-1; i >= 0; i--){
            // for (let i = 0; i < css.length; i++) {
                let grad = css[i]
                // grad[0] is the angle
                let angle = parseInt(grad[0].substring(0,grad[0].indexOf("deg"))) * (Math.PI/180)
                let endX = Math.round(UVCanvas.width * Math.sin(angle), 3)
                let endY = Math.round(UVCanvas.height * Math.cos(angle), 3)
                let gradient = ctx.createLinearGradient(0,endY,endX,0)

                // for(let j = 1; j < grad.length; j++){ // parse through color stops
                for(let j = grad.length-1; j > 0; j--) {
                    grad[j] = grad[j].substring(1)
                    let percent =parseInt(grad[j].substring(10,grad[j].length-1))/100;
                    let color = grad[j].substring(0,9);
                    gradient.addColorStop(percent, color);
                }
                ctx.fillStyle = gradient
                ctx.fillRect(0,0,UVCanvas.width, UVCanvas.height)

            }
            //document.body.appendChild(UVCanvas)
            const imageData = ctx.getImageData(0,0,UVCanvas.width,UVCanvas.height)
            UVmap = imageData.data
            setup()


        } else { // discrete biomes in css
            window.UVCanvas = document.createElement('canvas')
            UVCanvas.width = UVwidth 
            UVCanvas.height = UVheight
            let px = UVCanvas.width/100 // pixelX Scale
            let py = UVCanvas.height/100 // pixelY Scale
            let ctx = UVCanvas.getContext('2d')

            ctx.fillStyle = '#555555'
            ctx.fillRect(0*px,0*py, 10*px, 20*py)

            ctx.fillStyle = '#888888'
            ctx.fillRect(10*px,0*py, 20*px, 20*py)

            ctx.fillStyle = '#bbbbaa'
            ctx.fillRect(20*px,0*py, 50*px, 20*py)

            ctx.fillStyle = '#dddde4'
            ctx.fillRect(50*px,0*py, 100*px, 20*py)

            ctx.fillStyle = '#c9d29b'
            ctx.fillRect(0*px,20*py, 34*px, 40*py)

            ctx.fillStyle = '#889977'
            ctx.fillRect(34*px,20*py, 65*px, 39*py)

            ctx.fillStyle = '#99aa77'
            ctx.fillRect(65*px,20*py, 100*px, 39*py)

            ctx.fillStyle = '#c9d29b'
            ctx.fillRect(0*px,40*py, 17*px, 69*py)

            ctx.fillStyle = '#88aa55'
            ctx.fillRect(17*px,40*py, 49*px, 69*py)

            ctx.fillStyle = '#679459'
            ctx.fillRect(50*px,40*py, 82*px, 69*py)

            ctx.fillStyle = '#448855'
            ctx.fillRect(83*px,40*py, 100*px, 69*py)

            ctx.fillStyle = '#d2b98b'
            ctx.fillRect(0*px,70*py, 17*px, 87*py)

            ctx.fillStyle = '#88aa55'
            ctx.fillRect(17*px,70*py, 33*px, 87*py)

            ctx.fillStyle = '#559944'
            ctx.fillRect(34*px,71*py, 65*px, 87*py)

            ctx.fillStyle = '#337755'
            ctx.fillRect(66*px,70*py, 100*px, 87*py)

            ctx.fillStyle = '#a09077'
            ctx.fillRect(0*px,88*py, 100*px, 89*py)

            ctx.fillStyle = '#44447a'
            ctx.fillRect(0*px,90*py, 100*px, 99*py)

            const imageData = ctx.getImageData(0,0,UVCanvas.width,UVCanvas.height)
            UVmap = imageData.data
            setup()
        }

      }
    }



loadImage() // runs setup upon completion.
