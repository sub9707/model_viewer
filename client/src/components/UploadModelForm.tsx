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
  const [mtlFile, setMtlFile] = useState<File | null>(null);
  const [textures, setTextures] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setModelFile(file);
      if (!name) setName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleMtlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setMtlFile(e.target.files[0]);
    }
  };

  const handleTexturesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setTextures(files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!modelFile) return setError('3D 모델 파일을 선택해주세요.');
    if (!name.trim()) return setError('모델 이름을 입력해주세요.');

    setUploading(true);
    setError('');

    try {
      await modelService.uploadModel({
        name,
        description,
        modelFile,
        mtlFile,
        textures,
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      setError('업로드에 실패했습니다.');
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
          {/* 이름 */}
          <div className="form-group">
            <label>모델 이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="모델 이름을 입력하세요"
              required
            />
          </div>

          {/* 설명 */}
          <div className="form-group">
            <label>설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="선택 사항입니다"
            />
          </div>

          {/* 모델 파일 */}
          <div className="form-group">
            <label>3D 모델 파일 (.obj, .fbx, .glb 등) *</label>
            <input
              type="file"
              accept=".obj,.fbx,.glb,.gltf,.stl"
              onChange={handleModelFileChange}
              required
            />
            {modelFile && (
              <div className="file-info">📄 {modelFile.name}</div>
            )}
          </div>

          {/* ✅ MTL 파일 */}
          <div className="form-group">
            <label>MTL 파일 (선택)</label>
            <input type="file" accept=".mtl" onChange={handleMtlFileChange} />
            {mtlFile && (
              <div className="file-info">📄 {mtlFile.name}</div>
            )}
          </div>

          {/* 텍스처 폴더 */}
          <div className="form-group">
            <label>텍스처 폴더 선택</label>
            <p className="helper-text">이미지 및 텍스처를 포함한 폴더를 선택하세요.</p>
            <input
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleTexturesChange}
            />
            {textures.length > 0 && (
              <ul className="file-list-preview">
                {textures.slice(0, 5).map((file, idx) => (
                  <li key={idx}>{file.webkitRelativePath || file.name}</li>
                ))}
                {textures.length > 5 && (
                  <li className="texture-more">+ {textures.length - 5}개 더 있음</li>
                )}
              </ul>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && <p className="error-message">{error}</p>}

          {/* 액션 버튼 */}
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
