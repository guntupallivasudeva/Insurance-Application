import express from 'express';
import adminController from '../controllers/adminController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
const adminAuth = [authenticateToken, authorizeRoles('Admin')];

// Test route (no auth)
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Admin routes are working!' });
});

// Policy management routes
router.post('/addpolicies', adminController.addPolicy); // Temporarily remove auth for testing
router.get('/policies', adminAuth, adminController.getPolicies);
router.put('/policies/:id', adminAuth, adminController.updatePolicy);
router.delete('/policies/:id', adminAuth, adminController.deletePolicy);

router.get('/userpolicies', adminAuth, adminController.allUserPolicies);
router.get('/payments', adminAuth, adminController.allPayments);
router.post('/createagent', adminAuth, adminController.createAgent);
router.post('/assignpolicy', adminAuth, adminController.assignPolicyToAgent);
router.get('/customerdetails', adminAuth, adminController.allCustomerData);
router.post('/approvepolicy', adminAuth, adminController.approvePolicy);
router.post('/approveclaim', adminAuth, adminController.approveClaim);

export default router;
