import axios from 'axios';
import { Model, UploadModelData } from '../types/model';

const API_BASE_URL = 'http://localhost:8000/api';

export const modelService = {
  // 모든 모델 조회
  getAllModels: async (): Promise<Model[]> => {
    const response = await axios.get<Model[]>(`${API_BASE_URL}/models`);
    return response.data;
  },

  // 특정 모델 조회
  getModelById: async (id: string): Promise<Model> => {
    const response = await axios.get<Model>(`${API_BASE_URL}/models/${id}`);
    return response.data;
  },

  // 모델 등록
  uploadModel: async (data: UploadModelData): Promise<Model> => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('modelFile', data.modelFile);
    
    // 텍스처 파일 추가 (폴더 구조 정보 포함)
    data.textures.forEach((texture) => {
      // webkitRelativePath가 있으면 사용, 없으면 파일명만 사용
      const relativePath = (texture as any).webkitRelativePath || texture.name;
      
      // File 객체를 새로운 이름으로 생성 (브라우저 호환성을 위해)
      const newFile = new File([texture], relativePath, {
        type: texture.type,
        lastModified: texture.lastModified,
      });
      
      formData.append('textures', newFile);
    });

    const response = await axios.post<Model>(`${API_BASE_URL}/models`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 모델 삭제
  deleteModel: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/models/${id}`);
  },
};