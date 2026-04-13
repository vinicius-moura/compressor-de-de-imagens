const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();

// Limpeza de arquivos de sessões anteriores ao iniciar o programa
function limparLixoAntigo() {
    console.log("🧹 Limpando arquivos temporários...");
    const pastaRaiz = process.cwd();
    const itens = fs.readdirSync(pastaRaiz);

    itens.forEach(item => {
        const caminho = path.join(pastaRaiz, item);
        if ((item.startsWith('comprimidas_') || item === 'temp') && fs.lstatSync(caminho).isDirectory()) {
            fs.rmSync(caminho, { recursive: true, force: true });
        }
    });

    if (!fs.existsSync(path.join(pastaRaiz, 'temp'))) {
        fs.mkdirSync(path.join(pastaRaiz, 'temp'));
    }
}

limparLixoAntigo();

const upload = multer({ dest: 'temp/' });
app.use(express.static('public'));

app.post('/compress-single', upload.single('image'), async (req, res) => {
    // O maxSizeKB agora é lido corretamente pois o JS envia antes do arquivo
    const targetKB = parseInt(req.body.maxSizeKB) || 1024;
    const MAX_SIZE_BYTES = targetKB * 1024;
    const folderName = req.body.folderName || 'comprimidas_geral';
    
    const outputDir = path.join(process.cwd(), folderName);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    if (!req.file) return res.status(400).json({ success: false });

    const inputPath = req.file.path;
    const outputPath = path.join(outputDir, req.file.originalname);

    try {
        let outputBuffer;
        let currentQuality = 80; // Começamos em 80 para evitar inflar arquivos que já estão comprimidos

        // Loop de compressão rigoroso
        do {
            outputBuffer = await sharp(inputPath)
                .jpeg({ 
                    quality: currentQuality, 
                    mozjpeg: true, 
                    chromaSubsampling: '4:2:0' 
                })
                .toBuffer();
            
            // Se o arquivo ainda estiver muito grande, reduz a qualidade
            if (outputBuffer.length > MAX_SIZE_BYTES * 1.5) {
                currentQuality -= 10; // Redução rápida
            } else {
                currentQuality -= 5; // Redução fina
            }
        } while (outputBuffer.length > MAX_SIZE_BYTES && currentQuality > 5);

        fs.writeFileSync(outputPath, outputBuffer);

        res.json({
            success: true,
            name: req.file.originalname,
            para: (outputBuffer.length / 1024).toFixed(0) + ' KB',
            qualidade: currentQuality + 5
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Compressor pronto em http://localhost:3000`);
});