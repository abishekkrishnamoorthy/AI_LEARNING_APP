const getMissingBrevoConfig = () => {
  const requiredKeys = ["BREVO_API_KEY", "EMAIL_USER"];
  return requiredKeys.filter((key) => !process.env[key]);
};

export const sendVerificationEmail = async (email, token) => {
  const backendBaseUrl = process.env.BACKEND_BASE_URL || "http://0.0.0.0:5000";
  const verificationLink = `${backendBaseUrl}/auth/verify?token=${token}`;
  const missingConfig = getMissingBrevoConfig();

  if (missingConfig.length > 0) {
    console.error(
      `[emailService] Missing Brevo env configuration: ${missingConfig.join(", ")}`
    );
    const configError = new Error("Brevo API configuration is incomplete.");
    configError.code = "BREVO_CONFIG_MISSING";
    throw configError;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { email: process.env.EMAIL_USER },
      to: [{ email }],
      subject: "Verify your email",
      textContent: `Please verify your email by clicking the following link: ${verificationLink}`,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    const apiError = new Error(`Brevo API request failed with status ${response.status}`);
    apiError.code = "BREVO_API_ERROR";
    apiError.status = response.status;
    apiError.responseBody = responseText;
    throw apiError;
  }
};
