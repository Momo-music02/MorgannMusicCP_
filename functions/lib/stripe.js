"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStripeClient = getStripeClient;
const stripe_1 = __importDefault(require("stripe"));
function getStripeClient(secretKey) {
    const key = secretKey || process.env.STRIPE_SECRET_KEY;
    if (!key)
        throw new Error("STRIPE_SECRET_KEY manquante");
    return new stripe_1.default(key, { apiVersion: "2024-06-20" });
}
