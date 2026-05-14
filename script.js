let folders = JSON.parse(localStorage.getItem("folders")) || {};

const folderSelect = document.getElementById("folderSelect");
const gallery = document.getElementById("gallery");

function saveData(){
localStorage.setItem("folders", JSON.stringify(folders));
}

function updateFolderList(){

folderSelect.innerHTML = "";

for(let folder in folders){

let option = document.createElement("option");

option.value = folder;
option.textContent = folder;

folderSelect.appendChild(option);

}

}

function createFolder(){

const folderName = document
.getElementById("folderName")
.value
.trim();

if(!folderName){

alert("Enter folder name");
return;

}

if(!folders[folderName]){

folders[folderName] = [];

saveData();

updateFolderList();

alert("Folder Created");

}

}

function uploadLocalImage(){

const fileInput = document.getElementById("fileInput");

const file = fileInput.files[0];

if(!file){

alert("Select image");
return;

}

const reader = new FileReader();

reader.onload = function(e){

addImageToFolder(e.target.result);

};

reader.readAsDataURL(file);

}

function uploadUrlImage(){

const imageUrl = document
.getElementById("imageUrl")
.value;

if(!imageUrl){

alert("Enter image URL");
return;

}

addImageToFolder(imageUrl);

}

function addImageToFolder(imageSrc){

const selectedFolder = folderSelect.value;

if(!selectedFolder){

alert("Create folder first");
return;

}

folders[selectedFolder].push(imageSrc);

saveData();

renderGallery();

}

function renderGallery(){

gallery.innerHTML = "";

for(let folder in folders){

folders[folder].forEach(image => {

const box = document.createElement("div");

box.className = "image-box";

box.innerHTML = `
<img src="${image}">
<div class="folder-name">
📁 ${folder}
</div>
`;

gallery.appendChild(box);

});

}

}

updateFolderList();
renderGallery();
