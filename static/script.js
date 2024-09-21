document.addEventListener('DOMContentLoaded', (event) => {
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('file');
    const filePreview = document.getElementById('file-preview');
    const fileList = document.getElementById('file-list');
    const filesLink = document.getElementById('files-link');
    const uploadLink = document.getElementById('upload-link');
    const filesSection = document.getElementById('files-section');
    const uploadSection = document.getElementById('upload-section');

    filesLink.addEventListener('click', (e) => {
        e.preventDefault();
        filesSection.style.display = 'block';
        uploadSection.style.display = 'none';
        filesLink.classList.add('active');
        uploadLink.classList.remove('active');
    });

    uploadLink.addEventListener('click', (e) => {
        e.preventDefault();
        filesSection.style.display = 'none';
        uploadSection.style.display = 'block';
        filesLink.classList.remove('active');
        uploadLink.classList.add('active');
    });

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                filePreview.innerHTML = '';
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    filePreview.appendChild(img);
                } else {
                    filePreview.textContent = `Selected file: ${file.name}`;
                }
            }
            reader.readAsDataURL(file);
        }
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(form);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            showNotification(data.message, data.success ? 'success' : 'error');
            if (data.success) {
                form.reset();
                filePreview.innerHTML = '';
                updateFileList();
            }
        })
        .catch(error => {
            showNotification('An error occurred', 'error');
        });
    });

    function showNotification(message, type) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.opacity = 1;

        setTimeout(() => {
            notification.style.opacity = 0;
        }, 3000);
    }

    function updateDiskUsage(diskUsage) {
        const diskUsageInfo = document.getElementById('disk-usage-info');
        const usedPercentage = (diskUsage.used / diskUsage.total) * 100;
        diskUsageInfo.innerHTML = `
            <div class="progress-bar">
                <div class="progress" style="width: ${usedPercentage}%"></div>
            </div>
            <p>Used: ${diskUsage.used} GB / Total: ${diskUsage.total} GB</p>
            <p>Free: ${diskUsage.free} GB</p>
        `;
    }

    function updateFileList() {
        fetch('/files')
            .then(response => response.json())
            .then(data => {
                fileList.innerHTML = '';
                data.files.forEach(file => {
                    const li = document.createElement('li');
                    const thumbnail = document.createElement('img');
                    thumbnail.src = file.thumbnail;
                    thumbnail.alt = file.name;
                    thumbnail.className = 'file-thumbnail';
                    const link = document.createElement('a');
                    link.href = `/download/${encodeURIComponent(file.name)}`;
                    link.textContent = file.name;
                    const previewButton = document.createElement('button');
                    previewButton.textContent = 'Preview';
                    previewButton.onclick = (e) => {
                        e.preventDefault();
                        showPreview(file.preview, file.name);
                    };
                    li.appendChild(thumbnail);
                    li.appendChild(link);
                    li.appendChild(previewButton);
                    fileList.appendChild(li);
                });
                updateDiskUsage(data.disk_usage);
            })
            .catch(error => {
                console.error('Error updating file list:', error);
            });
    }

    function showPreview(previewUrl, fileName) {
        fetch(previewUrl)
            .then(response => response.json())
            .then(data => {
                const previewContainer = document.createElement('div');
                previewContainer.className = 'preview-container';
                
                const closeButton = document.createElement('button');
                closeButton.textContent = 'Close';
                closeButton.onclick = () => previewContainer.remove();
                previewContainer.appendChild(closeButton);

                const titleElement = document.createElement('h3');
                titleElement.textContent = fileName;
                previewContainer.appendChild(titleElement);

                switch (data.type) {
                    case 'text':
                        const pre = document.createElement('pre');
                        pre.textContent = data.content;
                        previewContainer.appendChild(pre);
                        break;
                    case 'pdf':
                        const iframe = document.createElement('iframe');
                        iframe.src = data.url;
                        iframe.width = '100%';
                        iframe.height = '600px';
                        previewContainer.appendChild(iframe);
                        break;
                    case 'video':
                        const video = document.createElement('video');
                        video.src = data.url;
                        video.controls = true;
                        video.width = '100%';
                        previewContainer.appendChild(video);
                        break;
                    case 'audio':
                        const audio = document.createElement('audio');
                        audio.src = data.url;
                        audio.controls = true;
                        previewContainer.appendChild(audio);
                        break;
                    default:
                        previewContainer.appendChild(document.createTextNode('Preview not available for this file type.'));
                }

                document.body.appendChild(previewContainer);
            })
            .catch(error => {
                console.error('Error showing preview:', error);
                showNotification('Error showing preview', 'error');
            });
    }

    updateFileList();
});