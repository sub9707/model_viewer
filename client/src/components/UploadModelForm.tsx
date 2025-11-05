import React, { useState } from 'react';
import { modelService } from '../services/api';

interface UploadModelFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const UploadModelForm: React.FC<UploadModelFormProps> = ({ onSuccess, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [textures, setTextures] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setModelFile(e.target.files[0]);
      // 파일명을 기본 이름으로 설정
      if (!name) {
        setName(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleTexturesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setTextures(fileArray);
      console.log('Selected texture files:', fileArray.map(f => f.webkitRelativePath || f.name));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!modelFile) {
      setError('3D 모델 파일을 선택해주세요.');
      return;
    }

    if (!name.trim()) {
      setError('모델 이름을 입력해주세요.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      await modelService.uploadModel({
        name: name.trim(),
        description: description.trim(),
        modelFile,
        textures,
      });
      
      onSuccess();
    } catch (err) {
      console.error('Upload error:', err);
      setError('모델 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-form-container">
      <div className="upload-form-overlay" onClick={onCancel} />
      <div className="upload-form">
        <h2>3D 모델 등록</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">모델 이름 *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="모델 이름을 입력하세요"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">설명</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="모델 설명을 입력하세요"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="modelFile">3D 모델 파일 *</label>
            <input
              type="file"
              id="modelFile"
              onChange={handleModelFileChange}
              accept=".obj,.fbx,.gltf,.glb,.stl"
              required
            />
            {modelFile && (
              <p className="file-info">선택된 파일: {modelFile.name}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="textures">텍스처 폴더 (선택사항)</label>
            <p className="helper-text">
              MTL 파일과 텍스처 이미지가 포함된 폴더를 선택하세요
            </p>
            <input
              type="file"
              id="textures"
              onChange={handleTexturesChange}
              // @ts-ignore - webkitdirectory is not in the TypeScript types
              webkitdirectory=""
              directory=""
              multiple
            />
            {textures.length > 0 && (
              <div className="file-info">
                <p>{textures.length}개 파일 선택됨</p>
                <ul className="file-list-preview">
                  {textures.slice(0, 5).map((file, idx) => (
                    <li key={idx}>
                      {(file as any).webkitRelativePath || file.name}
                    </li>
                  ))}
                  {textures.length > 5 && (
                    <li>... 외 {textures.length - 5}개</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onCancel}
              disabled={uploading}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={uploading}
            >
              {uploading ? '업로드 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModelForm;