import React, { useState } from 'react';
import { Model } from '../types/model';

interface TextureManagerProps {
  model: Model;
  onRefresh: () => void;
}

const TextureManager: React.FC<TextureManagerProps> = ({ model, onRefresh }) => {
  const [showHelp, setShowHelp] = useState(false);

  const imageTextures = model.textures.filter(t => 
    /\.(jpg|jpeg|png|gif|bmp|tga)$/i.test(t.filename)
  );

  // ✅ MTL 파일 확인: model.mtlFile 또는 textures 배열에서 찾기
  const hasMTL = model.mtlFile !== null || model.textures.some(t => 
    t.filename.toLowerCase().endsWith('.mtl')
  );

  if (hasMTL || imageTextures.length === 0) {
    return null;
  }

  return (
    <div className="texture-manager-notice">
      <div className="notice-header">
        <span className="notice-icon">💡</span>
        <span className="notice-title">MTL 파일 없음</span>
        <button 
          className="help-btn"
          onClick={() => setShowHelp(!showHelp)}
        >
          ?
        </button>
      </div>
      
      <p className="notice-text">
        이 모델은 MTL 파일이 없어 첫 번째 텍스처(<strong>{imageTextures[0]?.filename}</strong>)가 
        자동으로 적용되었습니다.
      </p>

      {showHelp && (
        <div className="help-content">
          <h4>더 나은 텍스처 적용을 위해:</h4>
          <ol>
            <li>3D 모델링 소프트웨어(Blender 등)에서 MTL 파일 생성</li>
            <li>MTL 파일에 각 텍스처의 용도 지정:
              <ul>
                <li><code>map_Kd</code> - Diffuse (기본 색상)</li>
                <li><code>map_Bump</code> - Normal map</li>
                <li><code>map_Ks</code> - Specular map</li>
              </ul>
            </li>
            <li>MTL 파일을 텍스처 폴더에 포함하여 재업로드</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default TextureManager;