const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myPeer = new Peer(undefined, {
    host: '/',
    port: '3001'
});
const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};

socket.on('chat-message', data => {
    appendMessage(data);
});

socket.on('user-disconnected', data => {
    const {userId, username} = data;
    appendMessage({username:"Server", text: `${username} disconnected.` })
    if (peers[userId]) peers[userId].close();
})

function sendMessage(message) {
    socket.emit('send-chat-message', { username: USER_NAME, text: message });
}

function connectToNewUser(userId, stream, username) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    call.on('close', () => {
        video.remove();
    });
    peers[userId] = call;
    appendMessage({ username:"Server", text: `${username} connected` });
}

function addVideoStream(video, stream) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoGrid.append(video);
}

function appendMessage(data) {
    let { username, text } = data;
    const messageElement = document.createElement('div');
    if (username == USER_NAME) {
        messageElement.className = "myMessage";
        messageElement.innerText = `You: ${text}`;
    }
    else if (username == "Server") {
        messageElement.className = "serverMessage";
        messageElement.innerText = ` ${text}`;
    }
    else{
        messageElement.className = "others";
        messageElement.innerText = `${username}: ${text}`;
    }
    document.getElementById('chat').appendChild(messageElement);
}

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    addVideoStream(myVideo, stream);

    myPeer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
        });
    });

    socket.on('user-connected', data => {
        const { userId, username } = data;
        connectToNewUser(userId, stream, username);
    });
});

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id, USER_NAME);
});

document.getElementById('chat-form').addEventListener('submit', e => {
    e.preventDefault();
    const message = document.getElementById('chat-input').value;
    sendMessage(message);
    document.getElementById('chat-input').value = '';
});

