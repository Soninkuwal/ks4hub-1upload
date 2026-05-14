// script.js (Completamente Renovado)

// ----- CONFIGURACIÓN -----
// REEMPLAZA ESTA URL CON LA URL DE TU CLOUDFLARE WORKER
const WORKER_URL = "https://image-api.meenakanhaiyalal638.workers.dev";

// ----- ESTADO DE LA APLICACIÓN -----
let folders = {}; // Almacena toda la estructura de carpetas e imágenes
let currentFolderFilter = 'all'; // Carpeta seleccionada para filtrar

// ----- ELEMENTOS DEL DOM -----
// Selectores de carpetas
const folderSelect = document.getElementById("folderSelect");
const uploadFolderSelect = document.getElementById("uploadFolderSelect");
// Galería
const gallery = document.getElementById("gallery");
const galleryInfoTitle = document.getElementById("current-folder-title");
const imageCount = document.getElementById("image-count");
// Modal de subida
const uploadModal = document.getElementById("uploadModal");
const openUploadModalBtn = document.getElementById("openUploadModalBtn");
const closeUploadModalBtn = document.getElementById("closeUploadModalBtn");
const folderNameInput = document.getElementById("folderName");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
// Modal de vista previa (Lightbox)
const previewModal = document.getElementById("imagePreviewModal");
const closePreviewModalBtn = document.getElementById("closePreviewModalBtn");
const previewImage = document.getElementById("previewImage");
const copyUrlBtn = document.getElementById("copyUrlBtn");
const editBtn = document.getElementById("editBtn");
const deleteBtn = document.getElementById("deleteBtn");

// ----- INICIALIZACIÓN -----
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        const response = await fetch(`${WORKER_URL}/api/list`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        folders = await response.json();
        updateFolderLists();
        renderGallery();
    } catch (error) {
        console.error("Failed to load images:", error);
        gallery.innerHTML = "<p>Could not load images from the server. Please check the console.</p>";
    }
}

// ----- RENDERIZADO Y ACTUALIZACIÓN DE UI -----

function updateFolderLists() {
    // Limpiar listas existentes
    folderSelect.innerHTML = '<option value="all">All Images</option>';
    uploadFolderSelect.innerHTML = "";
    
    const folderNames = Object.keys(folders).sort();

    if (folderNames.length === 0) {
        let option = document.createElement("option");
        option.textContent = "No folders created yet";
        option.disabled = true;
        uploadFolderSelect.appendChild(option);
    } else {
        folderNames.forEach(folder => {
            // Añadir al filtro principal
            let filterOption = document.createElement("option");
            filterOption.value = folder;
            filterOption.textContent = folder;
            folderSelect.appendChild(filterOption);

            // Añadir al selector del modal de subida
            let uploadOption = document.createElement("option");
            uploadOption.value = folder;
            uploadOption.textContent = folder;
            uploadFolderSelect.appendChild(uploadOption);
        });
    }
    folderSelect.value = currentFolderFilter;
}


function renderGallery() {
    gallery.innerHTML = "";
    let imagesToRender = [];
    let totalImageCount = 0;

    if (currentFolderFilter === 'all') {
        galleryInfoTitle.textContent = "All Images";
        for (let folder in folders) {
            imagesToRender.push(...folders[folder]);
        }
    } else {
        galleryInfoTitle.textContent = `📁 ${currentFolderFilter}`;
        imagesToRender = folders[currentFolderFilter] || [];
    }
    
    totalImageCount = imagesToRender.length;
    imageCount.textContent = `${totalImageCount} image${totalImageCount !== 1 ? 's' : ''} found.`;

    if (imagesToRender.length === 0 && currentFolderFilter !== 'all') {
        gallery.innerHTML = "<p>This folder is empty. Upload a file to see it here.</p>";
        return;
    }
    
    imagesToRender.forEach(image => {
        const box = document.createElement("div");
        box.className = "image-box";
        box.innerHTML = `
            <img src="${image.url}" alt="${image.name}" loading="lazy">
            <div class="info">
                <div class="folder-name">📁 ${image.path.split('/')[0]}</div>
            </div>
        `;
        box.addEventListener('click', () => viewImage(image));
        gallery.appendChild(box);
    });
}


// ----- ACCIONES DEL USUARIO -----

function createFolder() {
    const folderName = folderNameInput.value.trim();
    if (!folderName) {
        alert("Please enter a folder name.");
        return;
    }
    if (folders[folderName]) {
        alert("Folder already exists.");
        return;
    }

    folders[folderName] = [];
    updateFolderLists();
    uploadFolderSelect.value = folderName; // Seleccionar la nueva carpeta en el modal
    alert(`Folder "${folderName}" is ready. Select it and upload an image to create it permanently on the server.`);
    folderNameInput.value = "";
}


async function uploadLocalImage() {
    const selectedFolder = uploadFolderSelect.value;
    const file = fileInput.files[0];

    if (!selectedFolder) {
        alert("Please select or create a folder first.");
        return;
    }
    if (!file) {
        alert("Please select a file to upload.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", selectedFolder);

    // Lógica de subida con XMLHttpRequest para la barra de progreso
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            progressContainer.style.display = "block";
            progressBar.style.width = percentComplete + "%";
            progressText.textContent = percentComplete + "%";
        }
    });

    xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
            alert("File uploaded successfully!");
            closeModal(uploadModal);
            initializeApp(); // Recargar todo
        } else {
            alert(`Error uploading file: ${xhr.statusText} - ${xhr.responseText}`);
        }
        resetUploadForm();
    });

    xhr.addEventListener("error", () => {
        alert("An error occurred during the upload. Please try again.");
        resetUploadForm();
    });

    xhr.open("POST", `${WORKER_URL}/api/upload`);
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    xhr.send(formData);
}

function resetUploadForm() {
    fileInput.value = "";
    progressContainer.style.display = "none";
    progressBar.style.width = "0%";
    progressText.textContent = "0%";
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload File';
}

async function deleteImage(path, sha) {
    if (!confirm("Are you sure you want to delete this file permanently? This cannot be undone.")) {
        return;
    }

    try {
        const response = await fetch(`${WORKER_URL}/api/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, sha })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to delete: ${await response.text()}`);
        }

        alert('File deleted successfully!');
        closeModal(previewModal);
        initializeApp(); // Recargar la galería
    } catch (error) {
        console.error('Delete error:', error);
        alert(`Error deleting file: ${error.message}`);
    }
}

function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert("URL copied to clipboard!");
    }).catch(err => {
        console.error('Could not copy text: ', err);
        alert("Failed to copy URL.");
    });
}

function editImage(url) {
    alert("Image editing is an advanced feature planned for a future update!");
    // Aquí se podría integrar una librería como Cropper.js o Toast UI Image Editor
}


// ----- MANEJO DE MODALES Y EVENTOS -----

function viewImage(image) {
    previewImage.src = image.url;
    // Asignar acciones a los botones del lightbox
    copyUrlBtn.onclick = () => copyUrl(image.url);
    editBtn.onclick = () => editImage(image.url);
    deleteBtn.onclick = () => deleteImage(image.path, image.sha);
    
    openModal(previewModal);
}

function openModal(modal) {
    modal.style.display = "block";
}

function closeModal(modal) {
    modal.style.display = "none";
}

// Event listener para el filtro de carpetas
folderSelect.addEventListener('change', (e) => {
    currentFolderFilter = e.target.value;
    renderGallery();
});

// Event listeners para abrir/cerrar modales
openUploadModalBtn.addEventListener('click', () => openModal(uploadModal));
closeUploadModalBtn.addEventListener('click', () => closeModal(uploadModal));
closePreviewModalBtn.addEventListener('click', () => closeModal(previewModal));

// Cerrar modal al hacer clic fuera del contenido
window.addEventListener('click', (event) => {
    if (event.target == uploadModal) {
        closeModal(uploadModal);
    }
    if (event.target == previewModal) {
        closeModal(previewModal);
    }
});