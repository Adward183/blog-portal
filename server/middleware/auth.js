const jwt = require('jsonwebtoken');
const db = require('../db');

const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await db('users').where({ id: decoded.userId }).first();
        
        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

        delete user.password;
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Неверный токен' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }
        next();
    };
};

module.exports = { authenticate, authorize };