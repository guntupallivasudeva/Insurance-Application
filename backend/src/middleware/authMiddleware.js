import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

if (token) {
try {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  req.user = payload;
  
} catch (err) {
  req.user = null;
}
} 
else 
{
req.user = null;
}
  if (next) {
    next();
  }
};

// Authentication middleware for REST API
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Optional: Verify user, agent, or admin still exists
        let user = await User.findById(decoded.userId);
        if (!user) {
            const Agent = (await import('../models/agent.js')).default;
            user = await Agent.findById(decoded.userId);
        }
        if (!user) {
            const Admin = (await import('../models/admin.js')).default;
            user = await Admin.findById(decoded.userId);
        }
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User/Agent/Admin not found'
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                success: false,
                message: 'Invalid token'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({
                success: false,
                message: 'Token expired'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// Authorization middleware for role-based access
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Case-insensitive role check
        const userRole = (req.user.role || '').toLowerCase();
        const allowedRoles = roles.map(r => (typeof r === 'string' ? r.toLowerCase() : String(r).toLowerCase()));
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                debug: {
                    userRole: req.user.role,
                    allowedRoles: roles
                }
            });
        }

        next();
    };
};

