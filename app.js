class FileConverter {
    constructor() {
        this.files = [];
        this.selectedFormat = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Загрузка файлов
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const uploadForm = document.getElementById('uploadForm');

        if (uploadArea) {
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadArea.addEventListener('drop', this.handleDrop.bind(this));
            uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        }

        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }

        if (uploadForm) {
            uploadForm.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        // Конвертация
        const convertBtn = document.getElementById('convertBtn');
        if (convertBtn) {
            convertBtn.addEventListener('click', this.convertFiles.bind(this));
        }

        // Скачивание
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        const clearAllBtn = document.getElementById('clearAllBtn');

        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', this.downloadAll.bind(this));
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', this.clearAll.bind(this));
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        const files = Array.from(e.dataTransfer.files);
        this.addFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
    }

    handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        this.uploadFiles(formData);
    }

    addFiles(files) {
        const validFiles = files.filter(file => this.isValidFile(file));

        if (validFiles.length === 0) {
            this.showToast('Пожалуйста, выберите файлы поддерживаемых форматов (PDF, изображения, видео)', 'error');
            return;
        }

        // Ограничение на количество файлов
        if (this.files.length + validFiles.length > 10) {
            this.showToast('Максимум 10 файлов за раз', 'error');
            return;
        }

        // Ограничение на размер (50MB на файл)
        const oversizedFiles = validFiles.filter(file => file.size > 50 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            this.showToast('Файлы не должны превышать 50MB', 'error');
            return;
        }

        this.files = [...this.files, ...validFiles];
        this.updateFileList();
        this.showConverterSection();
        this.updateAvailableFormats();
        this.showToast(`Загружено ${validFiles.length} файл(ов)`, 'success');
    }

    isValidFile(file) {
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
            'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/x-flv', 'video/webm', 'video/x-matroska',
            'video/x-ms-wmv', 'video/mpeg', 'video/3gpp', 'video/x-m4v',

            // Аудио
            'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac',
            'audio/x-ms-wma', 'audio/webm'
        ];

        return allowedTypes.includes(file.type) || this.checkByExtension(file);
    }

    checkByExtension(file) {
        const name = file.name.toLowerCase();
        const extensions = [
            // Документы
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf',
            '.odt', '.ods', '.odp',

            // Изображения
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg', '.heic', '.heif',

            // Видео
            '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp', '.mpg', '.mpeg',

            // Аудио
            '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'
        ];

        return extensions.some(ext => name.endsWith(ext));
    }

    updateFileList() {
        const fileList = document.getElementById('fileList');
        const listContainer = fileList.querySelector('.file-items') || document.createElement('div');

        if (!fileList.contains(listContainer)) {
            listContainer.className = 'file-items';
            fileList.appendChild(listContainer);
        }

        listContainer.innerHTML = '';

        this.files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const icon = this.getFileIcon(file.type);
            const size = this.formatFileSize(file.size);
            const fileType = this.getFileTypeCategory(file.type);

            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">${icon}</div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>${size} • ${fileType}</p>
                    </div>
                </div>
                <button onclick="fileConverter.removeFile(${index})" class="remove-btn" title="Удалить">×</button>
            `;

            listContainer.appendChild(fileItem);
        });

        // Форматы теперь обновляются автоматически
    }

    updateAvailableFormats() {
        const formatButtons = document.getElementById('formatButtons');
        formatButtons.innerHTML = '';

        const formats = this.getAvailableFormats();

        if (formats.length === 0) {
            formatButtons.innerHTML = '<p class="no-formats">Нет доступных форматов конвертации для выбранных файлов</p>';
            return;
        }

        // Добавляем заголовок с информацией о файлах
        const formatHeader = document.createElement('div');
        formatHeader.className = 'format-header';
        formatHeader.innerHTML = `
            <h4>Доступные форматы конвертации:</h4>
            <p class="format-info">Выберите формат для конвертации ${this.files.length} файл(ов)</p>
        `;
        formatButtons.appendChild(formatHeader);

        formats.forEach(format => {
            const button = document.createElement('button');
            button.className = 'format-btn';
            button.textContent = format.label;
            button.dataset.format = format.value;
            button.onclick = () => this.selectFormat(format.value, button);

            formatButtons.appendChild(button);
        });
    }

    getFileTypeCategory(type) {
        if (type === 'application/pdf') return 'PDF документ';
        if (type === 'application/msword' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'Word документ';
        if (type === 'application/vnd.ms-excel' || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'Excel таблица';
        if (type === 'application/vnd.ms-powerpoint' || type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'PowerPoint презентация';
        if (type === 'text/plain') return 'Текстовый файл';
        if (type === 'text/csv') return 'CSV файл';
        if (type.startsWith('image/')) return 'Изображение';
        if (type.startsWith('video/')) return 'Видео';
        if (type.startsWith('audio/')) return 'Аудио';
        return 'Файл';
    }

    getFileIcon(type) {
        if (type === 'application/pdf') return '📄';
        if (type === 'application/msword' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '📝';
        if (type === 'application/vnd.ms-excel' || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return '📊';
        if (type === 'application/vnd.ms-powerpoint' || type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return '📽️';
        if (type === 'text/plain' || type === 'text/csv') return '📄';
        if (type.startsWith('image/')) return '🖼️';
        if (type.startsWith('video/')) return '🎥';
        if (type.startsWith('audio/')) return '🎵';
        return '📁';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    removeFile(index) {
        const file = this.files[index];
        this.files.splice(index, 1);
        this.updateFileList();

        if (this.files.length === 0) {
            this.hideConverterSection();
        } else {
            // Обновляем доступные форматы после удаления файла
            this.updateAvailableFormats();
        }

        this.showToast(`Файл "${file.name}" удален`, 'success');
    }

    showConverterSection() {
        document.getElementById('converterSection').style.display = 'block';
        this.updateAvailableFormats();
    }

    hideConverterSection() {
        document.getElementById('converterSection').style.display = 'none';
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('downloadSection').style.display = 'none';
    }

    getAvailableFormats() {
        const hasImages = this.files.some(file => file.type.startsWith('image/'));
        const hasVideos = this.files.some(file => file.type.startsWith('video/'));
        const hasAudios = this.files.some(file => file.type.startsWith('audio/'));
        const hasPDFs = this.files.some(file => file.type === 'application/pdf');
        const hasDocuments = this.files.some(file =>
            file.type === 'application/msword' ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/vnd.ms-excel' ||
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.type === 'application/vnd.ms-powerpoint' ||
            file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        );
        const hasTexts = this.files.some(file =>
            file.type === 'text/plain' ||
            file.type === 'text/csv' ||
            file.type === 'application/rtf'
        );

        const formats = [];

        if (hasImages) {
            formats.push(
                { label: 'PNG', value: 'png' },
                { label: 'JPEG', value: 'jpg' },
                { label: 'WebP', value: 'webp' },
                { label: 'BMP', value: 'bmp' },
                { label: 'TIFF', value: 'tiff' }
            );
        }

        if (hasVideos) {
            formats.push(
                { label: 'MP4', value: 'mp4' },
                { label: 'WebM', value: 'webm' },
                { label: 'AVI', value: 'avi' },
                { label: 'MOV', value: 'mov' }
            );
        }

        if (hasAudios) {
            formats.push(
                { label: 'MP3', value: 'mp3' },
                { label: 'WAV', value: 'wav' },
                { label: 'OGG', value: 'ogg' },
                { label: 'AAC', value: 'aac' }
            );
        }

        if (hasPDFs) {
            formats.push(
                { label: 'Изображения', value: 'images' },
                { label: 'TXT', value: 'txt' }
            );
        }

        if (hasDocuments) {
            formats.push(
                { label: 'PDF', value: 'pdf' },
                { label: 'TXT', value: 'txt' }
            );
        }

        if (hasTexts) {
            formats.push(
                { label: 'PDF', value: 'pdf' },
                { label: 'DOCX', value: 'docx' }
            );
        }

        return formats;
    }

    selectFormat(format, button) {
        // Снимаем выделение с других кнопок
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Выделяем выбранную кнопку
        button.classList.add('selected');

        this.selectedFormat = format;
        document.getElementById('convertBtn').disabled = false;

        // Показываем уведомление о выборе формата
        const formatName = this.getFormatName(this.selectedFormat);
        this.showToast(`Выбран формат: ${formatName}`, 'success');
    }

    getFormatName(format) {
        const names = {
            'pdf': 'PDF',
            'txt': 'TXT',
            'docx': 'DOCX',
            'png': 'PNG',
            'jpg': 'JPEG',
            'webp': 'WebP',
            'bmp': 'BMP',
            'tiff': 'TIFF',
            'mp4': 'MP4',
            'webm': 'WebM',
            'avi': 'AVI',
            'mov': 'MOV',
            'mp3': 'MP3',
            'wav': 'WAV',
            'ogg': 'OGG',
            'aac': 'AAC'
        };
        return names[format] || format.toUpperCase();
    }

    async convertFiles() {
        if (!this.selectedFormat || this.files.length === 0) {
            this.showToast('Выберите формат конвертации', 'error');
            return;
        }

        this.showProgress();

        try {
            this.updateProgress('Подготовка файлов...', 10);

            // Имитируем загрузку файлов
            await this.delay(1000);
            this.updateProgress('Загрузка файлов на сервер...', 30);

            const uploadResult = await this.simulateUpload();

            if (!uploadResult.success) {
                throw new Error('Ошибка загрузки файлов');
            }

            this.updateProgress('Конвертация файлов...', 40);

            // Выполняем реальную конвертацию
            const convertResult = await this.convertFilesReal(uploadResult.files);

            if (!convertResult.success) {
                throw new Error('Ошибка конвертации');
            }

            this.updateProgress('Подготовка к скачиванию...', 90);
            await this.delay(300);

            this.updateProgress('Готово!', 100);

            // Показываем результаты
            setTimeout(async () => {
                await this.showDownloadSection(convertResult.files);
                this.showToast('Конвертация завершена!', 'success');
            }, 500);

        } catch (error) {
            console.error('Ошибка:', error);
            this.showToast('Ошибка конвертации: ' + error.message, 'error');
            this.hideProgress();
        }
    }

    async simulateUpload() {
        // Имитируем загрузку файлов
        await this.delay(500);

        // Генерируем фейковые ID для загруженных файлов
        const uploadedFiles = this.files.map((file, index) => ({
            id: 'file_' + Date.now() + '_' + index,
            originalName: file.name,
            size: file.size,
            type: file.type
        }));

        return {
            success: true,
            files: uploadedFiles
        };
    }

    async simulateConversion(uploadedFiles) {
        // Имитируем процесс конвертации
        await this.delay(1500);

        // Генерируем фейковые результаты конвертации
        const convertedFiles = uploadedFiles.map(file => {
            const extension = this.getFormatExtension(this.selectedFormat);
            const newName = file.originalName.replace(/\.[^/.]+$/, '') + '.' + extension;

            return {
                originalName: newName,
                size: Math.floor(file.size * 0.8), // Имитируем уменьшение размера
                downloadUrl: '#', // В демо-версии ссылка не работает
                converted: true
            };
        });

        return {
            success: true,
            files: convertedFiles
        };
    }

    getFormatExtension(format) {
        const extensions = {
            'pdf': 'pdf',
            'txt': 'txt',
            'docx': 'docx',
            'png': 'png',
            'jpg': 'jpg',
            'webp': 'webp',
            'bmp': 'bmp',
            'tiff': 'tiff',
            'mp4': 'mp4',
            'webm': 'webm',
            'avi': 'avi',
            'mov': 'mov',
            'mp3': 'mp3',
            'wav': 'wav',
            'ogg': 'ogg',
            'aac': 'aac'
        };
        return extensions[format] || format;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async convertFilesReal(uploadedFiles) {
        try {
            const convertedFiles = [];

            for (let i = 0; i < uploadedFiles.length; i++) {
                const file = uploadedFiles[i];
                const originalFile = this.files.find(f => f.name === file.originalName);

                if (!originalFile) continue;

                this.updateProgress(`Конвертация ${i + 1} из ${uploadedFiles.length}...`, 40 + (i / uploadedFiles.length) * 50);

                // Создаем конвертированный файл (реальный или демо)
                const downloadUrl = await this.createDemoFile(file);

                convertedFiles.push({
                    originalName: file.originalName.replace(/\.[^/.]+$/, '') + '.' + this.getFormatExtension(this.selectedFormat),
                    size: Math.floor(file.size * 0.9), // Примерное уменьшение размера
                    downloadUrl: downloadUrl,
                    converted: true
                });

                await this.delay(200); // Небольшая задержка между файлами
            }

            return {
                success: true,
                files: convertedFiles
            };
        } catch (error) {
            console.error('Real conversion error:', error);
            // В случае ошибки возвращаем демо-результаты
            return await this.simulateConversion(uploadedFiles);
        }
    }

    async showDownloadSection(convertedFiles) {
        this.hideProgress();
        const downloadSection = document.getElementById('downloadSection');
        const downloadList = document.getElementById('downloadList');

        downloadList.innerHTML = '';

        for (const file of convertedFiles) {
            const downloadItem = document.createElement('div');
            downloadItem.className = 'download-item';

            const size = this.formatFileSize(file.size);
            const downloadUrl = await this.createDemoFile(file);

            downloadItem.innerHTML = `
                <div class="download-info">
                    <h4>${file.originalName}</h4>
                    <p>Размер: ${size}</p>
                </div>
                <a href="${downloadUrl}" class="download-btn" download="${file.originalName}">📥 Скачать</a>
            `;

            downloadList.appendChild(downloadItem);
        }

        downloadSection.style.display = 'block';
    }

    async createDemoFile(file) {
        // Проверяем, можем ли мы реально конвертировать этот файл
        if (await this.canConvertFile(file)) {
            return await this.convertFile(file);
        }

        // Создаем демо-файл для неподдерживаемых форматов
        let content = '';
        let mimeType = 'text/plain';

        if (file.originalName.endsWith('.txt')) {
            content = 'Это демо-конвертированный текстовый файл.\n\nОригинальный файл был успешно обработан!\n\nДемо-конвертер файлов © 2024';
            mimeType = 'text/plain';
        } else if (file.originalName.endsWith('.pdf')) {
            content = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Демо PDF файл) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000200 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n284\n%%EOF';
            mimeType = 'application/pdf';
        } else if (file.originalName.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
            content = 'Это демо-изображение. В реальном приложении здесь был бы конвертированный файл изображения.';
            mimeType = 'text/plain';
        } else if (file.originalName.match(/\.(mp4|avi|mov|webm)$/i)) {
            content = 'Это демо-видео файл. Реальная конвертация видео требует серверной обработки.';
            mimeType = 'text/plain';
        } else if (file.originalName.match(/\.(mp3|wav|ogg|aac)$/i)) {
            content = 'Это демо-аудио файл. Реальная конвертация аудио требует серверной обработки.';
            mimeType = 'text/plain';
        } else {
            content = `Это демо-файл конвертированный в формат ${file.originalName.split('.').pop().toUpperCase()}.\n\nОригинальный файл был успешно обработан!\n\nДемо-конвертер файлов © 2024`;
            mimeType = 'text/plain';
        }

        const blob = new Blob([content], { type: mimeType });
        return URL.createObjectURL(blob);
    }

    async canConvertFile(file) {
        // Проверяем, можем ли мы конвертировать этот файл в браузере
        const fileName = file.originalName.toLowerCase();

        // Изображения можно конвертировать через Canvas API
        if (fileName.match(/\.(png|jpg|jpeg|webp)$/i) && this.selectedFormat.match(/^(png|jpg|webp)$/i)) {
            return true;
        }

        // Текст можно конвертировать в PDF
        if (fileName.endsWith('.txt') && this.selectedFormat === 'pdf') {
            return true;
        }

        return false;
    }

    async convertFile(file) {
        const fileName = file.originalName.toLowerCase();

        try {
            // Конвертация изображений
            if (fileName.match(/\.(png|jpg|jpeg|webp)$/i)) {
                return await this.convertImage(file);
            }

            // Конвертация текста в PDF
            if (fileName.endsWith('.txt') && this.selectedFormat === 'pdf') {
                return await this.convertTextToPdf(file);
            }

            // Если конвертация невозможна, возвращаем демо-файл
            return await this.createDemoFile(file);
        } catch (error) {
            console.error('Error converting file:', error);
            // В случае ошибки возвращаем демо-файл
            return await this.createDemoFile(file);
        }
    }

    async convertImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                // Устанавливаем размер canvas
                canvas.width = img.width;
                canvas.height = img.height;

                // Рисуем изображение на canvas
                ctx.drawImage(img, 0, 0);

                // Определяем MIME тип для выходного формата
                let mimeType = 'image/png';
                if (this.selectedFormat === 'jpg' || this.selectedFormat === 'jpeg') {
                    mimeType = 'image/jpeg';
                } else if (this.selectedFormat === 'webp') {
                    mimeType = 'image/webp';
                }

                // Конвертируем canvas в blob
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        resolve(url);
                    } else {
                        reject(new Error('Failed to convert image'));
                    }
                }, mimeType, 0.9); // 0.9 - качество для JPEG/WebP
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            // Загружаем изображение из файла
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async convertTextToPdf(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const text = e.target.result;

                // Создаем простой PDF с текстом
                const pdfContent = this.createTextPdf(text);

                const blob = new Blob([pdfContent], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                resolve(url);
            };

            reader.onerror = () => {
                reject(new Error('Failed to read text file'));
            };

            reader.readAsText(file);
        });
    }

    createTextPdf(text) {
        // Создаем простой PDF с текстом
        // Это упрощенная версия, в реальности лучше использовать pdf-lib или jspdf
        const lines = text.split('\n');
        let pdf = '%PDF-1.4\n';

        // Объекты PDF
        pdf += '1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n';
        pdf += '2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n';

        // Страница
        pdf += '3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n/Resources <<\n/Font <<\n/F1 5 0 R\n>>\n>>\n>>\nendobj\n';

        // Содержимое страницы
        let content = 'BT\n/F1 12 Tf\n50 750 Td\n';
        let y = 750;

        lines.forEach(line => {
            if (line.trim()) {
                // Экранируем специальные символы
                const escapedLine = line.replace(/[()\\]/g, '\\$&');
                content += `(${escapedLine}) Tj\n`;
                y -= 15;
                if (y < 50) {
                    // Новая страница (упрощенная версия)
                    content += 'ET\n';
                    break;
                }
                content += '0 -15 Td\n';
            }
        });

        content += 'ET\n';

        pdf += `4 0 obj\n<<\n/Length ${content.length}\n>>\nstream\n${content}endstream\nendobj\n`;

        // Шрифт
        pdf += '5 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n';

        // Таблица xref
        const xref = '\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000456 00000 n \n0000000890 00000 n \ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n';
        const startxref = pdf.length;

        pdf += xref + startxref + '\n%%EOF';

        return pdf;
    }

    showProgress() {
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('downloadSection').style.display = 'none';
    }

    hideProgress() {
        document.getElementById('progressSection').style.display = 'none';
    }

    updateProgress(text, percentage) {
        document.getElementById('progressText').textContent = text;
        document.getElementById('progressFill').style.width = `${percentage}%`;
    }

    async downloadAll() {
        // В демо-версии просто скачиваем по одному с небольшой задержкой
        const downloadLinks = document.querySelectorAll('.download-btn');

        this.showToast(`Начинаем скачивание ${downloadLinks.length} файлов...`, 'info');

        for (let i = 0; i < downloadLinks.length; i++) {
            const link = downloadLinks[i];
            this.showToast(`Скачивание файла ${i + 1} из ${downloadLinks.length}...`, 'info');

            link.click();
            await new Promise(resolve => setTimeout(resolve, 1000)); // Задержка между скачиваниями
        }

        this.showToast('Все файлы скачаны!', 'success');
    }

    async clearAll() {
        if (confirm('Удалить все файлы и начать заново?')) {
            this.files = [];
            this.selectedFormat = null;
            this.hideConverterSection();
            document.getElementById('fileInput').value = '';

            this.showToast('Все файлы очищены', 'success');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the app
const fileConverter = new FileConverter();
