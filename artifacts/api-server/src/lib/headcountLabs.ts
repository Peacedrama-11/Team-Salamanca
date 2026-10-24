import {
  GetHeadcountLabsProviderStatusResponse,
  type JobProviderStatus,
} from "@workspace/api-zod";

const API_KEY_ENV_NAME = "HEADCOUNT_LABS_API_KEY";

export function getHeadcountLabsProviderStatus(): JobProviderStatus {
  const credentialsConfigured = Boolean(process.env[API_KEY_ENV_NAME]?.trim());
  return GetHeadcountLabsProviderStatusResponse.parse({
    credentialsConfigured,
    integrationStatus: credentialsConfigured
      ? "provider_contract_pending"
      : "credentials_required",
  });
}
