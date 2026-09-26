const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const { JWT_SECRET } = require('../middlewares/authMiddleware');
const { AttemptLimiter } = require('../utils/attemptLimiter');

// 10 wrong passwords for the same username from the same address → wait 15 minutes
const loginLimiter = new AttemptLimiter({ max: 10, windowMs: 15 * 60 * 1000 });

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_CREDENTIALS',
        message: 'กรุณากรอก Username และ Password'
      });
    }

    const attemptKey = `${req.ip}|${String(username).toLowerCase()}`;
    const retryAfter = loginLimiter.retryAfterSeconds(attemptKey);
    if (retryAfter) {
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_ATTEMPTS',
        retry_after: retryAfter,
        message: `ใส่รหัสผ่านผิดหลายครั้งเกินไป กรุณารอ ${Math.ceil(retryAfter / 60)} นาทีแล้วลองใหม่`
      });
    }

    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (rows.length === 0) {
      loginLimiter.fail(attemptKey);
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Username หรือ Password ไม่ถูกต้อง'
      });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      loginLimiter.fail(attemptKey);
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Username หรือ Password ไม่ถูกต้อง'
      });
    }

    if (!user.active_status) {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_DISABLED',
        message: 'บัญชีนี้ถูกระงับการใช้งาน'
      });
    }

    loginLimiter.reset(attemptKey);

    // Generate JWT Token
    const token = jwt.sign(
      { 
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        fullname: user.fullname
      },
      JWT_SECRET,
      { expiresIn: '12h' } // Token expires in 12 hours
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          user_id: user.user_id,
          username: user.username,
          fullname: user.fullname,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'เกิดข้อผิดพลาดภายในระบบ'
    });
  }
};

module.exports = {
  login
};
