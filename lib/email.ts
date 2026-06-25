import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "Tuhaf Club <onboarding@resend.dev>";

/** Send a magic-link email. With no RESEND_API_KEY (dev), logs the link to the
 *  server console so local sign-in still works end-to-end. */
export async function sendLoginLink(to: string, url: string): Promise<{ ok: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[Tuhaf Club giriş bağlantısı] → ${to}\n${url}\n`);
    return { ok: true };
  }
  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Tuhaf Club giriş bağlantın",
      html: loginEmailHtml(url),
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function loginEmailHtml(url: string): string {
  return `
  <div style="font-family:Georgia,serif;background:#0f0d0c;color:#f4efe6;padding:32px;max-width:480px;margin:0 auto">
    <h1 style="font-style:italic;color:#f4efe6;margin:0 0 12px">Tuhaf Club'a gir.</h1>
    <p style="color:#cfc7bd;line-height:1.5">Aşağıdaki bağlantıya tıklayarak giriş yap. Bağlantı 30 dakika geçerli ve yalnızca bir kez kullanılabilir.</p>
    <p style="margin:24px 0">
      <a href="${url}" style="background:#D9291C;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;display:inline-block;letter-spacing:.05em">Giriş yap</a>
    </p>
    <p style="color:#8a847c;font-size:13px">Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.</p>
  </div>`;
}
