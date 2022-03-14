const express = require('express');

const app = express();

const http = require('http');
const cors = require('cors');

const server = http.createServer(app);
const EVENT = require('./const');

const { Server } = require('socket.io');
const io = new Server(server);
const {systemMsg, selfMsg, publicMsg} = require('./msg');

app.use(cors());
app.use(express.static('./dist'));


let people = [];
let sockets = new Map();
let userId = 1;

server.listen(3000, () => {
    console.log('Listening on 3000');
});

io.on('connection', socket => {
    console.log('新用户加入房间');

    let userInfo = {
        name: `匿名用户${userId}`,
        id: userId,
    };
    people.push(userInfo);
    sockets.set(userId, socket);
    userId++;
    // 分配姓名
    socket.emit(EVENT.DIST_INFO, userInfo);

    // 新用户加入
    socket.broadcast.emit(EVENT.CHAT_MESSAGE, systemMsg(`用户${userInfo.name}加入了房间`));
    // 更新用户列表
    io.emit(EVENT.MEMBER_CHANGE, people);

    // 离开房间
    socket.on('disconnect', () => {
        console.log(`用户${userInfo.name}离开了房间`);
        people = people.filter(p => p.id !== userInfo.id);
        io.emit(EVENT.CHAT_MESSAGE, systemMsg(`用户${userInfo.name}离开了房间`))
        io.emit(EVENT.MEMBER_CHANGE, people);
        sockets.delete(userInfo.id);
    });

    // 发消息
    socket.on(EVENT.CHAT_MESSAGE, (msg) => {
        console.log(`用户${userInfo.name}说：${msg.msg}`);
        const {id} = msg;
        socket.emit(EVENT.CHAT_MESSAGE, selfMsg(msg.msg));
        if (id === -1) {
            socket.broadcast.emit(EVENT.CHAT_MESSAGE, publicMsg(msg.msg, userInfo.name));
        } else {
            const to = people.find(p => p.id === id);
            if (to) {
                sockets.get(id).emit(EVENT.CHAT_MESSAGE, publicMsg(msg.msg, userInfo.name));
            }
        }
    });

    // 收到 offer
    socket.on(EVENT.SEND_OFFER, offer => {
        if (sockets.has(offer.to)) {
            console.log(`收到用户${userInfo.name}向用户id${offer.to}发送的offer`, offer);
            sockets.get(offer.to).emit(EVENT.RECEIVE_OFFER, {
                from: userInfo.id,
                type: offer.type,
                sdp: offer.sdp
            });
        }
    })
    
    // 收到 answer
    socket.on(EVENT.SEND_ANSWER, offer => {
        if (sockets.has(offer.to)) {
            console.log(`收到用户${userInfo.name}向用户id${offer.to}发送的answer`);
            sockets.get(offer.to).emit(EVENT.RECEIVE_ANSWER, {
                from: userInfo.id,
                type: offer.type,
                sdp: offer.sdp
            });
        }
    })

    socket.on(EVENT.SEND_CANDIDATE, candidate => {
        if (sockets.has(candidate.to)) {
            console.log(`收到用户${userInfo.name}向用户id${candidate.id}发送的candidate`);
            sockets.get(candidate.to).emit(EVENT.RECEIVE_CANDIDATE, {
                from: userInfo.id,
                type: candidate.type,
                candidate: candidate.candidate
            })
        }
    })
});

