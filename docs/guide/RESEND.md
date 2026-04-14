import { Resend } from 'resend';

const resend = new Resend('re_Vqj9wEp-.env.local에 RESEND_API_KEY 참고');

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'brewnet.dev@gmail.com',
  subject: 'Hello World',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
});