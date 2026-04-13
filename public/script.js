let filesQueue = [];
let isProcessing = false;
let shouldStop = false;
let selectedLimitKB = 200; // Valor padrão inicial condizente com o botão active

const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const fileTableBody = document.getElementById('fileTableBody');
const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');

// Gerenciar botões de limite
const limitBtns = document.querySelectorAll('.limit-btn');
limitBtns.forEach(btn => {
    btn.onclick = () => {
        limitBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLimitKB = btn.getAttribute('data-size');
    };
});

fileInput.onchange = (e) => handleSelection(e.target.files);
folderInput.onchange = (e) => handleSelection(e.target.files);

const dropZone = document.getElementById('dropZone');
dropZone.ondragover = e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); };
dropZone.ondragleave = e => e.currentTarget.classList.remove('dragover');
dropZone.ondrop = async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const items = e.dataTransfer.items;
    for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) await scanFiles(item);
    }
};

async function scanFiles(item) {
    if (item.isFile) {
        const file = await new Promise(r => item.file(r));
        if (file.type.includes("jpeg") || file.name.match(/\.(jpg|jpeg)$/i)) addFile(file);
    } else if (item.isDirectory) {
        const reader = item.createReader();
        const entries = await new Promise(r => reader.readEntries(r));
        for (let entry of entries) await scanFiles(entry);
    }
}

function handleSelection(files) {
    Array.from(files).forEach(f => {
        if (f.type.includes("jpeg") || f.name.match(/\.(jpg|jpeg)$/i)) addFile(f);
    });
}

function addFile(file) {
    const rowId = `row-${Math.random().toString(36).substr(2, 9)}`;
    filesQueue.push({ file, rowId, status: 'waiting' });
    
    const row = document.createElement('tr');
    row.id = rowId;
    row.innerHTML = `<td>${file.name.toLowerCase()}</td><td>${(file.size/1024/1024).toFixed(2)}MB</td><td class="res">--</td><td class="st">AGUARDANDO</td>`;
    fileTableBody.appendChild(row);
    btnStart.disabled = false;
    document.getElementById('summary').innerText = `FILA DE ESPERA: ${filesQueue.length} ARQUIVOS`;
}

async function startProcessing() {
    isProcessing = true; 
    shouldStop = false;
    btnStart.disabled = true; 
    btnStop.style.display = 'inline-block';
    
    const folderName = `comprimidas_${Date.now()}`;

    for (let item of filesQueue) {
        if (shouldStop) { updateRow(item.rowId, 'CANCELADO', 'status-stopped'); continue; }
        if (item.status === 'done') continue;

        updateRow(item.rowId, 'PROCESSANDO...', 'status-processing');
        
        const fd = new FormData();
        // IMPORTANTE: Enviar o limite ANTES da imagem
        fd.append('maxSizeKB', selectedLimitKB); 
        fd.append('folderName', folderName);
        fd.append('image', item.file);

        try {
            const res = await fetch('/compress-single', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                item.status = 'done';
                updateRow(item.rowId, 'CONCLUÍDO', 'status-done', data.para);
            }
        } catch (e) { updateRow(item.rowId, 'ERRO', 'status-error'); }
    }
    btnStop.style.display = 'none';
    btnStart.innerText = "NOVO PROCESSO";
    btnStart.onclick = () => window.location.reload();
    btnStart.disabled = false;
}

function stopProcessing() { shouldStop = true; btnStop.innerText = "PARANDO..."; btnStop.disabled = true; }

function updateRow(id, st, cls, res = "--") {
    const r = document.getElementById(id);
    if (!r) return;
    const stCell = r.querySelector('.st');
    stCell.innerText = st;
    stCell.className = `st ${cls}`;
    r.querySelector('.res').innerText = res;
    r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}