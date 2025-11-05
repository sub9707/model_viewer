const fs = require('fs');
const path = require('path');

const MODELS_FILE = path.join(__dirname, '../../data/models.json');

// 데이터 폴더 생성
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// models.json 파일이 없으면 생성
if (!fs.existsSync(MODELS_FILE)) {
  fs.writeFileSync(MODELS_FILE, JSON.stringify([], null, 2));
}

/**
 * models.json 읽기
 * @returns {Array} 모델 배열
 */
const readModels = () => {
  try {
    const data = fs.readFileSync(MODELS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading models file:', error);
    return [];
  }
};

/**
 * models.json 쓰기
 * @param {Array} models - 모델 배열
 */
const writeModels = (models) => {
  try {
    fs.writeFileSync(MODELS_FILE, JSON.stringify(models, null, 2));
  } catch (error) {
    console.error('Error writing models file:', error);
    throw error;
  }
};

/**
 * ID로 모델 찾기
 * @param {string} id - 모델 ID
 * @returns {Object|null} 모델 객체 또는 null
 */
const findModelById = (id) => {
  const models = readModels();
  return models.find(m => m.id === id) || null;
};

/**
 * 모델 추가
 * @param {Object} model - 추가할 모델 객체
 * @returns {Object} 추가된 모델
 */
const addModel = (model) => {
  const models = readModels();
  models.push(model);
  writeModels(models);
  return model;
};

/**
 * 모델 삭제
 * @param {string} id - 삭제할 모델 ID
 * @returns {Object|null} 삭제된 모델 또는 null
 */
const deleteModel = (id) => {
  const models = readModels();
  const modelIndex = models.findIndex(m => m.id === id);
  
  if (modelIndex === -1) {
    return null;
  }

  const deletedModel = models[modelIndex];
  models.splice(modelIndex, 1);
  writeModels(models);
  
  return deletedModel;
};

module.exports = {
  readModels,
  writeModels,
  findModelById,
  addModel,
  deleteModel,
};