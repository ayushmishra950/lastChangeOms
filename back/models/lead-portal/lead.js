const mongoose = require("mongoose");

// Define the schema
const leadSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            default: null,
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },
        source: {
            type: String,
            trim: true,
            default: "Website"
        },
        status: {
            type: String,
            enum: ["new", "interested", "contacted", "enrolled", "lost", "demo", "inDemo"],
            default: "new"
        },

    },
    { timestamps: true } // createdAt and updatedAt
);

// Export the model
module.exports = mongoose.model("Lead", leadSchema);