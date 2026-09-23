const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Missing required environment variable: JWT_SECRET (see server/.env.example)');
}

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'ไม่พบข้อมูลการยืนยันตัวตน (Token) ในระบบ'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'เซสชันหมดอายุ กรุณาล็อกอินใหม่อีกครั้ง'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'ข้อมูลการยืนยันตัวตนไม่ถูกต้อง'
    });
  }
};

module.exports = {
  JWT_SECRET,
  verifyToken
};
