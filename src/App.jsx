import { useEffect, useState } from "react";

const BACKEND_URL = "https://edupay-ai.onrender.com";

function App() {
  const [message, setMessage] = useState(
    "I need to pay $200 for an online course in 4 equal installments."
  );

  const [paymentPlan, setPaymentPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);

  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");

  const [paymentSuccess, setPaymentSuccess] = useState(null);

  useEffect(() => {
    const captureApprovedOrder = async () => {
      const params = new URLSearchParams(window.location.search);
      const orderId = params.get("token");

      if (!orderId) {
        return;
      }

      try {
        setLoadingPayment(true);
        setStatusType("status");
        setStatus("Capturing your PayPal payment...");

        const savedPlan = sessionStorage.getItem(
          "edupay_payment_plan"
        );

        if (savedPlan) {
          setPaymentPlan(JSON.parse(savedPlan));
        }

        const response = await fetch(
          `${BACKEND_URL}/paypal/capture-order/${orderId}`,
          {
            method: "POST"
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to capture PayPal payment."
          );
        }

        const paypalStatus = data.order?.status;

        if (paypalStatus === "COMPLETED") {
          const capture =
            data.order?.purchase_units?.[0]?.payments
              ?.captures?.[0];

          setPaymentSuccess({
            orderId: data.order?.id || orderId,
            captureId: capture?.id || "Confirmed",
            amount:
              capture?.amount?.value ||
              data.order?.purchase_units?.[0]?.amount?.value ||
              "Unknown",
            currency:
              capture?.amount?.currency_code ||
              data.order?.purchase_units?.[0]?.amount
                ?.currency_code ||
              "USD"
          });

          setStatus("");
          setStatusType("");

          sessionStorage.removeItem(
            "edupay_payment_plan"
          );
        } else {
          setStatusType("error");
          setStatus(
            `PayPal payment status: ${
              paypalStatus || "Unknown"
            }`
          );
        }

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } catch (error) {
        setStatusType("error");
        setStatus(error.message);
      } finally {
        setLoadingPayment(false);
      }
    };

    captureApprovedOrder();
  }, []);

  const generatePaymentPlan = async () => {
    try {
      setLoadingPlan(true);
      setPaymentPlan(null);
      setPaymentSuccess(null);
      setStatus("");
      setStatusType("");

      const response = await fetch(
        `${BACKEND_URL}/ai/payment-plan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to generate payment plan."
        );
      }

      setPaymentPlan(data.payment_plan);
    } catch (error) {
      setStatusType("error");
      setStatus(error.message);
    } finally {
      setLoadingPlan(false);
    }
  };

  const createPayment = async () => {
    if (!paymentPlan) {
      setStatusType("error");
      setStatus("Please generate a payment plan first.");
      return;
    }

    try {
      setLoadingPayment(true);
      setStatus("");
      setStatusType("");

      sessionStorage.setItem(
        "edupay_payment_plan",
        JSON.stringify(paymentPlan)
      );

      const response = await fetch(
        `${BACKEND_URL}/paypal/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            amount: paymentPlan.installment_amount.toFixed(2),
            currency: paymentPlan.currency,
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
        throw new Error(
          "PayPal approval link was not returned."
        );
      }

      window.location.href = approvalLink.href;
    } catch (error) {
      sessionStorage.removeItem(
        "edupay_payment_plan"
      );

      setStatusType("error");
      setStatus(error.message);
      setLoadingPayment(false);
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
          <p className="eyebrow">
            AI × EDUCATION × PAYMENTS
          </p>

          <h1>
            Smarter education payments
            <span> powered by AI.</span>
          </h1>

          <p className="subtitle">
            EduPay AI understands your education payment needs,
            creates a payment plan, and connects it to PayPal.
          </p>

          {paymentSuccess ? (
            <div className="payment-card success-card">
              <div className="success-icon">
                ✓
              </div>

              <p className="eyebrow">
                PAYMENT SUCCESSFUL
              </p>

              <h2>
                Payment completed successfully
              </h2>

              <p className="success-description">
                Your education payment was successfully
                processed through PayPal Sandbox.
              </p>

              <div className="payment-plan">
                <div className="plan-row highlight">
                  <span>Paid Amount</span>

                  <strong>
                    {paymentSuccess.currency}{" "}
                    {paymentSuccess.amount}
                  </strong>
                </div>

                <div className="plan-row">
                  <span>PayPal Order ID</span>

                  <strong>
                    {paymentSuccess.orderId}
                  </strong>
                </div>

                <div className="plan-row">
                  <span>Capture ID</span>

                  <strong>
                    {paymentSuccess.captureId}
                  </strong>
                </div>

                <p className="paypal-plan-note">
                  This was a PayPal Sandbox transaction.
                  No real money was charged.
                </p>
                <button
  className="pay-button"
  onClick={() => {
    setPaymentSuccess(null);
    setPaymentPlan(null);
    setStatus("");
    setStatusType("");
    setMessage(
      "I need to pay $200 for an online course in 4 equal installments."
    );
  }}
>
  Create Another Payment Plan
</button>
              </div>
            </div>
          ) : (
            <div className="payment-card">
              <div className="card-header">
                <div>
                  <p className="card-label">
                    AI Payment Planner
                  </p>

                  <h2>Plan your payment</h2>
                </div>

                <div className="secure">
                  AI
                </div>
              </div>

              <label htmlFor="message">
                Tell EduPay AI what you need to pay
              </label>

              <textarea
                id="message"
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                disabled={
                  loadingPlan || loadingPayment
                }
                rows="4"
              />

              <button
                className="pay-button"
                onClick={generatePaymentPlan}
                disabled={
                  loadingPlan || loadingPayment
                }
              >
                {loadingPlan
                  ? "Creating Payment Plan..."
                  : "Create AI Payment Plan"}
              </button>

              {paymentPlan && (
                <div className="payment-plan">
                  <p className="card-label">
                    AI PAYMENT PLAN
                  </p>

                  <div className="plan-row">
                    <span>Total Course Fee</span>

                    <strong>
                      {paymentPlan.currency}{" "}
                      {paymentPlan.total_amount.toFixed(2)}
                    </strong>
                  </div>

                  <div className="plan-row">
                    <span>Installments</span>

                    <strong>
                      {paymentPlan.installments}
                    </strong>
                  </div>

                  <div className="plan-row highlight">
                    <span>Each Payment</span>

                    <strong>
                      {paymentPlan.currency}{" "}
                      {paymentPlan.installment_amount.toFixed(2)}
                    </strong>
                  </div>

                  <p className="paypal-plan-note">
                    Your next payment will be processed
                    through PayPal Sandbox.
                  </p>

                  <button
                    className="pay-button"
                    onClick={createPayment}
                    disabled={loadingPayment}
                  >
                    {loadingPayment
                      ? "Opening PayPal..."
                      : `Pay ${
                          paymentPlan.currency
                        } ${paymentPlan.installment_amount.toFixed(
                          2
                        )} with PayPal`}
                  </button>
                </div>
              )}

              {status && (
                <p
                  className={
                    statusType === "success"
                      ? "success-message"
                      : statusType === "error"
                        ? "error-message"
                        : "status-message"
                  }
                >
                  {status}
                </p>
              )}

              <p className="sandbox-note">
                This is a PayPal Sandbox transaction.
                No real money is charged.
              </p>
            </div>
          )}
        </section>

        <aside className="info-panel">
          <div className="ai-icon">✦</div>

          <h2>
            AI-powered education payment assistant
          </h2>

          <p>
            EduPay AI turns natural-language education
            payment requests into structured payment plans
            and connects them with PayPal.
          </p>

          <div className="feature-list">
            <div className="feature">
              <span>01</span>

              <div>
                <strong>AI Understanding</strong>

                <p>
                  Understand education payment requests.
                </p>
              </div>
            </div>

            <div className="feature">
              <span>02</span>

              <div>
                <strong>Smart Planning</strong>

                <p>
                  Calculate installment amounts automatically.
                </p>
              </div>
            </div>

            <div className="feature">
              <span>03</span>

              <div>
                <strong>PayPal Checkout</strong>

                <p>
                  Process payments through PayPal Sandbox.
                </p>
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
