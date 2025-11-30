import sgMail from "@sendgrid/mail";

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" +
      hostname +
      "/api/v2/connection?include_secrets=true&connector_names=sendgrid",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (
    !connectionSettings ||
    (!connectionSettings.settings.api_key ||
      !connectionSettings.settings.from_email)
  ) {
    throw new Error("SendGrid not connected");
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    email: connectionSettings.settings.from_email,
  };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email,
  };
}

export async function sendWaitlistConfirmation(email: string) {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    await client.send({
      to: email,
      from: fromEmail,
      subject: "Welcome to Dum.fun Waitlist 🔥",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #000000; color: #E5E5E5; padding: 20px; max-width: 600px; margin: 0 auto; border: 2px solid #FF4444;">
          <h1 style="color: #FF4444; font-size: 32px; margin: 0 0 20px 0;">🔥 WELCOME</h1>
          
          <p style="font-size: 16px; line-height: 1.6;">
            You're now on the Dum.fun waitlist! 
          </p>
          
          <p style="font-size: 14px; line-height: 1.6; color: #CCCCCC;">
            Get ready for the anti-launchpad where tokens launch EXPENSIVE and crash IMMEDIATELY.
          </p>
          
          <div style="background-color: #1a1a1a; border: 1px solid #FF4444; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #FFFF00;">
              ⚠️ WARNING: YOU WILL LOSE MONEY
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #AAAAAA;">
              Dum.fun is a satirical design concept showcasing the absurdity of crypto meme coin platforms.
            </p>
          </div>
          
          <p style="font-size: 12px; color: #888888; margin-top: 20px;">
            We'll notify you as soon as we launch.
          </p>
        </div>
      `,
    });

    console.log(`Confirmation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    return false;
  }
}
