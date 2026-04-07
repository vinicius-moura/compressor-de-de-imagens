const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const open = require('open');

const app = express();
const upload = multer({ dest: 'temp/' });

app.use(express.static('public'));

app.post('/compress-single', upload.single('image'), async (req, res) => {
    const { folderName } = req.body;
    const outputDir = path.join(process.cwd(), folderName);
    
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const file = req.file;
    const inputPath = file.path;
    const outputPath = path.join(outputDir, file.originalname);
    const MAX_SIZE_BYTES = 1024 * 1024;

    try {
        let outputBuffer;
        let currentQuality = 85;

        if (file.size <= MAX_SIZE_BYTES) {
            outputBuffer = await sharp(inputPath).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
        } else {
            do {
                outputBuffer = await sharp(inputPath)
                    .jpeg({ quality: currentQuality, mozjpeg: true })
                    .toBuffer();
                currentQuality -= 5;
            } while (outputBuffer.length > MAX_SIZE_BYTES && currentQuality > 10);
        }

        fs.writeFileSync(outputPath, outputBuffer);

        res.json({
            success: true,
            name: file.originalname,
            para: (outputBuffer.length / 1024 / 1024).toFixed(2),
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
    console.log(`🚀 Servidor pronto em http://localhost:${PORT}`);
    open(`http://localhost:${PORT}`);
});