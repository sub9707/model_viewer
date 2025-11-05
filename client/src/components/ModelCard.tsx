import React from 'react';
import { Model } from '../types/model';

interface ModelCardProps {
  model: Model;
  onSelect: (model: Model) => void;
  onDelete: (id: string) => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ model, onSelect, onDelete }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="model-card">
      <div className="model-card-header">
        <h3>{model.name}</h3>
      </div>
      <div className="model-card-body">
        <p className="description">{model.description || '설명 없음'}</p>
        <div className="model-info">
          <p><strong>파일:</strong> {model.modelFile.filename}</p>
          <p><strong>크기:</strong> {formatFileSize(model.modelFile.size)}</p>
          <p><strong>텍스처:</strong> {model.textureCount || model.textures.length}개</p>
          <p><strong>등록일:</strong> {formatDate(model.createdAt)}</p>
        </div>
      </div>
      <div className="model-card-actions">
        <button 
          className="btn-view"
          onClick={() => onSelect(model)}
        >
          보기
        </button>
        <button 
          className="btn-delete"
          onClick={() => onDelete(model.id)}
        >
          삭제
        </button>
      </div>
    </div>
  );
};

export default ModelCard;