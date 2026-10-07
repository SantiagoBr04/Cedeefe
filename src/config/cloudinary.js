import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// As credenciais são carregadas do process.env automaticamente pelo sdk ou podemos forçar
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cedeefe_imagens',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp']
  }
});

const uploadImage = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // Limite de 15MB
  }
});

const storageQuestoes = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cedeefe_questoes',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
    tags: ['questao_pendente']
  }
});

const uploadImagemQuestao = multer({
  storage: storageQuestoes,
  limits: {
    fileSize: 15 * 1024 * 1024 // Limite de 15MB
  }
});

export { cloudinary, uploadImage, uploadImagemQuestao };
