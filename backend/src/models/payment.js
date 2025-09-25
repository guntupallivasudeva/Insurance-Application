
import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	userPolicyId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'UserPolicy',
		required: true
	},
	amount: {
		type: Number,
		required: true
	},
	method: {
		type: String,
		enum: ['Card', 'Netbanking', 'Offline', 'Simulated'],
		default: 'Simulated'
	},
	reference: {
		type: String
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
});

export default mongoose.model('Payment', PaymentSchema);

