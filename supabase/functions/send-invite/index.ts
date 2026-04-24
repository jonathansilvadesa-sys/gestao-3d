/**
 * Edge Function: send-invite
 *
 * Recebe { email, invite_code, tenant_nome, role } e envia um email de convite
 * com o link para o Gestão 3D via Resend API.
 *
 * Variáveis de ambiente necessárias (Supabase Dashboard > Edge Functions > Secrets):
 *   RESEND_API_KEY  — Chave da API do Resend (resend.com)
 *   APP_URL         — URL pública do app (ex: https://gestao-3d.vercel.app)
 *   FROM_EMAIL      — Remetente (ex: noreply@seudominio.com)
 *                     Sem domínio próprio: use onboarding@resend.dev
 */

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface InvitePayload {
  email:       string;
  invite_code: string;
  tenant_nome: string;
  role:        string;
  sender_nome?: string;
}

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const APP_URL        = Deno.env.get('APP_URL') ?? 'https://gestao-3d.vercel.app';
    const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'onboarding@resend.dev';

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body: InvitePayload = await req.json();
    const { email, invite_code, tenant_nome, role, sender_nome } = body;

    if (!email || !invite_code || !tenant_nome) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: email, invite_code, tenant_nome' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const inviteUrl  = `${APP_URL}?invite=${invite_code}`;
    const roleLabel  = role === 'owner' ? 'Proprietário' : role === 'admin' ? 'Administrador' : 'Operador';
    const senderText = sender_nome ? `<b>${sender_nome}</b> convidou você` : 'Você foi convidado';

    const htmlBody = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Convite Gestão 3D</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(91,33,182,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#5b21b6,#7c3aed);padding:36px 40px;text-align:center;">
              <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="font-size:28px;">🖨</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Gestão 3D</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">Controle de Custos e Estoque</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:14px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">CONVITE</p>
              <h2 style="margin:0 0 20px;color:#1e1b4b;font-size:22px;font-weight:700;">
                ${senderText} para entrar em <span style="color:#5b21b6;">${tenant_nome}</span>
              </h2>
              <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">
                Sua função na empresa será <b>${roleLabel}</b>. Use o código abaixo para criar sua conta
                ou clicar no botão de acesso rápido.
              </p>

              <!-- Código -->
              <div style="background:#f5f3ff;border:2px dashed #8b5cf6;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 6px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Código de convite</p>
                <span style="font-size:32px;font-weight:700;color:#5b21b6;letter-spacing:6px;font-family:'Courier New',monospace;">${invite_code}</span>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:32px;">
                <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#ffffff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:-0.3px;">
                  Acessar Gestão 3D →
                </a>
              </div>

              <!-- Info -->
              <div style="background:#f9fafb;border-radius:10px;padding:16px 20px;">
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                  <b>Como funciona:</b> clique no botão acima ou acesse
                  <a href="${APP_URL}" style="color:#5b21b6;">${APP_URL}</a>
                  e informe o código de convite ao criar sua conta ou entrar com Google.
                  O código é de uso único e pode ter prazo de expiração.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                Gestão 3D · gestao-3d.vercel.app<br/>
                Se você não esperava este convite, pode ignorar este email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Chama a API do Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [email],
        subject: `Você foi convidado para ${tenant_nome} no Gestão 3D`,
        html:    htmlBody,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('[send-invite] Resend error:', resendData);
      return new Response(
        JSON.stringify({ error: resendData.message ?? 'Erro ao enviar email' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[send-invite] exception:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno no servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
