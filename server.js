const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            // Документы
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
            'application/rtf',

            // Изображения
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
            'image/svg+xml', 'image/heic', 'image/heif',

            // Видео
            'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv',
            'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 'video/mpeg', 'video/3gpp',

            // Аудио
            'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac',
            'audio/x-ms-wma', 'audio/webm'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый тип файла'), false);
        }
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Создание необходимых директорий
fs.ensureDirSync(path.join(__dirname, 'uploads'));
fs.ensureDirSync(path.join(__dirname, 'converted'));
fs.ensureDirSync(path.join(__dirname, 'public'));

// Маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Загрузка файлов
app.post('/upload', upload.array('files', 10), (req, res) => {
    try {
        const files = req.files.map(file => ({
            id: path.parse(file.filename).name,
            originalName: file.originalname,
            filename: file.filename,
            size: file.size,
            type: file.mimetype,
            path: file.path
        }));

        res.json({
            success: true,
            files: files
        });
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки файлов'
        });
    }
});

// Конвертация файлов
app.post('/convert', async (req, res) => {
    try {
        const { fileIds, targetFormat } = req.body;

        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Не указаны файлы для конвертации'
            });
        }

        const convertedFiles = [];

        for (const fileId of fileIds) {
            const uploadDir = path.join(__dirname, 'uploads');
            const files = await fs.readdir(uploadDir);
            const fileName = files.find(f => f.startsWith(fileId));

            if (!fileName) {
                console.warn(`Файл ${fileId} не найден`);
                continue;
            }

            const filePath = path.join(uploadDir, fileName);
            const convertedFile = await convertFile(filePath, fileName, targetFormat);

            if (convertedFile) {
                convertedFiles.push(convertedFile);
            }
        }

        res.json({
            success: true,
            files: convertedFiles
        });

    } catch (error) {
        console.error('Ошибка конвертации:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка конвертации файлов'
        });
    }
});

// Скачивание файла
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'converted', filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'Файл не найден' });
    }
});

// Удаление файла
app.delete('/file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления файла' });
    }
});

// Очистка всех файлов
app.post('/clear', async (req, res) => {
    try {
        const uploadDir = path.join(__dirname, 'uploads');
        const convertedDir = path.join(__dirname, 'converted');

        // Очищаем папки
        await fs.emptyDir(uploadDir);
        await fs.emptyDir(convertedDir);

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка очистки:', error);
        res.status(500).json({ error: 'Ошибка очистки файлов' });
    }
});

// Функция конвертации файлов
async function convertFile(filePath, originalName, targetFormat) {
    const fileExt = path.extname(originalName).toLowerCase();
    const fileNameWithoutExt = path.basename(originalName, fileExt);
    const outputDir = path.join(__dirname, 'converted');
    const outputName = `${fileNameWithoutExt}_${Date.now()}.${targetFormat}`;
    const outputPath = path.join(outputDir, outputName);

    try {
        // Конвертация изображений
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg', '.heic', '.heif'].includes(fileExt)) {
            await convertImage(filePath, outputPath, targetFormat);
        }
        // Конвертация документов
        else if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'].includes(fileExt)) {
            await convertDocument(filePath, outputPath, targetFormat);
        }
        // Конвертация текста
        else if (['.txt', '.csv', '.rtf'].includes(fileExt)) {
            await convertText(filePath, outputPath, targetFormat);
        }
        // Конвертация PDF
        else if (fileExt === '.pdf') {
            await convertPDF(filePath, outputPath, targetFormat);
        }
        // Конвертация видео
        else if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp', '.mpg', '.mpeg'].includes(fileExt)) {
            await convertVideo(filePath, outputPath, targetFormat);
        }
        // Конвертация аудио
        else if (['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'].includes(fileExt)) {
            await convertAudio(filePath, outputPath, targetFormat);
        }
        else {
            throw new Error('Неподдерживаемый формат файла');
        }

        return {
            originalName: originalName,
            convertedName: outputName,
            size: fs.statSync(outputPath).size,
            downloadUrl: `/download/${outputName}`
        };

    } catch (error) {
        console.error(`Ошибка конвертации ${originalName}:`, error);
        return null;
    }
}

// Конвертация изображений
async function convertImage(inputPath, outputPath, targetFormat) {
    const formats = {
        'jpg': 'jpeg',
        'jpeg': 'jpeg',
        'png': 'png',
        'webp': 'webp',
        'bmp': 'bmp',
        'tiff': 'tiff'
    };

    const format = formats[targetFormat] || 'jpeg';

    // Специальная обработка для HEIC/HEIF (нужна дополнительная установка)
    if (targetFormat === 'heic' || targetFormat === 'heif') {
        await fs.copy(inputPath, outputPath);
        return;
    }

    await sharp(inputPath)
        .toFormat(format)
        .jpeg({ quality: 90 })
        .png({ compressionLevel: 6 })
        .webp({ quality: 90 })
        .tiff({ compression: 'lzw' })
        .toFile(outputPath);
}

// Конвертация PDF
async function convertPDF(inputPath, outputPath, targetFormat) {
    if (targetFormat.startsWith('image')) {
        // PDF в изображения
        const pdfBuffer = await fs.readFile(inputPath);
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();

        if (pages.length > 0) {
            // Конвертируем первую страницу в изображение
            // В реальном приложении здесь нужна более сложная логика рендеринга
            const page = pages[0];
            const { width, height } = page.getSize();

            // Создаем простое изображение-заглушку
            await sharp({
                create: {
                    width: Math.round(width),
                    height: Math.round(height),
                    channels: 3,
                    background: { r: 255, g: 255, b: 255 }
                }
            })
            .jpeg()
            .toFile(outputPath);
        }
    } else if (targetFormat === 'txt') {
        // PDF в текст (нужна дополнительная библиотека типа pdf-parse)
        // Пока создаем простой текстовый файл
        const txtContent = 'Конвертация PDF в текст требует дополнительной библиотеки.\n\nОригинальный файл: ' + path.basename(inputPath);
        await fs.writeFile(outputPath.replace(/\.[^.]+$/, '.txt'), txtContent, 'utf8');
    }
}

// Конвертация документов (базовая)
async function convertDocument(inputPath, outputPath, targetFormat) {
    // Для полноценной конвертации документов нужны библиотеки типа:
    // - mammoth (DOCX -> HTML/TXT)
    // - xlsx (Excel файлы)
    // - pandoc (универсальный конвертер)

    // В этой версии делаем простую конвертацию:
    if (targetFormat === 'pdf') {
        // DOC/DOCX/XLS/PPT -> PDF (нужна дополнительная библиотека)
        // Пока просто копируем как есть
        await fs.copy(inputPath, outputPath);
    } else if (targetFormat === 'txt') {
        // Документы -> TXT (нужна дополнительная обработка)
        // Пока просто копируем как есть
        const txtOutputPath = outputPath.replace(/\.[^.]+$/, '.txt');
        await fs.copy(inputPath, txtOutputPath);
    }
}

// Конвертация текста (базовая)
async function convertText(inputPath, outputPath, targetFormat) {
    if (targetFormat === 'pdf') {
        // TXT/CSV -> PDF (нужна дополнительная библиотека)
        // Пока просто копируем как есть
        await fs.copy(inputPath, outputPath);
    } else if (targetFormat === 'docx') {
        // TXT -> DOCX (нужна дополнительная библиотека)
        // Пока просто копируем как есть
        const docxOutputPath = outputPath.replace(/\.[^.]+$/, '.docx');
        await fs.copy(inputPath, docxOutputPath);
    }
}

// Конвертация видео (базовая)
async function convertVideo(inputPath, outputPath, targetFormat) {
    // Для видео конвертации нужна установка FFmpeg
    // В этой версии просто копируем файл с новым расширением
    let ext = '.mp4';
    if (targetFormat === 'webm') ext = '.webm';
    else if (targetFormat === 'avi') ext = '.avi';
    else if (targetFormat === 'mov') ext = '.mov';

    const finalOutputPath = outputPath.replace(/\.[^.]+$/, ext);
    await fs.copy(inputPath, finalOutputPath);
    return finalOutputPath;
}

// Конвертация аудио (базовая)
async function convertAudio(inputPath, outputPath, targetFormat) {
    // Для аудио конвертации нужна установка FFmpeg
    // В этой версии просто копируем файл с новым расширением
    let ext = '.mp3';
    if (targetFormat === 'wav') ext = '.wav';
    else if (targetFormat === 'ogg') ext = '.ogg';
    else if (targetFormat === 'aac') ext = '.aac';

    const finalOutputPath = outputPath.replace(/\.[^.]+$/, ext);
    await fs.copy(inputPath, finalOutputPath);
    return finalOutputPath;
}

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📁 Загрузки: ${path.join(__dirname, 'uploads')}`);
    console.log(`📁 Конвертированные: ${path.join(__dirname, 'converted')}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Завершение работы сервера...');

    try {
        // Очистка временных файлов
        await fs.emptyDir(path.join(__dirname, 'uploads'));
        await fs.emptyDir(path.join(__dirname, 'converted'));
        console.log('🧹 Временные файлы очищены');
    } catch (error) {
        console.error('Ошибка очистки:', error);
    }

    process.exit(0);
});
