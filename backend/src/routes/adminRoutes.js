import express from 'express';
import adminController from '../controllers/adminController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
const adminAuth = [authenticateToken, authorizeRoles('Admin')];


// Temporary debug endpoint to list all admins

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

// View all claims for all customers
router.get('/allclaims', adminAuth, adminController.allClaims);
// Get a policy by its ID
router.get('/policy/:id', adminAuth, adminController.getPolicyById);
// Get details for a specific claim by claimId
router.get('/claim/:id', adminAuth, adminController.getClaimById);
// List all agents (admin only)
router.get('/agents', adminAuth, adminController.allAgents);

// Get last N audit logs (admin only)
router.get('/audit', adminAuth, adminController.getAuditLogs);

// Get minimal KPIs summary (admin only)
router.get('/summary', adminAuth, adminController.getSummaryKPIs);

export default router;
