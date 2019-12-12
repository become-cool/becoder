if(typeof(Serial1)=="undefined") {
    var Serial1 = { write: function(){} }
    var debug = true
}
else{
    var debug = false
}

function initAllServos() {
    var byte1 = 500&255
    var byte2 = (500>>8)&255
    var pack = fillChecksum([10,15,19,161,9,
        3,byte1,byte2,
        4,byte1,byte2,
        5,byte1,byte2,
        0])
    Serial1.write(pack)
}

const RAD2DEG = 180 / Math.PI

var la = 6 * 8
var lb = 10 * 8
var lc = 26
var ld = 16
var le = Math.sqrt( (lb+lc)*(lb+lc) + ld*ld )
debug && console.log("le", le)

var xMin = -55
var xMax = 55
var yMin = 100
var yMax = 140

var curPos = [0, 100]
var velocity = 500
var subdivide = 3
var velocity_h = 300
var velocity_v = 100

var strokeLength = 10
var strokeWidth = 6
var fontSpace = 6

var _penDown = 340
var _penUp = 200
var _eraserDown = 320
var _eraserUp = 100

var isPenDown = false

var fontmap = {
    "0": [
        0,0, 1,0 ,
        1,0, 1,2 ,
        1,2, 0,2 ,
        0,2, 0,0 ,
    ] ,
    "1": [ 0,0, 0,2 ],
    "2": [
        0,0, 1,0 , 
        1,0, 1,1 ,
        1,1, 0,1 , 
        0,1, 0,2 ,
        0,2, 1,2
    ] ,
    "3": [
        0,0, 1,0 , 
        1,0, 1,1 , 
        1,1, 0,1 , 
        1,1, 1,2 , 
        1,2, 0,2 , 
    ] ,
    "4": [
        0,0, 0,1 ,
        0,1, 1,1 ,
        1,0, 1,2 ,
    ] ,
    "5": [
        1,0, 0,0 , 
        0,0, 0,1 ,
        0,1, 1,1 , 
        1,1, 1,2 ,
        1,2, 0,2
    ] ,
    "6": [
        1,0, 0,0 , 
        0,0, 0,2 ,
        0,2, 1,2 , 
        1,2, 1,1 ,
        1,1, 0,1
    ] ,
    "7": [
        0,0, 1,0 , 
        1,0, 1,2
    ] ,
    "8": [
        0,1, 0,0 , 
        0,0, 1,0 ,
        1,0, 1,1 ,
        1,1, 0,1 ,
        0,1, 0,2 ,
        0,2, 1,2 ,
        1,2, 1,1 ,
    ] ,
    "9": [
        1,1, 0,1 , 
        0,1, 0,0 , 
        0,0, 1,0 ,
        1,0, 1,2 ,
    ] ,
    ":": [
        1,1, 1,1 ,
        1,2, 1,2 ,
    ] ,
}

// 根据三角形三边，计算角度
// a 为对边， b, c 为两邻边
function angleBy3Sides (a,b,c) {
    var rad = Math.acos( ( b*b + c*c - a*a)/(2*b*c) )
    if(rad<0)
        rad+= Math.PI
    return rad
}
// 根据两边长和夹角，计算三角形对边长
// A 为 b,c 两边的夹角
function sideBy2Sides1Angle(A, b, c) {
    return Math.sqrt( b*b+c*c - Math.cos(A)* 2*b*c )
}

function point2theta (x, y, force) {
    if(!force) {
        if(x>xMax || x<xMin){
            console.log(xMin, "<= x("+x+") <=", xMax)
            return
        }
        if(y>yMax || y<yMin){
            console.log(yMin, "<= y("+y+") <=", yMax)
            return
        }
    }

    var f = Math.sqrt(x*x + y*y)
    debug && console.log("f",f)

    var alpha1 = angleBy3Sides(le, la, f)

    var beta1 = angleBy3Sides(f, le, la)
    var beta2 = angleBy3Sides(ld, le, lb+lc)
    var beta3 = beta1 - beta2
    
    debug && console.log("beta1", beta1*RAD2DEG)
    debug && console.log("beta2", beta2*RAD2DEG)
    debug && console.log("beta3", beta3*RAD2DEG)

    var lg = sideBy2Sides1Angle(beta3, lb, la)
    var alpha2 = angleBy3Sides(lb, la, lg)

    var gamma = Math.atan(y/x)
    if(x<0) {
        gamma = Math.PI + gamma
    }

    var theta = gamma + alpha1 - alpha2
    var ret = [theta+alpha2, theta-alpha2]
    
    debug && console.log("gamma", gamma*RAD2DEG)
    debug && console.log("gamma", gamma*RAD2DEG)
    debug && console.log("theta", theta*RAD2DEG)
    debug && console.log("alpha2", alpha2*RAD2DEG)
    console.log(x, y, "=>", ret[0]*RAD2DEG, ret[1]*RAD2DEG)

    return ret
}
function radToPWM(rad) {
    return Math.round( (rad/(2*Math.PI)) * 2000 ) + 500
}
function degToPWM(deg) {
    return Math.round( (deg/360) * 2000 ) + 500
}
function _moveTo(pos) {
    var theta = point2theta(pos[0], pos[1])
    var pwm1 = radToPWM(theta[0])
    var pwm2 = radToPWM(theta[1])
    console.log(pwm1, pwm2)
    var pack = fillChecksum([10,15,19,161,6,
            3,pwm2&255,(pwm2>>8)&255,
            4,pwm1&255,(pwm1>>8)&255,
            0])
    Serial1.write(pack)
    curPos = pos
}

async function moveTo(to) {
    var from = curPos;
    var dx = to[0] - from[0];
    var dy = to[1] - from[1];
    var d = Math.sqrt(dx * dx + dy * dy);
    var totalSteps = Math.ceil(d / subdivide);
    var stepX = dx * (subdivide / d);
    var stepY = dy * (subdivide / d);
    var stepMS = 1000 * subdivide / velocity;

    for(var step=0; step<totalSteps; step++){
        if (step >= totalSteps-1) {
            curPos = to;
        }
        else {
            curPos = [from[0] + stepX * step, from[1] + stepY * step];
        }
        
        _moveTo(curPos);
        await delay(stepMS)
    }
}

function fillChecksum(pack) {
    var sum = 0
    for(var i=0;i<pack.length-1; i++) {
        sum^= pack[i]
    }
    pack[pack.length-1] = sum
    return pack
}

function delay(ms) {
    return new Promise(resolve=>setTimeout(()=>{
        resolve()
    }, ms))
}

function setServoPWM(id, angle) {
    var pwm = degToPWM(angle)
    console.log(pwm)
    var byte1 = pwm&255
    var byte2 = (pwm>>8)&255
    var pack = fillChecksum([10,15,19,161,3,
        id,byte1,byte2,
        0])
    Serial1.write(pack)
}

function pen(s) {
    setServoPWM(2, s)
    return delay(500)
}
function penDown(s) {
    isPenDown = true
    return pen(_penDown)
}
function penUp(s) {
    isPenDown = false
    return pen(_penUp)
}
function eraseUp() {
    isPenDown = false
    return pen(_eraserUp)
}
function eraseDown() {
    isPenDown = false
    return pen(_eraserDown)
}

async function printText(char, at) {
    if(!fontmap[char]){
        return
    }
    if(!at){
        at = [xMin, yMax]
    }

    if(isPenDown) {
        await penUp()
    }
    await moveTo(at)

    var font = fontmap[char]

    for(var i=0;i<font.length;i+=4) {
        var start = [ at[0] + strokeWidth*font[i+0], at[1] - strokeLength*font[i+1] ]
        var end = [ at[0] + strokeWidth*font[i+2], at[1] - strokeLength*font[i+3] ]
        
        if( curPos[0]!=start[0] || curPos[1]!=start[1]) {
            if(isPenDown) {
                await penUp()
            }
            await moveTo(start)
        }

        if(!isPenDown){
            await penDown()
        }

        await moveTo(end)
        await delay(200)
    }

    await penUp()
}
function printString(text, at) {
    if(!at){
        at = [xMin, yMax]
    }
    
    var task = printText(text[0], at)
    for(var i=1; i<text.length; i++) {
        (function(i){
            task = task.then(()=> {
                _at = [ at[0]+i*(strokeWidth+fontSpace), at[1] ]
                // console.log("")
                // console.log(">>",_at)
                // console.log("draw text",text[i])
                return printText(text[i], _at) 
            })
        }) (i)
    }
    return task
}

async function erase() {

    await eraseUp()
    await moveTo([45,100])
    await eraseDown()
    
    for(var i=0; i<3; i++) {
        await moveTo([-55,120])
        await moveTo([50,120])
    }
    for(var i=0; i<3; i++) {
        await moveTo([-55,130])
        await moveTo([50,130])
    }
    for(var i=0; i<3; i++) {
        await moveTo([-55,140])
        await moveTo([50,140])
    }

    await moveTo([45,100])
    await eraseUp()
}

debug && point2theta( 0, 120, true )