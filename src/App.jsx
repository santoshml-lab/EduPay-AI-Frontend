
import { useEffect, useState } from "react";

const BACKEND_URL = "https://edupay-ai.onrender.com";

const DEFAULT_MESSAGE =
  "I need to pay $200 for an online course in 4 equal installments.";

function formatMoney(currency, amount) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return `${currency} --`;
  }

  return `${currency} ${value.toFixed(2)}`;
}

function App() {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [paymentPlan, setPaymentPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState(null);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  useEffect(() => {
    const captureApprovedOrder = async () => {
      const params = new URLSearchParams(window.location.search);
      const orderId = params.get("token");

      if (!orderId) return;

      try {
        setLoadingPayment(true);
        setStatusType("status");
        setStatus("Checking PayPal payment...");

        const savedPlan = sessionStorage.getItem(
          "edupay_payment_plan"
        );

        if (savedPlan) {
          try {
            setPaymentPlan(JSON.parse(savedPlan));
          } catch {
            sessionStorage.removeItem("edupay_payment_plan");
          }
        }

        const response = await fetch(
          `${BACKEND_URL}/paypal/capture-order/${encodeURIComponent(orderId)}`,
          { method: "POST" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to capture PayPal payment."
          );
        }

        const order = data.order;
        const paypalStatus = order?.status;

        if (paypalStatus === "COMPLETED") {
          const capture =
            order?.purchase_units?.[0]?.payments?.captures?.[0];

          setPaymentSuccess({
            orderId: order?.id || orderId,
            captureId: capture?.id || "Confirmed",
            amount:
              capture?.amount?.value ||
              order?.purchase_units?.[0]?.amount?.value ||
              "Unknown",
            currency:
              capture?.amount?.currency_code ||
              order?.purchase_units?.[0]?.amount?.currency_code ||
              "USD"
          });

          setStatus("");
          setStatusType("");
          sessionStorage.removeItem("edupay_payment_plan");
        } else {
          setStatusType("error");
          setStatus(
            `PayPal payment status: ${paypalStatus || "Unknown"}`
          );
        }

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } catch (error) {
        setStatusType("error");
        setStatus(error.message || "Payment verification failed.");
      } finally {
        setLoadingPayment(false);
      }
    };

    captureApprovedOrder();
  }, []);

  const generatePaymentPlan = async () => {
    if (!message.trim()) {
      setStatusType("error");
      setStatus("Please describe your education payment.");
      return;
    }

    try {
      setLoadingPlan(true);
      setPaymentPlan(null);
      setPaymentSuccess(null);
      setStatus("");
      setStatusType("");
      sessionStorage.removeItem("edupay_payment_plan");

      const response = await fetch(
        `${BACKEND_URL}/ai/payment-plan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ message: message.trim() })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to generate payment plan."
        );
      }

      const plan = data.payment_plan;

      if (
        !plan ||
        !Number.isFinite(Number(plan.total_amount)) ||
        !Number.isInteger(Number(plan.installments)) ||
        Number(plan.installments) < 1 ||
        !Array.isArray(plan.installment_schedule) ||
        plan.installment_schedule.length !== Number(plan.installments)
      ) {
        throw new Error(
          "The backend returned an incomplete installment schedule. Please check the deployed backend."
        );
      }

      const scheduleTotalCents = plan.installment_schedule.reduce(
        (sum, item, index) => {
          if (
            item.number !== index + 1 ||
            !/^\d+\.\d{2}$/.test(String(item.amount))
          ) {
            throw new Error("The installment schedule is invalid.");
          }

          return sum + Math.round(Number(item.amount) * 100);
        },
        0
      );

      const totalCents = Math.round(Number(plan.total_amount) * 100);

      if (scheduleTotalCents !== totalCents) {
        throw new Error(
          "Installment amounts do not add up to the total course fee."
        );
      }

      setPaymentPlan({
        ...plan,
        total_amount: Number(plan.total_amount),
        installments: Number(plan.installments),
        installment_amount: Number(
          plan.installment_schedule[0].amount
        )
      });
    } catch (error) {
      setStatusType("error");
      setStatus(error.message || "Unable to generate payment plan.");
    } finally {
      setLoadingPlan(false);
    }
  };

  const createPayment = async (installmentIndex) => {
    if (!paymentPlan) {
      setStatusType("error");
      setStatus("Please generate a payment plan first.");
      return;
    }

    const schedule = paymentPlan.installment_schedule;
    const selected = schedule?.[installmentIndex];

    if (!selected) {
      setStatusType("error");
      setStatus("This installment is unavailable.");
      return;
    }

    const amountInCents = Math.round(Number(selected.amount) * 100);

    if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) {
      setStatusType("error");
      setStatus("Invalid installment amount.");
      return;
    }

    try {
      setLoadingPayment(true);
      setPayingInstallment(installmentIndex);
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
            amount: (amountInCents / 100).toFixed(2),
            currency: paymentPlan.currency,
            description:
              `EduPay AI installment ${selected.number} of ${paymentPlan.installments}`
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

      if (!approvalLink?.href) {
        throw new Error("PayPal approval link was not returned.");
      }

      window.location.href = approvalLink.href;
    } catch (error) {
      sessionStorage.removeItem("edupay_payment_plan");
      setStatusType("error");
      setStatus(error.message || "Unable to open PayPal.");
      setLoadingPayment(false);
      setPayingInstallment(null);
    }
  };

  const resetApp = () => {
    setPaymentSuccess(null);
    setPaymentPlan(null);
    setStatus("");
    setStatusType("");
    setMessage(DEFAULT_MESSAGE);
    sessionStorage.removeItem("edupay_payment_plan");
  };

  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">
          <span className="logo-mark">E</span>
          <span>EduPay AI</span>
        </div>

        <span className="sandbox-badge">PayPal Sandbox</span>
      </header>

      <main className="hero">
        <section className="hero-content">
          <p className="eyebrow">AI × EDUCATION × PAYMENTS</p>

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
              <div className="success-icon">✓</div>

              <p className="eyebrow">PAYMENT SUCCESSFUL</p>

              <h2>Payment completed successfully</h2>

              <p className="success-description">
                Your education payment was confirmed by PayPal Sandbox.
              </p>

              <div className="payment-plan">
                <div className="plan-row highlight">
                  <span>Paid Amount</span>
                  <strong>
                    {formatMoney(
                      paymentSuccess.currency,
                      paymentSuccess.amount
                    )}
                  </strong>
                </div>

                <div className="plan-row">
                  <span>PayPal Order ID</span>
                  <strong>{paymentSuccess.orderId}</strong>
                </div>

                <div className="plan-row">
                  <span>Capture ID</span>
                  <strong>{paymentSuccess.captureId}</strong>
                </div>

                <p className="paypal-plan-note">
                  This was a PayPal Sandbox transaction. No real money
                  was charged.
                </p>

                <button className="pay-button" onClick={resetApp}>
                  Create Another Payment Plan
                </button>
              </div>
            </div>
          ) : (
            <div className="payment-card">
              <div className="card-header">
                <div>
                  <p className="card-label">AI Payment Planner</p>
                  <h2>Plan your payment</h2>
                </div>

                <div className="secure">AI</div>
              </div>

              <label htmlFor="message">
                Tell EduPay AI what you need to pay
              </label>

              <textarea
                id="message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={loadingPlan || loadingPayment}
                rows="4"
              />

              <button
                className="pay-button"
                onClick={generatePaymentPlan}
                disabled={loadingPlan || loadingPayment}
              >
                {loadingPlan
                  ? "Creating Payment Plan..."
                  : "Create AI Payment Plan"}
              </button>

              {paymentPlan && (
                <div className="payment-plan">
                  <p className="card-label">AI PAYMENT PLAN</p>

                  <div className="plan-row">
                    <span>Total Course Fee</span>
                    <strong>
                      {formatMoney(
                        paymentPlan.currency,
                        paymentPlan.total_amount
                      )}
                    </strong>
                  </div>

                  <div className="plan-row">
                    <span>Number of Installments</span>
                    <strong>{paymentPlan.installments}</strong>
                  </div>

                  <p className="card-label">INSTALLMENT SCHEDULE</p>

                  {paymentPlan.installment_schedule.map((item, index) => (
                    <div className="plan-row" key={item.number}>
                      <div>
                        <strong>Installment {item.number}</strong>
                        <p className="paypal-plan-note">
                          Payment {item.number} of {paymentPlan.installments}
                        </p>
                      </div>

                      <div>
                        <strong>
                          {formatMoney(paymentPlan.currency, item.amount)}
                        </strong>

                        <button
                          type="button"
                          className="pay-button"
                          onClick={() => createPayment(index)}
                          disabled={loadingPayment || loadingPlan}
                        >
                          {loadingPayment && payingInstallment === index
                            ? "Opening PayPal..."
                            : `Pay ${formatMoney(
                                paymentPlan.currency,
                                item.amount
                              )}`}
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="plan-row highlight">
                    <span>Total Scheduled</span>
                    <strong>
                      {formatMoney(
                        paymentPlan.currency,
                        paymentPlan.total_amount
                      )}
                    </strong>
                  </div>

                  <p className="paypal-plan-note">
                    Choose an installment to open its PayPal Sandbox
                    checkout. Each button creates a separate order;
                    recurring billing is not enabled.
                  </p>
                </div>
              )}

              {status && (
                <p
                  role="status"
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
                This is a PayPal Sandbox transaction. No real money is
                charged.
              </p>
            </div>
          )}
        </section>

        <aside className="info-panel">
          <div className="ai-icon">✦</div>

          <h2>AI-powered education payment assistant</h2>

          <p>
            EduPay AI turns natural-language education payment requests
            into structured payment plans and connects them with PayPal.
          </p>

          <div className="feature-list">
            <div className="feature">
              <span>01</span>
              <div>
                <strong>AI Understanding</strong>
                <p>Understand education payment requests.</p>
              </div>
            </div>

            <div className="feature">
              <span>02</span>
              <div>
                <strong>Smart Planning</strong>
                <p>Calculate installment amounts automatically.</p>
              </div>
            </div>

            <div className="feature">
              <span>03</span>
              <div>
                <strong>PayPal Checkout</strong>
                <p>Process payments through PayPal Sandbox.</p>
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

