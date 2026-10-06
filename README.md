# EduPay AI Frontend

Frontend application for EduPay AI, an AI-powered education payment assistant integrated with PayPal Sandbox.

## Overview

EduPay AI provides a simple interface where users can describe their education payment needs in natural language.

The frontend sends the request to the EduPay AI backend, displays the AI-generated payment plan, and connects the selected installment payment to PayPal Sandbox.

## Live Application

https://edupay-ai-frontend.santoshkrsbg36.workers.dev/

## Backend API

https://edupay-ai.onrender.com/

## Features

### AI Payment Planner

Users can describe their education payment requirements using natural language.

### Structured Payment Plan

The frontend displays:

- Total course fee
- Number of installments
- Amount for each installment
- Currency

### PayPal Sandbox Checkout

Users can pay the selected installment through PayPal Sandbox.

### Automatic Payment Capture

After PayPal approval, the application returns to the frontend and confirms the payment automatically.

### Payment Success

The success screen displays:

- Paid amount
- PayPal Order ID
- Capture ID
- PayPal Sandbox confirmation

### Create Another Payment Plan

Users can create a new payment plan after completing a payment without restarting the application.

## Technology Stack

- React
- Vite
- JavaScript
- CSS
- Lucide React
- Cloudflare Workers

## Backend Integration

The frontend communicates with the EduPay AI FastAPI backend for:

- AI payment-plan generation
- PayPal order creation
- PayPal payment capture
- Payment status handling

## Payment Flow

```text
User Request
      ↓
AI Payment Plan
      ↓
Frontend Displays Plan
      ↓
PayPal Order Creation
      ↓
PayPal Sandbox Checkout
      ↓
Payment Approval
      ↓
Automatic Capture
      ↓
Success Screen
      ↓
Create Another Payment Plan

## Local Setup

Clone the repository:

```bash
git clone https://github.com/santoshml-lab/EduPay-AI-Frontend.git

cd EduPay-AI-Frontend

npm install

npm run dev

npm run build

npm run preview

## Security

The frontend does not contain PayPal client secrets or Groq API keys.

Sensitive credentials are stored on the backend as environment variables.

Never commit:

- API keys
- PayPal client secrets
- Access tokens
- Private credentials

## PayPal Sandbox

EduPay AI uses PayPal Sandbox for testing and demonstration.

No real money is charged during Sandbox transactions.

## Project Status

EduPay AI is a working prototype demonstrating an AI-powered education payment experience integrated with PayPal Sandbox.

The complete frontend payment flow has been tested successfully.

## License

This project is released under the MIT License.

See the `LICENSE` file in the backend repository for details.

## Hackathon

Built for the PayPal AI Hackathon.

The project combines:

- Artificial Intelligence
- Education
- Payment Planning
- Natural Language Processing
- PayPal Sandbox
- Automated Payment Capture

  
