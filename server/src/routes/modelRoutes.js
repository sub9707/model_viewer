const express = require('express');
const router = express.Router();
const { uploadModelFiles } = require('../middleware/upload');
const {
  getAllModels,
  getModelById,
  createModel,
  removeModel,
} = require('../controllers/modelController');

// 모든 모델 조회
router.get('/', getAllModels);

// 특정 모델 조회
router.get('/:id', getModelById);

// 모델 등록 (파일 업로드)
router.post('/', uploadModelFiles, createModel);

// 모델 삭제
router.delete('/:id', removeModel);

module.exports = router;