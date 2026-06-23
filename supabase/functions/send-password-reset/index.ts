import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { email } = await req.json();

    // Initialize Supabase Admin
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate recovery link
    const { data, error: genError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: "https://meufinora.com.br/auth/reset-password",
      },
    });

    if (genError || !data?.properties?.action_link) {
      console.error("Failed to generate recovery link:", genError);
      return new Response(
        JSON.stringify({ error: "Failed to generate recovery link" }),
        { status: 500 }
      );
    }

    // Send email via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "noreply@meufinora.com.br",
        to: email,
        subject: "Redefinir sua senha",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="https://meufinora.com.br/logo-finora.svg" alt="Finora" style="height: 40px;">
            </div>
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #f1f5f9; padding: 40px; border-radius: 12px;">
              <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700;">Redefinir sua senha</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #cbd5e1;">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para escolher uma nova.</p>
              <div style="margin: 32px 0;">
                <a href="${data.properties.action_link}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);">Redefinir Senha</a>
              </div>
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #94a3b8;">Se você não solicitou isso, pode ignorar com segurança este e-mail.</p>
              <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 32px 0;">
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748b; text-align: center;">© 2026 Finora IA. Suas finanças, no WhatsApp.</p>
            </div>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      console.error("Failed to send email via Resend:", await resendRes.text());
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent via Resend" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
