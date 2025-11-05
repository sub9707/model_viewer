export interface ModelFile {
  filename: string;
  path: string;
  mimetype: string;
  size: number;
}

export interface TextureFile extends ModelFile {
  originalPath: string;
  folderPath: string;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  modelFile: ModelFile;
  textures: TextureFile[];
  textureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadModelData {
  name: string;
  description: string;
  modelFile: File;
  textures: File[];
}