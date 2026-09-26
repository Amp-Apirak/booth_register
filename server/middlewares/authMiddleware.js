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

/**
 * Role check after verifyToken. Admin: everything. Staff (gate/event-day staff): check-in,
 * attendee list/add/edit, ticket lookup, reports, lucky draw — not settings, deletes or bulk import.
 */
const requireRole = (...roles) => (req, res, next) => {
  if (roles.includes(req.user?.role)) return next();
  return res.status(403).json({
    success: false,
    error: 'FORBIDDEN',
    message: 'บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้ (สำหรับผู้ดูแลระบบเท่านั้น)'
  });
};

module.exports = {
  JWT_SECRET,
  verifyToken,
  requireRole
};
