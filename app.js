class FileConverter {
    constructor() {
        this.files = [];
        this.selectedFormat = null;
        this.tokens = 5; // Начальное количество токенов

        this.init();
    }

    init() {
        this.loadTokens();
        this.updateTokenDisplay();
        this.bindEvents();
    }

    loadTokens() {
        const stored = localStorage.getItem('converter_tokens');
        const lastReset = localStorage.getItem('tokens_last_reset');
        const today = new Date().toDateString();

        // Сбрасываем токены каждый день
        if (lastReset !== today) {
            this.tokens = 5;
            localStorage.setItem('tokens_last_reset', today);
            localStorage.setItem('converter_tokens', this.tokens);
        } else if (stored !== null) {
            this.tokens = parseInt(stored);
        }
    }

    saveTokens() {
        localStorage.setItem('converter_tokens', this.tokens);
    }

    updateTokenDisplay() {
        const tokenDisplay = document.getElementById('tokenDisplay');
        if (tokenDisplay) {
            tokenDisplay.textContent = this.tokens;
            tokenDisplay.className = this.tokens > 0 ? 'tokens-available' : 'tokens-empty';
        }
    }

    hasTokens() {
        return this.tokens > 0;
    }

    spendToken() {
        if (this.hasTokens()) {
            this.tokens--;
            this.saveTokens();
            this.updateTokenDisplay();
            return true;
        }
        return false;
    }

    showBuyTokensDialog() {
        const amount = prompt('Сколько токенов купить?\n\n💎 Тарифы:\n• 5 токенов = 50₽\n• 10 токенов = 90₽\n• 25 токенов = 200₽\n\n(В демо-версии токены добавляются бесплатно)', '5');

        if (amount && !isNaN(amount) && amount > 0) {
            this.buyTokens(parseInt(amount));
        }
    }

    buyTokens(amount) {
        // В демо-версии просто добавляем токены
        this.tokens += amount;
        this.saveTokens();
        this.updateTokenDisplay();
        this.showToast(`Куплено ${amount} токенов! 🎉`, 'success');
    }

    bindEvents() {
        // Загрузка файлов
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const uploadForm = document.getElementById('uploadForm');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        uploadForm.addEventListener('submit', this.handleFormSubmit.bind(this));

        // Конвертация
        document.getElementById('convertBtn').addEventListener('click', this.convertFiles.bind(this));

        // Токены
        document.getElementById('buyTokensBtn').addEventListener('click', this.showBuyTokensDialog.bind(this));

        // Скачивание
        document.getElementById('downloadAllBtn').addEventListener('click', this.downloadAll.bind(this));
        document.getElementById('clearAllBtn').addEventListener('click', this.clearAll.bind(this));
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

            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">${icon}</div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>${size} • ${file.type || 'Неизвестный тип'}</p>
                    </div>
                </div>
                <button onclick="fileConverter.removeFile(${index})" class="remove-btn" title="Удалить">×</button>
            `;

            listContainer.appendChild(fileItem);
        });

        // Форматы теперь обновляются через левую панель
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
        }

        this.showToast(`Файл "${file.name}" удален`, 'success');
    }

    showConverterSection() {
        document.getElementById('converterSection').style.display = 'block';
    }

    hideConverterSection() {
        document.getElementById('converterSection').style.display = 'none';
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('downloadSection').style.display = 'none';
    }

    updateFormatButtons() {
        const formatButtons = document.getElementById('formatButtons');
        formatButtons.innerHTML = '';

        const formats = this.getAvailableFormats();

        formats.forEach(format => {
            const button = document.createElement('button');
            button.className = 'format-btn';
            button.textContent = format.label;
            button.dataset.format = format.value;
            button.onclick = () => this.selectFormat(format.value, button);

            formatButtons.appendChild(button);
        });
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
        this.updateConversionDisplay();
        document.getElementById('convertBtn').disabled = false;
    }

    updateConversionDisplay() {
        const selectedConversion = document.getElementById('selectedConversion');
        const display = document.getElementById('conversionDisplay');

        if (this.selectedFormat) {
            const formatName = this.getFormatName(this.selectedFormat);
            display.innerHTML = `<strong>Конвертация в:</strong> <span class="selected-format">${formatName}</span>`;
            selectedConversion.style.display = 'block';
        } else {
            display.innerHTML = '<span class="no-conversion">Выберите формат конвертации</span>';
            selectedConversion.style.display = 'none';
        }
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

        if (!this.hasTokens()) {
            this.showToast('У вас закончились токены! Купите дополнительные токены.', 'error');
            return;
        }

        this.showProgress();

        try {
            this.updateProgress('Загрузка файлов на сервер...', 10);

            // Сначала загружаем файлы
            const uploadResult = await this.uploadFilesToServer();

            if (!uploadResult.success) {
                throw new Error('Ошибка загрузки файлов');
            }

            this.updateProgress('Конвертация файлов...', 50);

            // Затем конвертируем
            const convertResult = await this.convertFilesOnServer(uploadResult.files);

            if (!convertResult.success) {
                throw new Error('Ошибка конвертации');
            }

            this.updateProgress('Готово!', 100);

            // Тратим токен
            this.spendToken();

            // Показываем результаты
            setTimeout(() => {
                this.showDownloadSection(convertResult.files);
                this.showToast('Конвертация завершена! Потрачен 1 токен.', 'success');
            }, 500);

        } catch (error) {
            console.error('Ошибка:', error);
            this.showToast('Ошибка конвертации: ' + error.message, 'error');
            this.hideProgress();
        }
    }

    async uploadFilesToServer() {
        const formData = new FormData();

        this.files.forEach(file => {
            formData.append('files', file);
        });

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        return await response.json();
    }

    async convertFilesOnServer(uploadedFiles) {
        const fileIds = uploadedFiles.map(f => f.id);

        const response = await fetch('/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileIds: fileIds,
                targetFormat: this.selectedFormat
            })
        });

        return await response.json();
    }

    showDownloadSection(convertedFiles) {
        this.hideProgress();
        const downloadSection = document.getElementById('downloadSection');
        const downloadList = document.getElementById('downloadList');

        downloadList.innerHTML = '';

        convertedFiles.forEach((file, index) => {
            const downloadItem = document.createElement('div');
            downloadItem.className = 'download-item';

            const size = this.formatFileSize(file.size);

            downloadItem.innerHTML = `
                <div class="download-info">
                    <h4>${file.originalName}</h4>
                    <p>Размер: ${size}</p>
                </div>
                <a href="${file.downloadUrl}" class="download-btn" download>📥 Скачать</a>
            `;

            downloadList.appendChild(downloadItem);
        });

        downloadSection.style.display = 'block';
    }

    // Методы для работы с сервером заменены на демо-функционал для GitHub Pages

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

    showDownloadSection(convertedFiles) {
        this.hideProgress();
        const downloadSection = document.getElementById('downloadSection');
        const downloadList = document.getElementById('downloadList');

        downloadList.innerHTML = '';

        convertedFiles.forEach((file, index) => {
            const downloadItem = document.createElement('div');
            downloadItem.className = 'download-item';

            const size = this.formatFileSize(file.size);

            downloadItem.innerHTML = `
                <div class="download-info">
                    <h4>${file.originalName}</h4>
                    <p>Размер: ${size}</p>
                </div>
                <a href="${file.downloadUrl}" class="download-btn" download>📥 Скачать</a>
            `;

            downloadList.appendChild(downloadItem);
        });

        downloadSection.style.display = 'block';
    }

    async downloadAll() {
        // Для ZIP архива нужно создать ссылку на скачивание всех файлов
        // В этой версии просто скачиваем по одному
        const downloadLinks = document.querySelectorAll('.download-btn');

        for (const link of downloadLinks) {
            link.click();
            await new Promise(resolve => setTimeout(resolve, 500)); // Задержка между скачиваниями
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

// Инициализация приложения
const fileConverter = new FileConverter();
