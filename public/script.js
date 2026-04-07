let filesQueue = [];
let isProcessing = false;
let shouldStop = false;

const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const fileTableBody = document.getElementById('fileTableBody');
const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const dropZone = document.getElementById('dropZone');

// Eventos de Seleção
fileInput.onchange = (e) => handleFileSelection(e.target.files);
folderInput.onchange = (e) => handleFileSelection(e.target.files);

// Drag & Drop
dropZone.ondragover = e => { e.preventDefault(); dropZone.classList.add('dragover'); };
dropZone.ondragleave = () => dropZone.classList.remove('dragover');
dropZone.ondrop = async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const items = e.dataTransfer.items;
    if (items) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i].webkitGetAsEntry();
            if (item) await scanFiles(item);
        }
    }
};

async function scanFiles(item) {
    if (item.isFile) {
        const file = await new Promise(resolve => item.file(resolve));
        if (file.type === "image/jpeg" || file.name.match(/\.(jpg|jpeg)$/i)) addFileToQueue(file);
    } else if (item.isDirectory) {
        const reader = item.createReader();
        const entries = await new Promise(resolve => reader.readEntries(resolve));
        for (let entry of entries) await scanFiles(entry);
    }
}

function handleFileSelection(files) {
    Array.from(files).forEach(file => {
        if (file.type === "image/jpeg" || file.name.match(/\.(jpg|jpeg)$/i)) addFileToQueue(file);
    });
}

function addFileToQueue(file) {
    const rowId = `row-${Math.random().toString(36).substr(2, 9)}`;
    filesQueue.push({ file, rowId, status: 'waiting' });
    
    const row = document.createElement('tr');
    row.id = rowId;
    row.innerHTML = `
        <td>${file.name.toLowerCase()}</td>
        <td>${(file.size / 1024 / 1024).toFixed(2)} MB</td>
        <td class="result">--</td>
        <td class="status status-waiting">AGUARDANDO</td>
    `;
    fileTableBody.appendChild(row);
    
    btnStart.disabled = false;
    document.getElementById('summary').innerText = `FILA DE ESPERA: ${filesQueue.length} ARQUIVOS`;
}

async function startProcessing() {
    isProcessing = true;
    shouldStop = false;
    btnStart.disabled = true;
    btnStop.style.display = 'inline-block';
    
    const currentFolderName = `comprimidas_${Date.now()}`;

    for (let item of filesQueue) {
        if (shouldStop) {
            updateRow(item.rowId, 'CANCELADO', 'status-stopped');
            continue; 
        }
        if (item.status === 'done') continue;

        updateRow(item.rowId, 'PROCESSANDO...', 'status-processing');

        const formData = new FormData();
        formData.append('image', item.file);
        formData.append('folderName', currentFolderName);

        try {
            const response = await fetch('/compress-single', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) {
                item.status = 'done';
                updateRow(item.rowId, 'CONCLUÍDO', 'status-done', `${data.para}MB`);
            } else {
                updateRow(item.rowId, 'ERRO', 'status-error');
            }
        } catch (e) {
            updateRow(item.rowId, 'CONEXÃO', 'status-error');
        }
    }

    btnStop.style.display = 'none';
    btnStart.innerText = "NOVO PROCESSO";
    btnStart.onclick = () => window.location.reload();
    btnStart.disabled = false;
}

function stopProcessing() {
    shouldStop = true;
    btnStop.innerText = "PARANDO...";
    btnStop.disabled = true;
}

function updateRow(rowId, statusText, statusClass, resultText = "--") {
    const row = document.getElementById(rowId);
    if(!row) return;
    const statusCell = row.querySelector('.status');
    const resultCell = row.querySelector('.result');
    statusCell.innerText = statusText;
    statusCell.className = `status ${statusClass}`;
    resultCell.innerText = resultText;
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}