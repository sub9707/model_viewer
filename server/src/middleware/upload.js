const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Multer 저장소 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!req.modelId) {
      req.modelId = req.body.modelId || uuidv4();
    }

    let uploadPath;

    if (file.fieldname === 'textures') {
      // 텍스처 파일의 폴더 구조 유지
      const relativePath = file.originalname;
      const dirname = path.dirname(relativePath);
      uploadPath = path.join(__dirname, '../../uploads', req.modelId, 'textures', dirname);
    } else {
      // 모델 또는 MTL 파일은 모델 루트 디렉토리에 저장
      uploadPath = path.join(__dirname, '../../uploads', req.modelId);
    }

    // 폴더 생성
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    cb(null, path.basename(file.originalname));
  }
});

// Multer 인스턴스
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// 모델 파일 + 텍스처 폴더 + MTL 파일 업로드 미들웨어
const uploadModelFiles = upload.fields([
  { name: 'modelFile', maxCount: 1 },
  { name: 'mtlFile', maxCount: 1 },
  { name: 'textures', maxCount: 500 }
]);

module.exports = { uploadModelFiles };
