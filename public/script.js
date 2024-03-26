const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const videoGrid1 = document.getElementById('video-grid1');

const myPeer = new Peer(undefined, {
    host: '/',
    port: '3001'
});
const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};

socket.on('chat-message', data => {
    appendMessage(data);
    appendMessage1(data);
});

socket.on('user-disconnected', data => {
    const {userId, username} = data;
    appendMessage({username:"Server", text: `${username} disconnected.` })
    appendMessage1({username:"Server", text: `${username} disconnected.` })
    if (peers[userId]) peers[userId].close();
})

function sendMessage(message) {
    socket.emit('send-chat-message', { username: USER_NAME, text: message });
}

function connectToNewUser(userId, stream, username) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    video.setAttribute('data-username', username); // Set username as a data attribute
    video.addEventListener('mouseover', function () {
        this.title = username;
        console.log(username);
    });
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    call.on('close', () => {
        video.remove();
    });
    peers[userId] = call;
    appendMessage({ username:"Server", text: `${username} connected` });
    appendMessage1({ username:"Server", text: `${username} connected` });
}

function addVideoStream(video, stream) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoGrid.append(video);
}

function addVideoStream1(video, stream) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoGrid1.append(video);
}

function appendMessage(data) {
    let { username, text } = data;
    const messageContainer = document.getElementById('cont');
    const messageElement = document.createElement('div');
    messageElement.className = "alert alert-warning alert-dismissible fade show"; // Bootstrap alert classes
    messageElement.setAttribute('role', 'alert');
    if (username == USER_NAME) {
        messageElement.innerHTML = `
        <svg class="bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="Info:"><use xlink:href="#info-fill"/></svg>
            <strong>You:</strong> ${text}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
    } else if (username == "Server") {
        messageElement.innerHTML = `
        <svg class="bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="Info:"><use xlink:href="#info-fill"/></svg>

            ${text}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
    } else {
        messageElement.innerHTML = `
        <svg class="bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="Info:"><use xlink:href="#info-fill"/></svg>

            <strong>${username}:</strong> ${text}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
    }
    messageContainer.appendChild(messageElement);

    // Automatically close the alert after 5 seconds
    setTimeout(function() {
        messageElement.remove();
    }, 2000);
}

function appendMessage1(data) {
    let { username, text } = data;
    const messageElement = document.createElement('div');
    if (username == USER_NAME) {
        messageElement.className = "myMessage each-msg";
        messageElement.innerHTML = `<strong>You</strong>: ${text}`;
    }
    else if (username == "Server") {
        messageElement.className = "serverMessage each-msg";
        messageElement.innerHTML = `${text}`;
    }
    else {
        messageElement.className = "others each-msg";
        messageElement.innerHTML = `<strong>${username}</strong>: ${text}`;
    }
    document.getElementById('chat').appendChild(messageElement);
}


navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    addVideoStream1(myVideo, stream);

    myPeer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        console.log(call)
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

