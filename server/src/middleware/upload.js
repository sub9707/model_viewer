const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Multer 저장소 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const modelId = req.body.modelId || req.modelId || uuidv4();
    
    // modelId를 req에 저장
    if (!req.modelId) {
      req.modelId = modelId;
    }
    
    let uploadPath;
    
    // 텍스처 파일인 경우 폴더 구조 유지
    if (file.fieldname === 'textures') {
      // originalname에서 폴더 경로 추출 (브라우저에서 전송한 경로)
      const relativePath = file.originalname;
      const dirname = path.dirname(relativePath);
      
      // textures 폴더 아래에 상대 경로 유지
      uploadPath = path.join(__dirname, '../../uploads', modelId, 'textures', dirname);
    } else {
      // 모델 파일은 루트에 저장
      uploadPath = path.join(__dirname, '../../uploads', modelId);
    }
    
    // 폴더가 없으면 재귀적으로 생성
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // 텍스처의 경우 파일명만 사용 (경로는 destination에서 처리)
    if (file.fieldname === 'textures') {
      const basename = path.basename(file.originalname);
      cb(null, basename);
    } else {
      // 모델 파일은 원본 파일명 유지
      cb(null, file.originalname);
    }
  }
});

// Multer 인스턴스 생성
const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB 제한
  }
});

// 모델 파일 + 텍스처 폴더 업로드 미들웨어
const uploadModelFiles = upload.fields([
  { name: 'modelFile', maxCount: 1 },
  { name: 'textures', maxCount: 100 } // 폴더의 경우 더 많은 파일 허용
]);

module.exports = {
  uploadModelFiles,
};