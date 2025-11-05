const express = require('express');
const cors = require('cors');
const path = require('path');
const modelRoutes = require('./routes/modelRoutes');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙 (업로드된 파일)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/models', modelRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: '3D Model Viewer API',
    version: '1.0.0',
    endpoints: {
      models: '/api/models'
    }
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Upload directory: ${path.join(__dirname, '../uploads')}`);
  console.log(`Data directory: ${path.join(__dirname, '../data')}`);
});