const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { readModels, findModelById, addModel, deleteModel } = require('../utils/modelStore');

/**
 * 모든 모델 조회
 */
const getAllModels = (req, res) => {
  try {
    const models = readModels();
    res.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
};

/**
 * 특정 모델 조회
 */
const getModelById = (req, res) => {
  try {
    const model = findModelById(req.params.id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    res.json(model);
  } catch (error) {
    console.error('Error fetching model:', error);
    res.status(500).json({ error: 'Failed to fetch model' });
  }
};

/**
 * 모델 등록 (파일 업로드)
 */
const createModel = (req, res) => {
  try {
    const { name, description } = req.body;
    const modelId = req.modelId || uuidv4();
    
    // 모델 파일 검증
    if (!req.files || !req.files.modelFile) {
      return res.status(400).json({ error: 'Model file is required' });
    }

    const modelFile = req.files.modelFile[0];
    const textures = req.files.textures || [];

    // 텍스처 파일 정보 생성 (폴더 구조 포함)
    const textureInfo = textures.map(texture => {
      // originalname에서 폴더 경로 추출
      const relativePath = texture.originalname;
      const dirname = path.dirname(relativePath);
      const basename = path.basename(relativePath);
      
      return {
        filename: basename,
        originalPath: relativePath,
        folderPath: dirname === '.' ? '' : dirname,
        path: `/uploads/${modelId}/textures/${relativePath}`,
        mimetype: texture.mimetype,
        size: texture.size
      };
    });

    // 새 모델 객체 생성
    const newModel = {
      id: modelId,
      name: name || modelFile.originalname,
      description: description || '',
      modelFile: {
        filename: modelFile.filename,
        path: `/uploads/${modelId}/${modelFile.filename}`,
        mimetype: modelFile.mimetype,
        size: modelFile.size
      },
      textures: textureInfo,
      textureCount: textures.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 데이터베이스에 추가
    const savedModel = addModel(newModel);

    res.status(201).json(savedModel);
  } catch (error) {
    console.error('Error uploading model:', error);
    res.status(500).json({ error: 'Failed to upload model' });
  }
};

/**
 * 모델 삭제
 */
const removeModel = (req, res) => {
  try {
    const model = deleteModel(req.params.id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // 파일 시스템에서 파일 삭제
    const modelDir = path.join(__dirname, '../../uploads', model.id);
    if (fs.existsSync(modelDir)) {
      fs.rmSync(modelDir, { recursive: true, force: true });
    }

    res.json({ 
      message: 'Model deleted successfully',
      deletedModel: model
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
};

module.exports = {
  getAllModels,
  getModelById,
  createModel,
  removeModel,
};