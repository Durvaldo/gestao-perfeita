// User-facing (pt-BR) messages for Better Auth error codes. Texts follow the
// legacy backend/lang/pt_BR/auth.php where an equivalent exists.
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Essas credenciais não conferem com nossos registros.",
  INVALID_EMAIL: "Informe um e-mail válido.",
  INVALID_PASSWORD: "A senha informada está incorreta.",
  EMAIL_PASSWORD_SIGN_UP_DISABLED: "O cadastro público está desativado.",
  ACCOUNT_DISABLED: "Seu acesso está desativado. Fale com o administrador da barbearia.",
};

const TOO_MANY_REQUESTS = "Muitas tentativas de login. Tente novamente em instantes.";
const FALLBACK = "Não foi possível entrar. Tente novamente.";

export function authErrorMessage(error: { code?: string; status?: number } | null | undefined): string {
  if (error?.status === 429) {
    return TOO_MANY_REQUESTS;
  }
  return (error?.code && MESSAGES[error.code]) || FALLBACK;
}
