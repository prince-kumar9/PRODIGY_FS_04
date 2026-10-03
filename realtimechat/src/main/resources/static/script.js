
console.log("====================================");
console.log("REAL-TIME CHAT SCRIPT LOADED");
console.log("====================================");

// ==========================================
// AUTH ELEMENTS
// ==========================================

const authSection = document.getElementById("authSection");
const authTitle = document.getElementById("authTitle");
const registerUsername = document.getElementById("registerUsername");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const switchAuthBtn = document.getElementById("switchAuthBtn");
const switchText = document.getElementById("switchText");

// ==========================================
// CHAT ELEMENTS
// ==========================================

const chatSection = document.getElementById("chatSection");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const messageArea = document.getElementById("messageArea");

const connectionStatus =
    document.getElementById("connectionStatus");

const onlineStatus =
    document.getElementById("onlineStatus");

// ==========================================
// ROOM AND PRIVATE CHAT ELEMENTS
// ==========================================

const roomSelect = document.getElementById("roomSelect");

const groupChatInfo =
    document.getElementById("groupChatInfo");

const privateChatInfo =
    document.getElementById("privateChatInfo");

const backToGroupBtn =
    document.getElementById("backToGroupBtn");

const privateChatTitle =
    document.getElementById("privateChatTitle");

const privateStatus =
    document.getElementById("privateStatus");

const userList =
    document.getElementById("userList");

// ==========================================
// VARIABLES
// ==========================================

let username = "";
let loggedInEmail = "";

let stompClient = null;
let isRegisterMode = false;

let currentRoom = "general";
let roomSubscription = null;

let isPrivateChat = false;
let privateReceiver = "";
let privateSubscription = null;

// Keep track of history requests to avoid stale results
let privateHistoryRequest = 0;
let groupHistoryRequest = 0;

// ==========================================
// SWITCH LOGIN / REGISTER
// ==========================================

switchAuthBtn.addEventListener("click", function () {

    isRegisterMode = !isRegisterMode;

    if (isRegisterMode) {
        authTitle.textContent = "Create Account";
        registerUsername.classList.remove("hidden");
        loginBtn.classList.add("hidden");
        registerBtn.classList.remove("hidden");

        switchText.textContent =
            "Already have an account?";

        switchAuthBtn.textContent = "Login";

    } else {
        authTitle.textContent = "Login";
        registerUsername.classList.add("hidden");
        loginBtn.classList.remove("hidden");
        registerBtn.classList.add("hidden");

        switchText.textContent =
            "Don't have an account?";

        switchAuthBtn.textContent = "Register";
    }
});

// ==========================================
// LOGIN AND REGISTER BUTTONS
// ==========================================

loginBtn.addEventListener("click", function () {
    loginUser();
});

registerBtn.addEventListener("click", function () {
    registerUser();
});

// ==========================================
// REGISTER USER
// ==========================================

function registerUser() {

    const usernameValue = registerUsername.value.trim();
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (usernameValue === "") {
        alert("Please enter your username");
        return;
    }

    if (email === "") {
        alert("Please enter your email");
        return;
    }

    if (password.trim() === "") {
        alert("Please enter your password");
        return;
    }

    console.log("REGISTERING USER...");

    fetch("/api/users/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: usernameValue,
            email: email,
            password: password
        })
    })
    .then(function (response) {

        if (!response.ok) {
            throw new Error("Registration failed");
        }

        return response.json();
    })
    .then(function (user) {

        console.log("REGISTRATION SUCCESS:", user);

        alert("Registration successful! Please login.");

        isRegisterMode = false;

        authTitle.textContent = "Login";
        registerUsername.classList.add("hidden");
        loginBtn.classList.remove("hidden");
        registerBtn.classList.add("hidden");

        switchText.textContent =
            "Don't have an account?";

        switchAuthBtn.textContent = "Register";

        authEmail.value = email;
        authPassword.value = "";
    })
    .catch(function (error) {

        console.error("REGISTRATION ERROR:", error);
        alert("Registration failed");
    });
}

// ==========================================
// LOGIN USER
// ==========================================

function loginUser() {

    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (email === "") {
        alert("Please enter your email");
        return;
    }

    if (password.trim() === "") {
        alert("Please enter your password");
        return;
    }

    console.log("LOGGING IN...");

    fetch("/api/users/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
    .then(function (response) {
        return response.text();
    })
    .then(function (result) {

        console.log("LOGIN RESPONSE:", result);

        if (result === "Login successful") {
            alert("Login successful!");
            getUsernameAndConnect(email);
        } else {
            alert(result);
        }
    })
    .catch(function (error) {

        console.error("LOGIN ERROR:", error);
        alert("Login failed");
    });
}

// ==========================================
// GET USERNAME
// ==========================================

function getUsernameAndConnect(email) {

    fetch(
        "/api/users/email/" +
        encodeURIComponent(email)
    )
    .then(function (response) {

        if (!response.ok) {
            throw new Error("User not found");
        }

        return response.json();
    })
    .then(function (user) {

        username = user.username;
        loggedInEmail = email.trim().toLowerCase();

        console.log("LOGGED IN USER:", username);

        connectWebSocket();
    })
    .catch(function (error) {

        console.error("USERNAME ERROR:", error);
        alert("Could not get user information");
    });
}

// ==========================================
// CONNECT TO WEBSOCKET
// ==========================================

function connectWebSocket() {

    console.log("CONNECTING TO WEBSOCKET...");

    stompClient = new StompJs.Client({

        webSocketFactory: function () {
            console.log("CREATING SOCKJS CONNECTION");
            return new SockJS("/chat");
        },

        reconnectDelay: 5000,

        // CONNECTED
        onConnect: function () {

            console.log("WEBSOCKET CONNECTED");

            connectionStatus.textContent = "Connected";
            onlineStatus.textContent = "Online";

            authSection.classList.add("hidden");
            chatSection.classList.remove("hidden");

            isPrivateChat = false;
            privateReceiver = "";

            showGroupChat();

            addSystemMessage(
                username + " joined the chat"
            );

            subscribeToRoom();
            loadChatHistory();
            loadUsers();
        },

        // DISCONNECTED
        onDisconnect: function () {

            console.log("WEBSOCKET DISCONNECTED");

            connectionStatus.textContent = "Disconnected";
            onlineStatus.textContent = "Offline";
        },

        // STOMP ERROR
        onStompError: function (frame) {

            console.error("STOMP ERROR:", frame);

            connectionStatus.textContent = "Connection Error";
            onlineStatus.textContent = "Offline";
        },

        // WEBSOCKET ERROR
        onWebSocketError: function (error) {

            console.error("WEBSOCKET ERROR:", error);

            connectionStatus.textContent = "Connection Error";
            onlineStatus.textContent = "Offline";
        }
    });

    stompClient.activate();
}

// ==========================================
// UNSUBSCRIBE FROM GROUP ROOM
// ==========================================

function unsubscribeFromRoom() {

    if (roomSubscription) {
        roomSubscription.unsubscribe();
        roomSubscription = null;
    }
}

// ==========================================
// UNSUBSCRIBE FROM PRIVATE CHAT
// ==========================================

function unsubscribeFromPrivateChat() {

    if (privateSubscription) {
        privateSubscription.unsubscribe();
        privateSubscription = null;
    }
}

// ==========================================
// SUBSCRIBE TO GROUP ROOM
// ==========================================

function subscribeToRoom() {

    if (!stompClient || !stompClient.connected) {
        return;
    }

    unsubscribeFromRoom();

    const topic =
        "/topic/messages/" + currentRoom;

    console.log("SUBSCRIBING TO GROUP:", topic);

    roomSubscription = stompClient.subscribe(
        topic,
        function (response) {

            console.log("GROUP MESSAGE RECEIVED:", response.body);

            try {

                const message = JSON.parse(response.body);

                if (isPrivateChat) {
                    return;
                }

                if (message.room !== currentRoom) {
                    return;
                }

                addMessage(
                    message.sender,
                    message.content,
                    message.sender === username,
                    message.id,
                    message.status,
                    false
                );

            } catch (error) {

                console.error("MESSAGE PARSE ERROR:", error);
            }
        }
    );

    console.log("SUBSCRIBED TO GROUP:", topic);
}

// ==========================================
// OPEN PRIVATE CHAT
// ==========================================

function openPrivateChat(receiverName) {

    if (!stompClient || !stompClient.connected) {
        alert("Not connected to server");
        return;
    }

    if (!receiverName || receiverName === username) {
        return;
    }

    unsubscribeFromRoom();
    unsubscribeFromPrivateChat();

    isPrivateChat = true;
    privateReceiver = receiverName;

    // Invalidate earlier history requests
    privateHistoryRequest++;

    // Show private chat header
    if (groupChatInfo) {
        groupChatInfo.classList.add("hidden");
    }

    if (privateChatInfo) {
        privateChatInfo.classList.remove("hidden");
    }

    // Hide group room selector
    if (roomSelect) {
        roomSelect.classList.add("hidden");
    }

    if (privateChatTitle) {
        privateChatTitle.textContent = receiverName;
    }

    if (privateStatus) {
        privateStatus.textContent = "Private conversation";
    }

    // Clear old messages
    messageArea.innerHTML = "";

    addSystemMessage(
        "Private chat with " + receiverName
    );

    // Subscribe to logged-in user's private topic
    const topic =
        "/topic/private/" + username;

    console.log("SUBSCRIBING TO PRIVATE CHAT:", topic);

    privateSubscription = stompClient.subscribe(
        topic,
        function (response) {

            console.log("PRIVATE MESSAGE RECEIVED:", response.body);

            try {

                const message = JSON.parse(response.body);

                const sender = message.sender;
                const receiver = message.receiver;

                // Show only messages exchanged by these two users
                const isConversationMessage =
                    (sender === username &&
                        receiver === privateReceiver) ||
                    (sender === privateReceiver &&
                        receiver === username);

                if (!isPrivateChat || !isConversationMessage) {
                    return;
                }

                // Check whether this message is received by current user
                const incoming =
                    message.receiver === username &&
                    message.sender === privateReceiver;

                addMessage(
                    message.sender,
                    message.content,
                    message.sender === username,
                    message.id,
                    message.status,
                    incoming
                );

            } catch (error) {

                console.error(
                    "PRIVATE MESSAGE PARSE ERROR:",
                    error
                );
            }
        }
    );

    // Load old private messages from database
    loadPrivateChatHistory();

    messageInput.focus();

    console.log("PRIVATE CHAT OPENED WITH:", receiverName);
}

// ==========================================
// BACK TO GROUP CHAT
// ==========================================

function showGroupChat() {

    unsubscribeFromPrivateChat();

    isPrivateChat = false;
    privateReceiver = "";

    // Invalidate pending private history response
    privateHistoryRequest++;

    if (privateChatInfo) {
        privateChatInfo.classList.add("hidden");
    }

    if (groupChatInfo) {
        groupChatInfo.classList.remove("hidden");
    }

    if (roomSelect) {
        roomSelect.classList.remove("hidden");
        roomSelect.value = currentRoom;
    }
}

if (backToGroupBtn) {

    backToGroupBtn.addEventListener("click", function () {

        console.log("RETURNING TO GROUP CHAT");

        showGroupChat();

        messageArea.innerHTML = "";

        subscribeToRoom();
        loadChatHistory();
    });
}

// ==========================================
// ROOM CHANGE
// ==========================================

if (roomSelect) {

    roomSelect.addEventListener("change", function () {

        if (isPrivateChat) {
            return;
        }

        currentRoom = roomSelect.value;

        console.log("ROOM CHANGED:", currentRoom);

        messageArea.innerHTML = "";

        subscribeToRoom();
        loadChatHistory();
    });
}

// ==========================================
// SEND BUTTON
// ==========================================

sendBtn.addEventListener("click", function () {
    sendMessage();
});

// ==========================================
// ENTER TO SEND
// ==========================================

messageInput.addEventListener("keypress", function (event) {

    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

// ==========================================
// SEND MESSAGE
// ==========================================

function sendMessage() {

    const message = messageInput.value.trim();

    if (message === "") {
        return;
    }

    if (!stompClient || !stompClient.connected) {
        alert("Not connected to server");
        return;
    }

    let chatMessage;

    if (isPrivateChat) {

        chatMessage = {
            sender: username,
            receiver: privateReceiver,
            content: message,
            room: "private"
        };

    } else {

        chatMessage = {
            sender: username,
            content: message,
            room: currentRoom
        };
    }

    console.log("SENDING MESSAGE:", chatMessage);

    stompClient.publish({
        destination: "/app/send",
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(chatMessage)
    });

    messageInput.value = "";
    messageInput.focus();
}

// ==========================================
// ADD MESSAGE
// ==========================================

function addMessage(
    sender,
    message,
    myMessage,
    id = null,
    status = null,
    markIncomingAsRead = false
) {

    // Prevent duplicate messages when live message
    // arrives while history is also being loaded
    if (id !== null && id !== undefined) {

        const existing = findMessageElement(id);

        if (existing) {

            updateMessageStatus(
                id,
                status,
                existing
            );

            if (markIncomingAsRead && status !== "READ") {
                sendMessageStatus(id, "READ");
            }

            return;
        }
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = "message";

    if (myMessage) {
        messageDiv.classList.add("my-message");
    }

    if (id !== null && id !== undefined) {
        messageDiv.dataset.messageId = id;
    }

    const senderElement = document.createElement("strong");
    senderElement.textContent = sender;

    const messageElement = document.createElement("span");
    messageElement.textContent = message;

    messageDiv.appendChild(senderElement);
    messageDiv.appendChild(messageElement);

    // Display status only for own private messages
    if (myMessage && isPrivateChat) {

        const statusElement = document.createElement("small");
        statusElement.className = "message-status";
        statusElement.textContent = getStatusText(status);

        messageDiv.appendChild(statusElement);
    }

    messageArea.appendChild(messageDiv);

    messageArea.scrollTop = messageArea.scrollHeight;

    // If incoming private message is displayed in open chat,
    // acknowledge it as delivered and read
    if (
        markIncomingAsRead &&
        id !== null &&
        id !== undefined
    ) {
        if (status === "SENT") {
            sendMessageStatus(id, "DELIVERED");
        }

        if (status !== "READ") {
            sendMessageStatus(id, "READ");
        }
    }
}

// ==========================================
// FIND MESSAGE ELEMENT
// ==========================================

function findMessageElement(messageId) {

    const elements =
        messageArea.querySelectorAll("[data-message-id]");

    for (const element of elements) {
        if (String(element.dataset.messageId) === String(messageId)) {
            return element;
        }
    }

    return null;
}

// ==========================================
// UPDATE MESSAGE STATUS IN UI
// ==========================================

function updateMessageStatus(messageId, status, element = null) {

    if (!status) {
        return;
    }

    const messageElement =
        element || findMessageElement(messageId);

    if (!messageElement) {
        return;
    }

    const statusElement =
        messageElement.querySelector(".message-status");

    if (statusElement) {
        statusElement.textContent = getStatusText(status);
    }
}

// ==========================================
// STATUS LABEL
// ==========================================

function getStatusText(status) {

    if (status === "READ") {
        return "✓✓ Read";
    }

    if (status === "DELIVERED") {
        return "✓✓ Delivered";
    }

    return "✓ Sent";
}

// ==========================================
// SEND MESSAGE STATUS TO BACKEND
// ==========================================

function sendMessageStatus(messageId, status) {

    if (
        !stompClient ||
        !stompClient.connected ||
        messageId === null ||
        messageId === undefined
    ) {
        return;
    }

    const statusMessage = {
        id: messageId,
        sender: username,
        status: status
    };

    console.log("SENDING MESSAGE STATUS:", statusMessage);

    stompClient.publish({
        destination: "/app/status",
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(statusMessage)
    });
}

// ==========================================
// SYSTEM MESSAGE
// ==========================================

function addSystemMessage(message) {

    const messageDiv = document.createElement("div");
    messageDiv.className = "message system-message";

    const senderElement = document.createElement("strong");
    senderElement.textContent = "System";

    const messageElement = document.createElement("span");
    messageElement.textContent = message;

    messageDiv.appendChild(senderElement);
    messageDiv.appendChild(messageElement);

    messageArea.appendChild(messageDiv);

    messageArea.scrollTop = messageArea.scrollHeight;
}

// ==========================================
// LOAD GROUP CHAT HISTORY
// ==========================================

function loadChatHistory() {

    if (isPrivateChat) {
        return;
    }

    const requestedRoom = currentRoom;
    const requestId = ++groupHistoryRequest;

    console.log("LOADING CHAT HISTORY FOR:", requestedRoom);

    fetch(
        "/api/messages?room=" +
        encodeURIComponent(requestedRoom)
    )
    .then(function (response) {

        if (!response.ok) {
            throw new Error("HTTP Error: " + response.status);
        }

        return response.json();
    })
    .then(function (messages) {

        // Ignore stale history if user changed chat/room
        if (
            isPrivateChat ||
            currentRoom !== requestedRoom ||
            requestId !== groupHistoryRequest
        ) {
            return;
        }

        console.log("CHAT HISTORY:", messages);

        messages.forEach(function (message) {

            addMessage(
                message.sender,
                message.content,
                message.sender === username,
                message.id,
                message.status,
                false
            );
        });
    })
    .catch(function (error) {

        console.error("HISTORY ERROR:", error);
    });
}

// ==========================================
// LOAD PRIVATE CHAT HISTORY
// ==========================================

function loadPrivateChatHistory() {

    if (!isPrivateChat || !privateReceiver) {
        return;
    }

    const requestedReceiver = privateReceiver;
    const requestId = ++privateHistoryRequest;

    console.log(
        "LOADING PRIVATE HISTORY WITH:",
        requestedReceiver
    );

    const url =
        "/api/private-messages?user1=" +
        encodeURIComponent(username) +
        "&user2=" +
        encodeURIComponent(requestedReceiver);

    fetch(url)
    .then(function (response) {

        if (!response.ok) {
            throw new Error(
                "HTTP Error: " + response.status
            );
        }

        return response.json();
    })
    .then(function (messages) {

        // Ignore response if user switched to another chat
        if (
            !isPrivateChat ||
            privateReceiver !== requestedReceiver ||
            requestId !== privateHistoryRequest
        ) {
            return;
        }

        console.log(
            "PRIVATE CHAT HISTORY:",
            messages
        );

        messages.forEach(function (message) {

            const incoming =
                message.receiver === username &&
                message.sender === requestedReceiver;

            addMessage(
                message.sender,
                message.content,
                message.sender === username,
                message.id,
                message.status,
                incoming
            );
        });
    })
    .catch(function (error) {

        console.error(
            "PRIVATE HISTORY ERROR:",
            error
        );
    });
}

// ==========================================
// LOAD REGISTERED USERS
// ==========================================

function loadUsers() {

    if (!userList) {
        return;
    }

    userList.textContent = "Loading users...";

    fetch("/api/users")
    .then(function (response) {

        if (!response.ok) {
            throw new Error("Could not load users");
        }

        return response.json();
    })
    .then(function (users) {

        userList.innerHTML = "";

        const loggedEmail =
            loggedInEmail.trim().toLowerCase();

        const uniqueUsers = new Map();

        users.forEach(function (user) {

            const email =
                (user.email || "").trim().toLowerCase();

            if (!email || email === loggedEmail) {
                return;
            }

            if (!uniqueUsers.has(email)) {
                uniqueUsers.set(email, user);
            }
        });

        uniqueUsers.forEach(function (user) {

            const userItem =
                document.createElement("button");

            userItem.type = "button";
            userItem.className = "user-item";
            userItem.textContent =
                user.username || "Unknown User";

            userItem.addEventListener("click", function () {

                openPrivateChat(user.username);
            });

            userList.appendChild(userItem);
        });

        if (uniqueUsers.size === 0) {
            userList.textContent = "No other users found";
        }
    })
    .catch(function (error) {

        console.error("USER LIST ERROR:", error);

        userList.textContent = "Could not load users";
    });
}