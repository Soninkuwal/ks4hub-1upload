// script.js (Updated)

// APNA WORKER URL YAHA DAALEIN
const WORKER_URL = "https://image-api.meenakanhaiyalal638.workers.dev"; 

let folders = {}; // Yeh ab server se aayega

const folderSelect = document.getElementById("folderSelect");
const gallery = document.getElementById("gallery");
const folderNameInput = document.getElementById("folderName");

// --- DATA FETCHING AND RENDERING ---

async function initializeApp() {
    try {
        const response = await fetch(`${WORKER_URL}/api/list`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        folders = await response.json();
        updateFolderList();
        renderGallery();
    } catch (error) {
        console.error("Failed to load images:", error);
        alert("Could not load images from the server.");
    }
}

function updateFolderList() {
    folderSelect.innerHTML = "";
    const folderNames = Object.keys(folders);
    
    if (folderNames.length === 0) {
        let option = document.createElement("option");
        option.textContent = "No folders created yet";
        option.disabled = true;
        folderSelect.appendChild(option);
    } else {
        folderNames.forEach(folder => {
            let option = document.createElement("option");
            option.value = folder;
            option.textContent = folder;
            folderSelect.appendChild(option);
        });
    }
}

function renderGallery() {
    gallery.innerHTML = "";
    for (let folder in folders) {
        folders[folder].forEach(image => {
            const box = document.createElement("div");
            box.className = "image-box";

            // image object has {name, url, path, sha}
            box.innerHTML = `
                <img src="${image.url}" alt="${image.name}" onclick="viewImage('${image.url}')">
                <div class="folder-name">📁 ${folder}</div>
                <div class="image-actions">
                    <button class="action-btn" onclick="copyUrl('${image.url}')">Copy URL</button>
                    <button class="action-btn delete-btn" onclick="deleteImage('${image.path}', '${image.sha}')">Delete</button>
                </div>
            `;
            gallery.appendChild(box);
        });
    }
}

// --- USER ACTIONS ---

// Note: Folder creation is handled by uploading an image to a new folder name.
// GitHub creates folders automatically when you add a file to a path that doesn't exist.
function createFolder() {
    const folderName = folderNameInput.value.trim();
    if (!folderName) {
        alert("Enter folder name");
        return;
    }
    if (folders[folderName]) {
        alert("Folder already exists.");
        return;
    }

    // Temporarily add to UI
    folders[folderName] = [];
    updateFolderList();
    folderSelect.value = folderName;
    alert(`Folder "${folderName}" is ready. Upload an image to create it permanently.`);
    folderNameInput.value = "";
}

// In script.js

async function uploadLocalImage() {
    const fileInput = document.getElementById("fileInput");
    const selectedFolder = folderSelect.value;
    const file = fileInput.files[0];

    if (!selectedFolder) {
        alert("Please select or create a folder first.");
        return;
    }
    if (!file) {
        alert("Please select an image to upload.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", selectedFolder);

    try {
        const response = await fetch(`${WORKER_URL}/api/upload`, {
            method: "POST",
            body: formData,
        });

        // Yeh line badli gayi hai
        if (!response.ok) {
            // Server se actual error message nikal kar throw karein
            const errorText = await response.text();
            throw new Error(errorText || 'Upload failed with status: ' + response.status);
        }
        
        alert("Image uploaded successfully!");
        fileInput.value = ""; // Clear file input
        initializeApp(); // Refresh the gallery
    } catch (error) {
        console.error("Upload error:", error);
        // Ab yahan par actual server error dikhega
        alert("Error uploading image: " + error.message);
    }
}

// URL upload is complex on the backend. This is a placeholder.
// The worker needs to fetch the URL, get the blob, and then upload.
function uploadUrlImage() {
    alert("Uploading from URL is an advanced feature and requires backend changes. Please use 'Upload From Device' for now.");
}

async function deleteImage(path, sha) {
    if (!confirm("Are you sure you want to delete this image?")) {
        return;
    }

    try {
        const response = await fetch(`${WORKER_URL}/api/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, sha })
        });
        
        if (!response.ok) {
            const errorResult = await response.text();
            throw new Error(`Failed to delete: ${errorResult}`);
        }

        alert('Image deleted successfully!');
        initializeApp(); // Refresh the gallery
    } catch (error) {
        console.error('Delete error:', error);
        alert(`Error deleting image: ${error.message}`);
    }
}

function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert("Image URL copied to clipboard!");
    }).catch(err => {
        console.error('Could not copy text: ', err);
        alert("Failed to copy URL.");
    });
}

function viewImage(url) {
    // Simple implementation: open in a new tab
    window.open(url, '_blank');
    // For a modal/lightbox, you'd need more HTML/CSS/JS
}

// --- INITIALIZATION ---
initializeApp();