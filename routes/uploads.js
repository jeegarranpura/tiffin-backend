const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');

// Set up storage engine
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Initialize upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images Only!');
    }
  }
}).fields([
  { name: 'homePhoto', maxCount: 1 },
  { name: 'tiffinPhoto', maxCount: 1 }
]);

// Upload endpoint
router.post('/delivery-proof', authMiddleware, (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err });
    } else {
      if (req.files == undefined) {
        res.status(400).json({ error: 'No files selected!' });
      } else {
        const homePhoto = req.files['homePhoto'] ? `/uploads/${req.files['homePhoto'][0].filename}` : null;
        const tiffinPhoto = req.files['tiffinPhoto'] ? `/uploads/${req.files['tiffinPhoto'][0].filename}` : null;
        
        res.json({
          message: 'Files uploaded successfully!',
          files: { homePhoto, tiffinPhoto }
        });
      }
    }
  });
});

module.exports = router;
