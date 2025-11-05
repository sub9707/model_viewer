import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Model } from '../types/model';
import { modelService } from '../services/api';
import ModelViewer from '../components/ModelViewer';
import TextureManager from '../components/TextureManager';

const ModelViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    const fetchModel = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError('');
        const data = await modelService.getModelById(id);
        setModel(data);
      } catch (err) {
        console.error('Error fetching model:', err);
        setError('모델을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchModel();
  }, [id]);

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (error || !model) {
    return (
      <div className="error-container">
        <p>{error || '모델을 찾을 수 없습니다.'}</p>
        <button onClick={() => navigate('/')}>목록으로 돌아가기</button>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="model-viewer-page">
      <header className="viewer-header">
        <button onClick={() => navigate('/')} className="btn-back">
          ← 목록으로
        </button>
        <h2>{model.name}</h2>
        <button 
          onClick={() => setShowDetails(!showDetails)} 
          className="btn-toggle"
        >
          {showDetails ? '정보 숨기기' : '정보 보기'}
        </button>
      </header>

      <div className="viewer-layout">
        <div className="viewer-main">
          <ModelViewer model={model} />
        </div>

        {showDetails && (
          <aside className="viewer-sidebar">
            <TextureManager model={model} onRefresh={() => {}} />
            
            <div className="model-details">
              <h3>모델 정보</h3>
              
              <div className="detail-section">
                <h4>기본 정보</h4>
                <p><strong>이름:</strong> {model.name}</p>
                <p><strong>설명:</strong> {model.description || '설명 없음'}</p>
                <p><strong>등록일:</strong> {new Date(model.createdAt).toLocaleString('ko-KR')}</p>
              </div>

              <div className="detail-section">
                <h4>파일 정보</h4>
                <p><strong>파일명:</strong> {model.modelFile.filename}</p>
                <p><strong>타입:</strong> {model.modelFile.mimetype}</p>
                <p><strong>크기:</strong> {formatFileSize(model.modelFile.size)}</p>
              </div>

              {model.textures.length > 0 && (
                <div className="detail-section">
                  <h4>텍스처 ({model.textureCount || model.textures.length}개)</h4>
                  <div className="texture-list-compact">
                    {/* MTL 파일 먼저 표시 */}
                    {model.textures
                      .filter(t => t.filename.toLowerCase().endsWith('.mtl'))
                      .map((texture, idx) => (
                        <div key={`mtl-${idx}`} className="texture-item mtl-file">
                          <span className="texture-name">
                            📄 {texture.folderPath && `${texture.folderPath}/`}
                            {texture.filename}
                          </span>
                          <span className="texture-size">
                            {formatFileSize(texture.size)}
                          </span>
                        </div>
                      ))}
                    {/* 나머지 파일들 */}
                    {model.textures
                      .filter(t => !t.filename.toLowerCase().endsWith('.mtl'))
                      .slice(0, 10)
                      .map((texture, idx) => (
                        <div key={idx} className="texture-item">
                          <span className="texture-name">
                            {texture.folderPath && `${texture.folderPath}/`}
                            {texture.filename}
                          </span>
                          <span className="texture-size">
                            {formatFileSize(texture.size)}
                          </span>
                        </div>
                      ))}
                    {model.textures.filter(t => !t.filename.toLowerCase().endsWith('.mtl')).length > 10 && (
                      <p className="texture-more">
                        ... 외 {model.textures.filter(t => !t.filename.toLowerCase().endsWith('.mtl')).length - 10}개
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default ModelViewerPage;