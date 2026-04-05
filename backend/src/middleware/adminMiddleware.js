
const adminMiddleware = async (req, res, next) => {
    // Check if the user is authenticated and has the 'Admin' role in JWT
    if (req.user && req.user.role === 'Admin') {
      next();
    } else {
      return res.status(403).json({ message: "Access denied: You are not an administrator." });
    }
} 

export default adminMiddleware;

