let messageId = 1;
function msgFactory({type, msg, name}) {
    messageId++;
    return {
        type, msg, name, id: messageId
    };
}

function systemMsg(msg) {
    return msgFactory({
        type: 'system',
        msg,
    });
}

function privateMsg(msg, name) {
    return msgFactory({
        type: 'private',
        msg,
        name,
    })
}

function publicMsg(msg, name) {
    return msgFactory({
        type: 'public',
        msg,
        name,
    })
}

function selfMsg(msg) {
    return msgFactory({
        type: 'self',
        msg,
    });
}

module.exports = {
    systemMsg,
    privateMsg,
    publicMsg,
    selfMsg
}