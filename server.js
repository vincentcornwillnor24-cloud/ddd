const WebSocket = require("ws")

const PORT = process.env.PORT || 3000
const wss = new WebSocket.Server({ port: PORT })

let players = {}

function broadcast(data){
  const msg = JSON.stringify(data)
  wss.clients.forEach(client=>{
    if(client.readyState === WebSocket.OPEN){
      client.send(msg)
    }
  })
}

wss.on("connection",(ws)=>{

  const id = Math.random().toString(36).substr(2,9)

  players[id] = {
    x:100,
    y:100,
    name:"player",
    skin:"cyan"
  }

  ws.on("message",(msg)=>{
    let data
    try { data = JSON.parse(msg) } catch { return }

    if(data.type === "join"){
      players[id].name = data.name
      players[id].skin = data.skin
    }

    if(data.type === "move"){
      players[id].x = data.x
      players[id].y = data.y
    }

    if(data.type === "chat"){
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
  broadcast({
    type:"state",
    players:players,
    enemies:[]
  })
},50)

console.log("Cubi server running")
