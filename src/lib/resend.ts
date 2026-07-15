import { Resend } from "resend";

// Requires RESEND_API_KEY (see FEATURES.md → Resend setup).
// Constructing Resend without a key throws while Next.js collects route data
// during a production build. Keep the optional integration inert until it is
// configured in the hosting environment.
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
