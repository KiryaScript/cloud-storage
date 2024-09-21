from flask import Flask, render_template, request, send_file, jsonify, send_from_directory
import os
from PIL import Image
import io
import shutil
import mimetypes

app = Flask(__name__, static_url_path='/static')

UPLOAD_FOLDER = 'files'
THUMBNAIL_SIZE = (100, 100)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def get_files(directory):
    file_list = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, directory)
            file_list.append(rel_path)
    return sorted(file_list)

def get_disk_usage():
    total, used, free = shutil.disk_usage(UPLOAD_FOLDER)
    return {
        'total': total // (2**30),  # Convert to GB
        'used': used // (2**30),
        'free': free // (2**30)
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file part'})
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No selected file'})
    if file:
        filename = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        file.save(filename)
        return jsonify({'success': True, 'message': 'File uploaded successfully'})
    


@app.route('/download/<path:filename>')
def download_file(filename):
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename), as_attachment=True)

@app.route('/thumbnail/<path:filename>')
def thumbnail(filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(file_path):
        return send_from_directory(app.static_folder, 'file-icon.png')

    if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
        try:
            im = Image.open(file_path)
            im.thumbnail(THUMBNAIL_SIZE)
            thumbnail_io = io.BytesIO()
            im.save(thumbnail_io, 'JPEG')
            thumbnail_io.seek(0)
            return send_file(thumbnail_io, mimetype='image/jpeg')
        except:
            return send_from_directory(app.static_folder, 'file-icon.png')
    else:
        return send_from_directory(app.static_folder, 'file-icon.png')
    
@app.route('/preview/<path:filename>')
def preview_file(filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    mime_type, _ = mimetypes.guess_type(file_path)
    
    if mime_type:
        mime_category = mime_type.split('/')[0]
        if mime_category in ['text', 'application'] and mime_type != 'application/pdf':
            with open(file_path, 'r') as f:
                content = f.read()
            return jsonify({'type': 'text', 'content': content})
        elif mime_type == 'application/pdf':
            return jsonify({'type': 'pdf', 'url': f'/download/{filename}'})
        elif mime_category == 'video':
            return jsonify({'type': 'video', 'url': f'/download/{filename}'})
        elif mime_category == 'audio':
            return jsonify({'type': 'audio', 'url': f'/download/{filename}'})
    
    return jsonify({'type': 'unsupported'})

@app.route('/files')
def get_file_list():
    files = get_files(app.config['UPLOAD_FOLDER'])
    disk_usage = get_disk_usage()
    return jsonify({
        'files': [{'name': f, 'thumbnail': f'/thumbnail/{f}', 'preview': f'/preview/{f}'} for f in files],
        'disk_usage': disk_usage
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)