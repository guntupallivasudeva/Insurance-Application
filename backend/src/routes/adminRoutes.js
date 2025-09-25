
import express from 'express';
import adminController from '../controllers/adminController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import Admin from '../models/admin.js';

const router = express.Router();
const adminAuth = [authenticateToken, authorizeRoles('Admin')];


// Temporary debug endpoint to list all admins
router.get('/debug-list-admins', async (req, res) => {
    try {
        const admins = await Admin.find({}, { password: 0 });
        res.json({ success: true, admins });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Policy management routes
router.post('/addpolicies', adminController.addPolicy); // Temporarily remove auth for testing
router.get('/getpolicies', adminAuth, adminController.getPolicies);
router.put('/updatepolicies/:id', adminAuth, adminController.updatePolicy);
router.delete('/deletepolicies/:id', adminAuth, adminController.deletePolicy);

router.get('/userpolicies', adminAuth, adminController.allUserPolicies);
router.get('/payments', adminAuth, adminController.allPayments);
router.post('/createagent', adminAuth, adminController.createAgent);
router.post('/assignpolicy', adminAuth, adminController.assignPolicyToAgent);
router.get('/customerdetails', adminAuth, adminController.allCustomerData);
router.post('/approvepolicy', adminAuth, adminController.approvePolicy);
router.post('/approveclaim', adminAuth, adminController.approveClaim);

export default router;
