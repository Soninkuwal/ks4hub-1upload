// --- Firebase Configuration ---
// अपनी Firebase प्रोजेक्ट सेटिंग्स से firebaseConfig ऑब्जेक्ट यहां पेस्ट करें
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDwUXWpphu2Ts5ke5VXNyc1F7xZrYYAO_c",
  authDomain: "ks4hub-upload.firebaseapp.com",
  databaseURL: "https://ks4hub-upload-default-rtdb.firebaseio.com",
  projectId: "ks4hub-upload",
  storageBucket: "ks4hub-upload.firebasestorage.app",
  messagingSenderId: "350120173481",
  appId: "1:350120173481:web:46200b2c6eb0b3ce112eb8",
  measurementId: "G-5PWJFKVKRN"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Cloudflare Worker Configuration ---
const CLOUDFLARE_WORKER_URL = "https://image-uploader.meenakanhaiyalal638.workers.dev/"; // अपने वर्कर का URL यहां डालें

// --- DOM Elements ---
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const loginView = document.getElementById('loginView');
const registerView = document.getElementById('registerView');
const userNameDisplay = document.getElementById('userName');
const folderSelect = document.getElementById("folderSelect");
const gallery = document.getElementById("gallery");
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImage');

let currentUser = null;
let userFolders = [];

// --- Authentication ---

function toggleView() {
    loginView.style.display = loginView.style.display === 'none' ? 'block' : 'none';
    registerView.style.display = registerView.style.display === 'none' ? 'block' : 'none';
}

function registerUser() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    if (!name || !email || !password) {
        alert("Please fill all fields.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            user.updateProfile({ displayName: name })
                .then(() => {
                    // Create a user document in Firestore to store folders
                    db.collection('users').doc(user.uid).set({
                        name: name,
                        email: email,
                        folders: ['General'] // Default folder
                    })
                    .then(() => {
                        alert("Registration successful!");
                    });
                });
        })
        .catch((error) => alert(error.message));
}

function loginUser() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => alert(error.message));
}

function logoutUser() {
    auth.signOut();
}

// Listen for auth state changes
auth.onAuthStateChanged(user => {
    if (user) {
        // User is logged in
        currentUser = user;
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        userNameDisplay.textContent = `Welcome, ${user.displayName || user.email}`;
        loadUserData();
    } else {
        // User is logged out
        currentUser = null;
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        gallery.innerHTML = "";
        folderSelect.innerHTML = "";
    }
});

// --- Data Management (Firestore) ---

async function loadUserData() {
    if (!currentUser) return;

    // Load Folders
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (userDoc.exists) {
        userFolders = userDoc.data().folders || ['General'];
    } else {
        userFolders = ['General'];
        // If user doc doesn't exist, create it
        await db.collection('users').doc(currentUser.uid).set({ folders: userFolders, name: currentUser.displayName, email: currentUser.email });
    }
    updateFolderList();

    // Load Images
    renderGallery();
}

function updateFolderList() {
    folderSelect.innerHTML = "";
    userFolders.forEach(folder => {
        const option = document.createElement("option");
        option.value = folder;
        option.textContent = folder;
        folderSelect.appendChild(option);
    });
}

async function createFolder() {
    const folderNameInput = document.getElementById("folderName");
    const folderName = folderNameInput.value.trim();
    if (!folderName) {
        alert("Enter folder name");
        return;
    }
    if (userFolders.includes(folderName)) {
        alert("Folder already exists");
        return;
    }

    userFolders.push(folderName);
    await db.collection('users').doc(currentUser.uid).update({
        folders: userFolders
    });
    
    updateFolderList();
    folderNameInput.value = "";
    alert("Folder Created");
}

// --- Image Upload ---

async function uploadLocalImage() {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];
    const selectedFolder = folderSelect.value;

    if (!file) {
        alert("Select an image");
        return;
    }
    if (!selectedFolder) {
        alert("Create or select a folder first");
        return;
    }

    const fileName = `${new Date().getTime()}-${file.name}`;
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('fileName', fileName);
    formData.append('folder', selectedFolder);

    try {
        const response = await fetch(CLOUDFLARE_WORKER_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${await response.text()}`);
        }

        const result = await response.json();
        await addImageToFirestore(result.url, selectedFolder);
        alert("Image uploaded successfully!");
        fileInput.value = "";

    } catch (error) {
        alert(`Error: ${error.message}`);
        console.error(error);
    }
}

async function addImageToFirestore(imageUrl, folder) {
    if (!currentUser) return;
    await db.collection('images').add({
        uid: currentUser.uid,
        url: imageUrl,
        folder: folder,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    renderGallery(); // Refresh gallery
}


// --- Gallery and Image Actions ---

function renderGallery() {
    if (!currentUser) return;
    gallery.innerHTML = "Loading images...";

    db.collection('images').where('uid', '==', currentUser.uid).orderBy('createdAt', 'desc').get()
        .then(snapshot => {
            gallery.innerHTML = "";
            if (snapshot.empty) {
                gallery.innerHTML = "<p>No images uploaded yet.</p>";
                return;
            }
            snapshot.forEach(doc => {
                const image = doc.data();
                const imageId = doc.id;
                const box = document.createElement("div");
                box.className = "image-box";

                box.innerHTML = `
                    <img src="${image.url}" alt="User image" onclick="viewImage('${image.url}')">
                    <div class="folder-name">📁 ${image.folder}</div>
                    <div class="image-overlay">
                        <button class="icon-btn" onclick="copyUrl('${image.url}')" title="Copy URL">📋</button>
                        <button class="icon-btn" onclick="deleteImage('${imageId}', '${image.url}')" title="Delete">🗑️</button>
                    </div>
                `;
                gallery.appendChild(box);
            });
        });
}

function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert("Image URL copied to clipboard!");
    }).catch(err => {
        alert("Failed to copy URL.");
    });
}

async function deleteImage(docId, imageUrl) {
    if (!confirm("Are you sure you want to delete this image? This cannot be undone.")) {
        return;
    }
    
    try {
        // Delete from Firestore
        await db.collection('images').doc(docId).delete();
        
        // Note: Deleting from GitHub is much more complex and requires another backend endpoint.
        // For now, we are just deleting the reference in our database. The file will remain on GitHub.
        alert("Image reference deleted!");
        renderGallery();

    } catch (error) {
        alert("Error deleting image: " + error.message);
    }
}


function viewImage(url) {
    modal.style.display = "block";
    modalImg.src = url;
}

function closeModal() {
    modal.style.display = "none";
}

// --- Image Editing Tools (Placeholder) ---
// Note: This is a very complex feature.
// You would need a library like 'tui-image-editor' or 'cropper.js'.
// This is a basic placeholder to show where you would start.
function editImage(imageUrl) {
    alert("Image editing is a planned feature and not yet implemented.");
    // Example: window.location.href = `/editor.html?image=${imageUrl}`;
}