const WebSocket = require("ws")
const fs = require("fs")

const PORT = process.env.PORT || 3000
const wss = new WebSocket.Server({ port:PORT })

let players = {}
let bullets = []
let grenades = []
let enemies = []
let boss = null

const shop = {
cap:10,
crown:50,
wizard:100
}

let accounts = {}

try{
accounts = JSON.parse(fs.readFileSync("accounts.json"))
}catch{}

function saveAccounts(){
fs.writeFileSync("accounts.json",JSON.stringify(accounts,null,2))
}

function broadcast(data){

const msg = JSON.stringify(data)

wss.clients.forEach(c=>{
if(c.readyState === WebSocket.OPEN){
c.send(msg)
}
})

}

function giveXP(p,amount){

p.xp += amount

let needed = p.level * 100

if(p.xp >= needed){
p.xp -= needed
p.level++
}

}

function spawnEnemy(){

enemies.push({
x:500 + Math.random()*2000,
y:380,
vx:Math.random()<0.5?-1:1,
health:40
})

}

setInterval(()=>{
if(enemies.length < 6) spawnEnemy()
},2000)

setInterval(()=>{

if(!boss){

boss = {
x:1500,
y:300,
health:500
}

}

},120000)

wss.on("connection",(ws)=>{

const id = Math.random().toString(36).substr(2,9)

players[id] = {
x:100,
y:100,
name:"player",
skin:"cyan",
team:Math.random()<0.5?"red":"blue",

health:100,
coins:0,
kills:0,

xp:0,
level:1,

hat:"none",
hats:["none"]
}

ws.on("message",(msg)=>{

let data

try{
data = JSON.parse(msg)
}catch{
return
}

if(data.type==="login"){

if(accounts[data.name]){
players[id] = accounts[data.name]
}else{
accounts[data.name] = players[id]
}

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

if(data.type==="grenade"){

grenades.push({
x:data.x,
y:data.y,
vx:data.vx,
vy:-8,
owner:id,
timer:60
})

}

if(data.type==="buyHat"){

let p = players[id]

let price = shop[data.hat]

if(price && p.coins >= price){

p.coins -= price
p.hats.push(data.hat)

}

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

accounts[players[id].name] = players[id]
saveAccounts()

delete players[id]

})

})

setInterval(()=>{

for(let b of bullets){
b.x += b.vx
b.y += b.vy
}

for(let g of grenades){

g.x += g.vx
g.y += g.vy
g.vy += 0.5
g.timer--

if(g.timer<=0){

for(let pid in players){

let p = players[pid]
let dist = Math.abs(p.x - g.x)

if(dist < 120){
p.health -= 40
}

}

g.dead = true

}

}

grenades = grenades.filter(g=>!g.dead)

for(let e of enemies){

let target=null
let best=Infinity

for(let pid in players){

let p=players[pid]
let d=Math.abs(p.x-e.x)

if(d<best){
best=d
target=p
}

}

if(target){

if(target.x>e.x)e.vx=1
else e.vx=-1

}

e.x+=e.vx

}

if(boss){

let target=null
let best=Infinity

for(let pid in players){

let p=players[pid]
let d=Math.abs(p.x-boss.x)

if(d<best){
best=d
target=p
}

}

if(target){

if(target.x>boss.x)boss.x+=2
else boss.x-=2

}

if(boss.health<=0){

for(let pid in players){

players[pid].coins+=50
giveXP(players[pid],200)

}

boss=null

}

}

broadcast({
type:"state",
players,
enemies,
bullets,
grenades,
boss
})

},50)

console.log("Cubi MMO server running")
