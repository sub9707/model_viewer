import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Model } from '../types/model';
import { modelService } from '../services/api';
import ModelCard from '../components/ModelCard';
import UploadModelForm from '../components/UploadModelForm';

const ModelListPage: React.FC = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [error, setError] = useState('');

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await modelService.getAllModels();
      setModels(data);
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('모델 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleSelectModel = (model: Model) => {
    navigate(`/model/${model.id}`);
  };

  const handleDeleteModel = async (id: string) => {
    if (!window.confirm('정말 이 모델을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await modelService.deleteModel(id);
      setModels(models.filter(m => m.id !== id));
    } catch (err) {
      console.error('Error deleting model:', err);
      alert('모델 삭제에 실패했습니다.');
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    fetchModels();
  };

  return (
    <div className="model-list-page">
      <header className="page-header">
        <h1>3D 모델 뷰어</h1>
        <button 
          className="btn-add"
          onClick={() => setShowUploadForm(true)}
        >
          + 모델 등록
        </button>
      </header>

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : models.length === 0 ? (
        <div className="empty-state">
          <p>등록된 모델이 없습니다.</p>
          <button 
            className="btn-add"
            onClick={() => setShowUploadForm(true)}
          >
            첫 모델 등록하기
          </button>
        </div>
      ) : (
        <div className="model-grid">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onSelect={handleSelectModel}
              onDelete={handleDeleteModel}
            />
          ))}
        </div>
      )}

      {showUploadForm && (
        <UploadModelForm
          onSuccess={handleUploadSuccess}
          onCancel={() => setShowUploadForm(false)}
        />
      )}
    </div>
  );
};

export default ModelListPage;