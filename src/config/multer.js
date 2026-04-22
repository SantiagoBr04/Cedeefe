import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Caminho relativo à raiz onde o script roda
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro para permitir apenas imagens ou csv (no caso de importação de baralho)
const fileFilter = (req, file, cb) => {
    // Se a rota for de importar baralhos, aceitamos csv, senão só imagens
    const isImportRoute = req.originalUrl && req.originalUrl.includes('/importar');

    if (isImportRoute) {
        if (file.mimetype === 'text/csv' || 
            file.mimetype === 'application/vnd.ms-excel' ||
            path.extname(file.originalname).toLowerCase() === '.csv') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos CSV são permitidos para importação.'), false);
        }
    } else {
        // Filtragem padrão para imagens
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true); // Aceita o arquivo
        } else {
            cb(new Error('Somente arquivos de imagem (JPEG, PNG, GIF, WEBP) são permitidos.'), false); // Rejeita o arquivo
        }
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Limite de 5MB
    }
});

// A exportação correta para ES Modules:
export default upload;