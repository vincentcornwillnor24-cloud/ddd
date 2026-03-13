const WebSocket = require("ws")

const PORT = process.env.PORT || 3000
const wss = new WebSocket.Server({ port: PORT })

let players = {}
let bullets = []
let enemies = []

function broadcast(data){
const msg = JSON.stringify(data)

wss.clients.forEach(client=>{
if(client.readyState === WebSocket.OPEN){
client.send(msg)
}
})
}

function spawnEnemy(){
enemies.push({
id:Math.random().toString(36).substr(2,9),
x:500 + Math.random()*2000,
y:380,
vx:Math.random()<0.5?-1:1,
health:40
})
}

setInterval(()=>{
if(enemies.length < 6){
spawnEnemy()
}
},2000)

wss.on("connection",(ws)=>{

const id = Math.random().toString(36).substr(2,9)

players[id] = {
x:100,
y:100,
name:"player",
skin:"cyan",
team: Math.random()<0.5 ? "red" : "blue",
health:100,
coins:0,
kills:0
}

ws.on("message",(msg)=>{

let data
try{
data = JSON.parse(msg)
}catch{
return
}

if(data.type==="join"){
players[id].name = data.name
players[id].skin = data.skin
}

if(data.type==="move"){
players[id].x = data.x
players[id].y = data.y
}

if(data.type==="shoot"){

bullets.push({
x:data.x,
y:data.y,
vx:data.vx,
vy:data.vy,
owner:id
})

}

if(data.type==="chat"){
broadcast({
type:"chat",
name:players[id].name,
msg:data.msg
})
}

})

ws.on("close",()=>{
delete players[id]
})

})

setInterval(()=>{

// move bullets
for(let b of bullets){
b.x += b.vx
b.y += b.vy
}

// bullet → enemy
for(let i=bullets.length-1;i>=0;i--){

let b = bullets[i]

for(let e of enemies){

if(
b.x < e.x+30 &&
b.x+6 > e.x &&
b.y < e.y+30 &&
b.y+6 > e.y
){

e.health -= 20
bullets.splice(i,1)

if(e.health<=0){

let killer = players[b.owner]

if(killer){
killer.kills++
killer.coins += 5
}

e.health = 40
e.x = 500 + Math.random()*2000

}

break
}
}
}

// bullet → player
for(let i=bullets.length-1;i>=0;i--){

let b = bullets[i]

for(let pid in players){

let p = players[pid]

if(pid === b.owner) continue
if(players[b.owner].team === p.team) continue

if(
b.x < p.x+30 &&
b.x+6 > p.x &&
b.y < p.y+30 &&
b.y+6 > p.y
){

p.health -= 25
bullets.splice(i,1)

if(p.health<=0){

let killer = players[b.owner]

if(killer){
killer.kills++
killer.coins += 10
}

p.health = 100
p.x = 100
p.y = 100

}

break
}
}
}

// enemy AI
for(let e of enemies){

let target = null
let best = Infinity

for(let pid in players){

let p = players[pid]
let d = Math.abs(p.x - e.x)

if(d < best){
best = d
target = p
}

}

if(target){

if(target.x > e.x) e.vx = 1
else e.vx = -1

}

e.x += e.vx

}

// broadcast world
broadcast({
type:"state",
players:players,
enemies:enemies,
bullets:bullets
})

},50)

console.log("Cubi server running")
