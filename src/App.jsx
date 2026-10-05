import { useState } from "react";

const BACKEND_URL = "https://edupay-ai.onrender.com";

function App() {
  const [amount, setAmount] = useState("10.00");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const createPayment = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${BACKEND_URL}/paypal/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            amount,
            currency: "USD",
            description: "EduPay AI Education Payment"
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to create PayPal order."
        );
      }

      const approvalLink = data.order?.links?.find(
        (link) => link.rel === "approve"
      );

      if (!approvalLink) {
        throw new Error("PayPal approval link was not returned.");
      }

      window.location.href = approvalLink.href;
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">
          <span className="logo-mark">E</span>
          <span>EduPay AI</span>
        </div>

        <span className="sandbox-badge">
          PayPal Sandbox
        </span>
      </header>

      <main className="hero">
        <section className="hero-content">
          <p className="eyebrow">AI × EDUCATION × PAYMENTS</p>

          <h1>
            Smarter education payments
            <span> powered by AI.</span>
          </h1>

          <p className="subtitle">
            EduPay AI helps students and parents plan education
            payments and securely complete them through PayPal.
          </p>

          <div className="payment-card">
            <div className="card-header">
              <div>
                <p className="card-label">Education Payment</p>
                <h2>Course Fee</h2>
              </div>

              <div className="secure">
                Secure
              </div>
            </div>

            <label htmlFor="amount">Payment Amount</label>

            <div className="amount-input">
              <span>$</span>

              <input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value)
                }
              />

              <span>USD</span>
            </div>

            <button
              className="pay-button"
              onClick={createPayment}
              disabled={loading}
            >
              {loading
                ? "Creating PayPal Order..."
                : "Continue with PayPal"}
            </button>

            {message && (
              <p className="error-message">
                {message}
              </p>
            )}

            <p className="sandbox-note">
              This is a PayPal Sandbox transaction.
              No real money is charged.
            </p>
          </div>
        </section>

        <aside className="info-panel">
          <div className="ai-icon">✦</div>

          <h2>AI-powered payment assistant</h2>

          <p>
            EduPay AI combines intelligent payment planning
            with PayPal's secure checkout experience.
          </p>

          <div className="feature-list">
            <div className="feature">
              <span>01</span>
              <div>
                <strong>AI Planning</strong>
                <p>Understand education payment needs.</p>
              </div>
            </div>

            <div className="feature">
              <span>02</span>
              <div>
                <strong>Smart Payment</strong>
                <p>Create the right PayPal payment flow.</p>
              </div>
            </div>

            <div className="feature">
              <span>03</span>
              <div>
                <strong>Secure Checkout</strong>
                <p>Complete payment through PayPal Sandbox.</p>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <footer>
        <span>EduPay AI</span>
        <span>Built with AI + PayPal</span>
      </footer>
    </div>
  );
}

export default App;
